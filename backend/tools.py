"""Catalogue data access, and the tools the shop agent is allowed to call.

Everything the agent knows about prices and stock comes through these functions, so
it can never invent a product, a price, or an availability claim. The same query
helpers back the REST endpoints in `main.py`, which keeps the page and the chat
answering from one source of truth.
"""

from __future__ import annotations

import os
import re
import sqlite3
from contextlib import closing
from dataclasses import dataclass, field
from pathlib import Path

from pydantic_ai import RunContext

from models import (
    BulkSizeRow,
    BulkStockResult,
    PageContext,
    Product,
    ProductLookup,
    ProductSummary,
    PublicUser,
    SearchResult,
    SizeStockResult,
    SizeStock,
    product_from_row,
)

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.getenv("CAMPUS_CUSTOMS_DB", BASE_DIR / "data" / "campus_customs.db"))
PRODUCT_IMAGE_DIR = Path(os.getenv("CAMPUS_CUSTOMS_IMAGES", BASE_DIR / "data" / "products"))

MAX_RESULTS = 8
# Cap on a single bulk stock check, so one tool call cannot fan out unbounded.
MAX_BULK_CHECK = 25


class DataPackMissing(RuntimeError):
    """Raised when the local data pack has not been placed at data/campus_customs.db."""


# --- connections --------------------------------------------------------------


def connect() -> sqlite3.Connection:
    """Open the database read-only, so reads can never corrupt the data pack."""
    if not DB_PATH.exists():
        raise DataPackMissing(
            f"Database not found at {DB_PATH}. Place the local data pack at "
            "data/campus_customs.db - see the README."
        )
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def connect_rw() -> sqlite3.Connection:
    """Open the database for writing (accounts and chat history)."""
    if not DB_PATH.exists():
        raise DataPackMissing(f"Database not found at {DB_PATH}.")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# --- query helpers (shared by the REST API and the agent tools) ---------------


# --- cached catalogue snapshot (Problem 9, backend improvement 1) -------------
#
# The catalogue is small and read constantly: every search, every card, every tool
# call. Re-reading SQLite each time also meant a second query per result set to join
# stock. Instead the whole catalogue and all 612 inventory rows are loaded in **two
# queries total** and held in memory, keyed by the database file's modification time
# so a changed data pack invalidates the cache automatically.

_CACHE: dict[str, object] = {}
_STATS = {"loads": 0, "hits": 0}


def cache_stats() -> dict[str, int]:
    """Cache counters, surfaced on /api/health for the write-up."""
    return {**_STATS, "products_cached": len(_CACHE.get("rows", []))}


def _snapshot() -> tuple[list[sqlite3.Row], dict[str, list[SizeStock]]]:
    """Every catalogue row plus all stock, loaded at most once per data-pack change."""
    if not DB_PATH.exists():
        raise DataPackMissing(
            f"Database not found at {DB_PATH}. Place the local data pack at "
            "data/campus_customs.db - see the README."
        )
    mtime = DB_PATH.stat().st_mtime_ns
    if _CACHE.get("mtime") != mtime:
        with closing(connect()) as conn:
            rows = conn.execute("SELECT * FROM catalogue ORDER BY name").fetchall()
            # One query for all stock, not one per product.
            stock: dict[str, list[SizeStock]] = {}
            for row in conn.execute("SELECT product_id, size, quantity FROM inventory"):
                stock.setdefault(row["product_id"], []).append(
                    SizeStock(size=row["size"], quantity=row["quantity"])
                )
        _CACHE.update(mtime=mtime, rows=rows, stock=stock)
        _STATS["loads"] += 1
    else:
        _STATS["hits"] += 1
    return _CACHE["rows"], _CACHE["stock"]  # type: ignore[return-value]


def inventory_by_product(
    conn: sqlite3.Connection, product_ids: list[str]
) -> dict[str, list[SizeStock]]:
    """Stock for many products in one query. Kept for callers holding a connection."""
    if not product_ids:
        return {}
    placeholders = ",".join("?" * len(product_ids))
    rows = conn.execute(
        f"SELECT product_id, size, quantity FROM inventory WHERE product_id IN ({placeholders})",
        product_ids,
    ).fetchall()
    grouped: dict[str, list[SizeStock]] = {}
    for row in rows:
        grouped.setdefault(row["product_id"], []).append(
            SizeStock(size=row["size"], quantity=row["quantity"])
        )
    return grouped


# --- keyword search -----------------------------------------------------------
#
# The catalogue is 102 rows, so keyword search filters in Python rather than SQL.
# That buys word-boundary matching, which SQL LIKE cannot do: without it "shirt"
# matches inside "sweatshirt" and a search for t-shirts returns most of the shop.

# Words that carry no signal in a catalogue of Yale apparel; dropping them stops
# "do you have a hoodie" from filtering on "do", "you" and "have".
STOPWORDS = frozenset(
    {
        "a", "an", "and", "any", "are", "do", "does", "for", "got", "have", "i", "in",
        "is", "it", "me", "my", "of", "on", "or", "please", "show", "some", "that",
        "the", "them", "there", "these", "this", "to", "want", "what", "with", "you",
        "your", "yale",  # every product is Yale; it never narrows anything.
    }
)

SORTS = {
    "name": lambda p: p.name.lower(),
    "price-asc": lambda p: p.price,
    "price-desc": lambda p: -p.price,
    "stock": lambda p: -p.total_stock,
}


def _variants(token: str) -> set[str]:
    """A token plus a naive singular, so "hoodies" still finds "hoodie".

    The model naturally asks in the plural while the catalogue is written in the
    singular, so without this the most common query in the shop returns nothing.
    """
    forms = {token}
    if token.endswith("ies") and len(token) > 4:
        forms.add(token[:-3] + "y")
    if token.endswith("es") and len(token) > 3:
        forms.add(token[:-2])
    if token.endswith("s") and len(token) > 3:
        forms.add(token[:-1])
    return forms


def _search_terms(search: str) -> list[str]:
    """Split a shopper's phrase into useful search tokens."""
    tokens = [t for t in re.split(r"[^a-z0-9]+", search.lower()) if len(t) > 1]
    meaningful = [t for t in tokens if t not in STOPWORDS]
    # If they only typed stopwords ("what do you have"), fall back to the raw tokens
    # rather than silently matching the entire catalogue.
    return meaningful or tokens


def _haystack(row: sqlite3.Row) -> str:
    """All searchable text for one product, lowercased."""
    return " ".join(
        str(row[column]) for column in ("name", "garment_type", "description", "search_tags")
    ).lower()


def _matches(term: str, haystack: str) -> bool:
    """True if any form of `term` appears in `haystack` at a word boundary."""
    return any(re.search(rf"\b{re.escape(form)}", haystack) for form in _variants(term))


def query_products(
    search: str | None = None,
    category: str | None = None,
    max_price: float | None = None,
    size: str | None = None,
    in_stock_only: bool = False,
    sort: str = "name",
    limit: int = 200,
) -> tuple[list[Product], int]:
    """Filter the catalogue. Returns (products, total_matching_before_limit).

    Runs entirely against the cached snapshot - no SQL per call. A product must match
    every search term; if nothing matches all of them, the best partial matches are
    returned so a long phrase degrades gracefully rather than coming back empty.
    """
    rows, stock_map = _snapshot()

    if category:
        # Stored inconsistently in case ("short-sleeve t-shirt" vs "...T-shirt"),
        # so category matching is always case-insensitive.
        wanted = category.strip().lower()
        rows = [r for r in rows if r["garment_type"].lower() == wanted]

    if max_price is not None:
        rows = [r for r in rows if float(r["price"]) <= max_price]

    if search and search.strip():
        terms = _search_terms(search)
        if terms:
            scored = [(sum(_matches(t, _haystack(r)) for t in terms), r) for r in rows]
            full = [r for score, r in scored if score == len(terms)]
            if full:
                rows = full
            else:
                best = max((score for score, _ in scored), default=0)
                rows = [r for score, r in scored if score == best > 0]

    products = [product_from_row(r, stock_map.get(r["product_id"], [])) for r in rows]

    # Availability filters (Problem 9, frontend improvement 1).
    if size:
        wanted_size = size.strip().upper()
        products = [
            p for p in products
            if any(s.size.upper() == wanted_size and s.quantity > 0 for s in p.inventory)
        ]
    elif in_stock_only:
        products = [p for p in products if p.total_stock > 0]

    products.sort(key=SORTS.get(sort, SORTS["name"]))
    return products[:limit], len(products)


def query_product(product_id: str) -> Product | None:
    """One product with its per-size stock, or None if the id is unknown."""
    rows, stock_map = _snapshot()
    for row in rows:
        if row["product_id"] == product_id:
            return product_from_row(row, stock_map.get(product_id, []))
    return None


def query_categories() -> list[str]:
    """Distinct garment types, grouped case-insensitively, most common first."""
    rows, _ = _snapshot()
    counts: dict[str, int] = {}
    for row in rows:
        counts[row["garment_type"].lower()] = counts.get(row["garment_type"].lower(), 0) + 1
    return [name for name, _ in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))]


# --- agent dependencies -------------------------------------------------------


@dataclass
class ShopDeps:
    """Per-conversation state handed to every tool call.

    `user` is who is chatting (None for a guest) and `page` is where they are on the
    site; both are read by the dynamic system prompts in `agent.py`.

    `shown` collects the products the agent actually looked at, in order. The chat
    endpoint turns that into the product cards the website displays, so the cards on
    screen always match what the reply talked about.
    """

    user: PublicUser | None = None
    page: PageContext | None = None
    shown: dict[str, Product] = field(default_factory=dict)

    def remember(self, products: list[Product]) -> None:
        for product in products:
            self.shown.setdefault(product.product_id, product)

    @property
    def cards(self) -> list[Product]:
        return list(self.shown.values())


# --- tools the agent can call -------------------------------------------------
#
# Each tool reads the live database and returns a typed model. Nothing here lets the
# agent state a price or a quantity that did not come out of a query.


def search_catalogue(
    ctx: RunContext[ShopDeps],
    query: str,
    category: str | None = None,
    max_price: float | None = None,
) -> SearchResult:
    """Search Campus Customs products by keyword, and optionally category and price.

    Use this for any question about what the shop sells. `query` should be the
    shopper's own words (for example "davenport crewneck" or "gift for my mom").
    Returns matching products with real prices and real per-size stock.
    """
    products, total = query_products(search=query, category=category, max_price=max_price)
    shown = products[:MAX_RESULTS]
    ctx.deps.remember(shown)
    return SearchResult(
        match_count=total,
        showing=len(shown),
        products=[ProductSummary.from_product(p) for p in shown],
    )


def get_product_details(ctx: RunContext[ShopDeps], product_id: str) -> ProductLookup:
    """Look up one product by its id, with full description, price and per-size stock.

    Call this when the shopper asks about a specific item you have already found, or
    whenever you need the exact price before quoting it.
    """
    product = query_product(product_id)
    if product is None:
        return ProductLookup(found=False, error=f"No product with id {product_id!r}.")
    ctx.deps.remember([product])
    return ProductLookup(found=True, product=ProductSummary.from_product(product))


def check_size_stock(ctx: RunContext[ShopDeps], product_id: str, size: str) -> SizeStockResult:
    """Check whether one product is in stock in one size (XS, S, M, L, XL or XXL).

    Always call this before telling a shopper something is available in their size.
    If `in_stock` is false, tell them plainly that the size is sold out.
    """
    product = query_product(product_id)
    if product is None:
        return SizeStockResult(found=False, error=f"No product with id {product_id!r}.")
    ctx.deps.remember([product])

    wanted = size.strip().upper()
    for row in product.inventory:
        if row.size.upper() == wanted:
            return SizeStockResult(
                found=True,
                product_id=product.product_id,
                product_name=product.name,
                size=row.size,
                quantity=row.quantity,
                in_stock=row.quantity > 0,
                sizes_carried=[r.size for r in product.inventory],
            )

    return SizeStockResult(
        found=False,
        product_id=product.product_id,
        product_name=product.name,
        error=f"{product.name} is not carried in size {wanted}.",
        sizes_carried=[r.size for r in product.inventory],
    )


def list_categories(ctx: RunContext[ShopDeps]) -> list[str]:
    """List the garment categories the shop carries, most common first."""
    del ctx  # No per-conversation state needed, but tools share one signature style.
    return query_categories()


def check_sizes_bulk(
    ctx: RunContext[ShopDeps], product_ids: list[str], size: str
) -> BulkStockResult:
    """Check one size across SEVERAL products at once.

    Prefer this over calling `check_size_stock` repeatedly. If a shopper asks "which
    of these come in XL?" or you are narrowing a list of results down to their size,
    pass every product_id in one call rather than looping.
    """
    wanted = size.strip().upper()
    result = BulkStockResult(size=wanted, checked=0)

    # One cached snapshot read covers every product, whatever the list length.
    for product_id in product_ids[:MAX_BULK_CHECK]:
        product = query_product(product_id)
        if product is None:
            result.not_found.append(product_id)
            continue
        result.checked += 1
        ctx.deps.remember([product])
        match = next((s for s in product.inventory if s.size.upper() == wanted), None)
        if match is None:
            result.not_found.append(product_id)
            continue
        row = BulkSizeRow(
            product_id=product.product_id,
            name=product.name,
            price_usd=product.price,
            size=match.size,
            quantity=match.quantity,
            in_stock=match.quantity > 0,
        )
        (result.in_stock if match.quantity > 0 else result.sold_out).append(row)

    return result
