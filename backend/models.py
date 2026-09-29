"""Shared Pydantic models for the Campus Customs API and agent.

These mirror the SQLite schema documented in `output/harness.md`. The agent (Problem 5)
reuses the same models so the shapes the shopper sees and the shapes the agent reasons
over never drift apart.
"""

from __future__ import annotations

import json
import re
from typing import Any

from pydantic import BaseModel, EmailStr, Field

# Sizes are stored as free text but only ever take these six values, smallest first.
SIZE_ORDER: tuple[str, ...] = ("XS", "S", "M", "L", "XL", "XXL")


class SizeStock(BaseModel):
    """Stock for one size of one product (`inventory` table)."""

    size: str
    quantity: int

    @property
    def in_stock(self) -> bool:
        return self.quantity > 0


class Product(BaseModel):
    """A catalogue row, enriched with the fields the frontend needs.

    `image_url` and `total_stock` are derived, not stored; `inventory` is joined in.
    """

    product_id: str
    name: str
    garment_type: str
    description: str
    short_description: str
    colors: list[str]
    search_tags: list[str]
    image_url: str
    price: float
    inventory: list[SizeStock] = Field(default_factory=list)
    total_stock: int = 0

    @property
    def available_sizes(self) -> list[str]:
        return [s.size for s in self.inventory if s.quantity > 0]


class ProductList(BaseModel):
    """Envelope for a product listing, so the frontend can show result counts."""

    products: list[Product]
    total: int


# --- helpers -----------------------------------------------------------------


def _json_list(raw: str | None) -> list[str]:
    """Parse a JSON-array text column, tolerating null or malformed values.

    Three catalogue rows carry an empty `colors` array, so an empty list is normal
    and must not be confused with an error.
    """
    if not raw:
        return []
    try:
        value = json.loads(raw)
    except (TypeError, ValueError):
        return []
    return [str(v) for v in value] if isinstance(value, list) else []


def first_sentence(text: str, limit: int = 120) -> str:
    """Short blurb for a product card: the first sentence, trimmed to `limit`."""
    text = text.strip()
    match = re.search(r"(?<=[.!?])\s", text)
    if match:
        text = text[: match.start()].strip()
    if len(text) > limit:
        text = text[:limit].rsplit(" ", 1)[0].rstrip(",;:") + "…"
    return text


def sort_sizes(rows: list[SizeStock]) -> list[SizeStock]:
    """Order sizes XS->XXL instead of the alphabetical order SQLite returns."""
    index = {size: i for i, size in enumerate(SIZE_ORDER)}
    return sorted(rows, key=lambda r: (index.get(r.size.upper(), len(SIZE_ORDER)), r.size))


def product_from_row(row: Any, inventory: list[SizeStock] | None = None) -> Product:
    """Build a `Product` from a `sqlite3.Row` of the catalogue table."""
    inventory = sort_sizes(list(inventory or []))
    # image_file_path is stored as "products/<slug>.jpg"; the API serves it under /media/.
    image_url = f"/media/{row['image_file_path']}"
    description = row["description"]
    return Product(
        product_id=row["product_id"],
        name=row["name"],
        garment_type=row["garment_type"],
        description=description,
        short_description=first_sentence(description),
        colors=_json_list(row["colors"]),
        search_tags=_json_list(row["search_tags"]),
        image_url=image_url,
        price=float(row["price"]),
        inventory=inventory,
        total_stock=sum(s.quantity for s in inventory),
    )


# --- account models (used from Problem 4 onward) ------------------------------


class SignupRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=60)
    last_name: str = Field(min_length=1, max_length=60)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PublicUser(BaseModel):
    """A user as the frontend may see them - never includes `password_hash`."""

    id: int
    name: str
    email: EmailStr
    first_name: str | None = None
    last_name: str | None = None


# --- chat models (Problem 5) --------------------------------------------------


class ChatMessage(BaseModel):
    """One turn of a conversation, as stored in the `chat_messages` table."""

    role: str  # "user" or "assistant"
    content: str
    products: list[Product] = Field(default_factory=list)
    created_at: str | None = None


class PageContext(BaseModel):
    """Where the shopper is on the site when they send a message (Problem 8).

    This is what lets "do you have this in pink?" resolve to a specific product:
    the product page sends its `product_id`, so "this" has a referent.
    """

    path: str | None = None
    product_id: str | None = None
    # What the Products page is currently filtered to, so "any of these in XL?"
    # has a referent too.
    search: str | None = None
    category: str | None = None


class ChatRequest(BaseModel):
    """A message typed into the floating chat panel."""

    message: str = Field(min_length=1, max_length=2000)
    page: PageContext | None = None


class ChatReply(BaseModel):
    """The agent's answer, plus the product cards the website should display.

    `products` holds exactly the items the agent looked up while answering, so the
    cards on screen always match what the reply talked about.
    """

    reply: str
    products: list[Product] = Field(default_factory=list)


# --- tool return types (Problem 6) --------------------------------------------
#
# The agent's tools return these models rather than loose dicts, so Pydantic AI can
# publish a precise schema to the model. Each one is deliberately a *narrow* view of
# a catalogue row: enough to answer a shopper's question, and nothing the agent would
# only be tempted to paraphrase badly. Fields the website renders itself - image URLs,
# search tags, the long marketing description - stay out of the model's context.


class ProductSummary(BaseModel):
    """What the agent sees when it looks a product up.

    Sizes are pre-split into in-stock and sold-out lists so the agent never has to do
    arithmetic on quantities to decide what is available - the honest answer is read
    straight off the model.
    """

    product_id: str
    name: str
    garment_type: str
    price_usd: float
    colors: list[str]
    colors_listed: bool  # False for the three rows with an empty colors array.
    description: str
    sizes_in_stock: list[str]
    sizes_sold_out: list[str]
    total_units: int

    @classmethod
    def from_product(cls, product: Product) -> "ProductSummary":
        return cls(
            product_id=product.product_id,
            name=product.name,
            garment_type=product.garment_type,
            price_usd=product.price,
            colors=product.colors,
            colors_listed=bool(product.colors),
            description=product.description,
            sizes_in_stock=[s.size for s in product.inventory if s.quantity > 0],
            sizes_sold_out=[s.size for s in product.inventory if s.quantity <= 0],
            total_units=product.total_stock,
        )


class SearchResult(BaseModel):
    """Result of a catalogue search.

    `match_count` is the true number of matches and `showing` is how many came back,
    so the agent can say "we have 27 hoodies, here are 8" instead of implying the
    whole catalogue is eight items.
    """

    match_count: int
    showing: int
    products: list[ProductSummary]


class ProductLookup(BaseModel):
    """One product by id. `found` is explicit so a miss can never read as a match."""

    found: bool
    product: ProductSummary | None = None
    error: str | None = None


class SizeStockResult(BaseModel):
    """Stock for one product in one size - the answer to "do you have this in M?".

    `in_stock` is a plain boolean the agent can quote directly, and `quantity` backs
    it up, so "only 2 left in M" is grounded in the row rather than estimated.
    """

    found: bool
    product_id: str | None = None
    product_name: str | None = None
    size: str | None = None
    quantity: int | None = None
    in_stock: bool = False
    sizes_carried: list[str] = Field(default_factory=list)
    error: str | None = None


class BulkSizeRow(BaseModel):
    """One product's availability in one requested size."""

    product_id: str
    name: str
    price_usd: float
    size: str
    quantity: int
    in_stock: bool


class BulkStockResult(BaseModel):
    """Stock for several products in one size, answered in a single tool call.

    Lets the agent answer "which of these come in XL?" without one round trip per
    product, which is both faster and cheaper than looping `check_size_stock`.
    """

    size: str
    checked: int
    in_stock: list[BulkSizeRow] = Field(default_factory=list)
    sold_out: list[BulkSizeRow] = Field(default_factory=list)
    not_found: list[str] = Field(default_factory=list)
