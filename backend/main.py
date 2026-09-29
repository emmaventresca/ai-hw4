"""Campus Customs API.

Serves the catalogue and product images, handles accounts, and exposes the chat route
that the website's floating panel talks to. The chat brain itself lives in `agent.py`.

Run from the `backend/` directory:

    ../venv/bin/uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import sqlite3
import threading
import time
from datetime import datetime, timezone
from contextlib import closing
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from pydantic_ai.usage import UsageLimits
from pydantic_ai.messages import (
    ModelMessage,
    ModelRequest,
    ModelResponse,
    TextPart,
    UserPromptPart,
)

from agent import MissingAPIKey, get_agent, model_name
from models import (
    ChatMessage,
    ChatReply,
    ChatRequest,
    LoginRequest,
    Product,
    ProductList,
    PublicUser,
    SignupRequest,
)
from tools import (
    PRODUCT_IMAGE_DIR,
    cache_stats,
    DataPackMissing,
    ShopDeps,
    connect,
    connect_rw,
    query_categories,
    query_product,
    query_products,
)

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

logger = logging.getLogger("campus_customs")

app = FastAPI(title="Campus Customs API", version="0.6.0")

# The Vite dev server runs on its own port, so the browser needs CORS to call us.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- catalogue ----------------------------------------------------------------


@app.get("/api/health")
def health() -> dict[str, object]:
    """Cheap check that the API is up, the data pack is readable, and the key is set."""
    try:
        with closing(connect()) as conn:
            count = conn.execute("SELECT COUNT(*) FROM catalogue").fetchone()[0]
    except DataPackMissing as exc:
        return {"status": "no-database", "detail": str(exc)}
    return {
        "status": "ok",
        "products": count,
        "model": model_name(),
        # Whether a key is present, never the key itself.
        "agent_configured": bool(os.getenv("PORTKEY_API_KEY")),
        "catalogue_cache": cache_stats(),
    }


@app.get("/api/categories", response_model=list[str])
def list_categories() -> list[str]:
    """Garment types for the products-page filter, grouped case-insensitively."""
    try:
        return query_categories()
    except DataPackMissing as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/api/products", response_model=ProductList)
def list_products(
    search: str | None = Query(default=None, description="Match name, description or tags"),
    category: str | None = Query(default=None, description="Garment type, case-insensitive"),
    size: str | None = Query(default=None, description="Only items in stock in this size"),
    in_stock_only: bool = Query(default=False, description="Hide fully sold-out items"),
    sort: str = Query(default="name", description="name | price-asc | price-desc | stock"),
    limit: int = Query(default=200, ge=1, le=500),
) -> ProductList:
    """List catalogue products with their stock joined in."""
    try:
        products, total = query_products(
            search=search,
            category=category,
            size=size,
            in_stock_only=in_stock_only,
            sort=sort,
            limit=limit,
        )
    except DataPackMissing as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return ProductList(products=products, total=total)


@app.get("/api/products/{product_id}", response_model=Product)
def get_product(product_id: str) -> Product:
    """One product with its full description and per-size stock."""
    try:
        product = query_product(product_id)
    except DataPackMissing as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if product is None:
        raise HTTPException(status_code=404, detail=f"No product with id {product_id!r}")
    return product


@app.get("/media/products/{filename}")
def product_image(filename: str) -> FileResponse:
    """Serve a product image from the local data pack.

    The resolved path is confirmed to sit inside the image directory, so a crafted
    filename cannot escape it.
    """
    root = PRODUCT_IMAGE_DIR.resolve()
    candidate = (root / filename).resolve()
    if not candidate.is_relative_to(root) or not candidate.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(candidate)


# --- passwords & sessions -----------------------------------------------------

# The seed database stores `pbkdf2_sha256$<salt>$<64-hex>` at 120,000 iterations.
# New accounts are written in exactly that format, so seeded and new users verify
# through one code path.
HASH_SCHEME = "pbkdf2_sha256"
PBKDF2_ITERATIONS = 120_000
SALT_BYTES = 12

# Signing key for session tokens. Set SESSION_SECRET in .env to keep sessions valid
# across restarts; otherwise a random per-process key is used and tokens expire on
# restart, which is safe but means logging in again after a reload.
SESSION_SECRET = os.getenv("SESSION_SECRET") or secrets.token_hex(32)
SESSION_TTL_SECONDS = 60 * 60 * 24 * 7


def hash_password(password: str) -> str:
    """Hash a password with a fresh random salt. Plaintext is never stored."""
    salt = secrets.token_urlsafe(SALT_BYTES)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), PBKDF2_ITERATIONS
    ).hex()
    return f"{HASH_SCHEME}${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    """Check a password against a stored hash in constant time."""
    try:
        scheme, salt, digest = stored.split("$")
    except ValueError:
        return False
    if scheme != HASH_SCHEME:
        return False
    candidate = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), PBKDF2_ITERATIONS
    ).hex()
    # compare_digest avoids leaking how much of the hash matched via timing.
    return hmac.compare_digest(candidate, digest)


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _unb64url(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def issue_token(user_id: int) -> str:
    """Create an HMAC-signed `<payload>.<signature>` session token."""
    payload = _b64url(
        json.dumps({"sub": user_id, "exp": int(time.time()) + SESSION_TTL_SECONDS}).encode()
    )
    signature = _b64url(
        hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).digest()
    )
    return f"{payload}.{signature}"


def read_token(token: str) -> int | None:
    """Return the user id in a valid, unexpired token, else None."""
    try:
        payload, signature = token.split(".")
    except ValueError:
        return None
    expected = _b64url(
        hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).digest()
    )
    if not hmac.compare_digest(signature, expected):
        return None
    try:
        data = json.loads(_unb64url(payload))
    except (ValueError, json.JSONDecodeError):
        return None
    if data.get("exp", 0) < time.time():
        return None
    sub = data.get("sub")
    return int(sub) if isinstance(sub, int) else None


def _public_user(row: sqlite3.Row) -> PublicUser:
    """Project a users row to the safe subset - `password_hash` is never included."""
    return PublicUser(
        id=row["id"],
        name=row["name"],
        email=row["email"],
        first_name=row["first_name"],
        last_name=row["last_name"],
    )


def current_user(request: Request) -> PublicUser:
    """Resolve the bearer token on a request into a user, or 401."""
    header = request.headers.get("Authorization", "")
    token = header[7:] if header.lower().startswith("bearer ") else ""
    user_id = read_token(token) if token else None
    if user_id is None:
        raise HTTPException(status_code=401, detail="Please log in again.")
    with closing(connect()) as conn:
        row = conn.execute(
            "SELECT id, name, email, first_name, last_name FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="Please log in again.")
    return _public_user(row)


def optional_user(request: Request) -> PublicUser | None:
    """Like `current_user`, but guests are allowed through as None."""
    try:
        return current_user(request)
    except HTTPException:
        return None


@app.post("/api/auth/signup")
def signup(payload: SignupRequest) -> dict[str, object]:
    """Create an account. The password is hashed before it ever reaches the database."""
    email = payload.email.strip().lower()
    full_name = f"{payload.first_name.strip()} {payload.last_name.strip()}".strip()

    with closing(connect_rw()) as conn:
        if conn.execute("SELECT 1 FROM users WHERE LOWER(email) = ?", (email,)).fetchone():
            raise HTTPException(status_code=409, detail="That email already has an account.")
        cursor = conn.execute(
            "INSERT INTO users (name, email, password_hash, first_name, last_name) "
            "VALUES (?, ?, ?, ?, ?)",
            (
                full_name,
                email,
                hash_password(payload.password),
                payload.first_name.strip(),
                payload.last_name.strip(),
            ),
        )
        conn.commit()
        row = conn.execute(
            "SELECT id, name, email, first_name, last_name FROM users WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()

    user = _public_user(row)
    return {"token": issue_token(user.id), "user": user}


@app.post("/api/auth/login")
def login(payload: LoginRequest) -> dict[str, object]:
    """Exchange email + password for a session token."""
    email = payload.email.strip().lower()
    with closing(connect()) as conn:
        row = conn.execute(
            "SELECT id, name, email, first_name, last_name, password_hash FROM users "
            "WHERE LOWER(email) = ?",
            (email,),
        ).fetchone()

    # One message for both unknown email and wrong password, so the endpoint cannot
    # be used to discover which addresses have accounts.
    if row is None or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")

    user = _public_user(row)
    return {"token": issue_token(user.id), "user": user}


@app.get("/api/auth/me", response_model=PublicUser)
def me(user: PublicUser = Depends(current_user)) -> PublicUser:
    """Who the current token belongs to; used to restore a session on page load."""
    return user



# --- audit trail (Problem 12) -------------------------------------------------

AUDIT_PATH = Path(os.getenv("AUDIT_TRAIL", BASE_DIR / "output" / "audit_trail.json"))
_AUDIT_LOCK = threading.Lock()

# Caps. The agent loop is bounded so a confused turn cannot spin up cost forever.
MAX_MODEL_REQUESTS = 6      # model round trips per shopper message
MAX_TOOL_CALLS = 10         # tool calls per shopper message
AUDIT_SNIPPET = 220         # characters kept per logged argument/result


# The audit trail is a committed artefact, so anything a shopper types could end up
# in version control. These patterns catch the things that must never land there.
_SECRET_PATTERNS = [
    # "my password is hunter2", "passcode: abc123", "pin = 4321"
    re.compile(
        r"\b(password|passcode|passwd|pwd|pin|secret|api[ _-]?key|token)\b\s*(?:is|are|=|:)?\s*\S+",
        re.IGNORECASE,
    ),
    # Card-length digit runs, with or without separators.
    re.compile(r"\b(?:\d[ -]?){13,19}\b"),
    # Provider-style keys.
    re.compile(r"\b(?:sk|pk|rk)-[A-Za-z0-9_-]{16,}\b"),
]


def _redact(text: str) -> str:
    """Strip anything that looks like a credential before it is written to disk."""
    for pattern in _SECRET_PATTERNS:
        text = pattern.sub("[redacted]", text)
    return text


def _clip(value: object, limit: int = AUDIT_SNIPPET) -> str:
    """One-line, length-capped, credential-redacted rendering of a value."""
    text = value if isinstance(value, str) else json.dumps(value, default=str, ensure_ascii=False)
    text = _redact(" ".join(text.split()))
    return text if len(text) <= limit else text[: limit - 1] + "\u2026"


def append_audit(events: list[dict[str, object]]) -> None:
    """Append events to output/audit_trail.json without rewriting the file.

    The file is a JSON array. Rather than read-modify-write (which would lose
    history on a crash and grow slower every run), this seeks to the closing
    bracket and splices new entries in, so the trail is genuinely append-only and
    is never wiped between runs.
    """
    if not events:
        return
    body = ",\n".join("  " + json.dumps(e, ensure_ascii=False, default=str) for e in events)
    with _AUDIT_LOCK:
        try:
            AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
            if not AUDIT_PATH.exists() or AUDIT_PATH.stat().st_size == 0:
                AUDIT_PATH.write_text("[\n" + body + "\n]\n", encoding="utf-8")
                return
            with open(AUDIT_PATH, "r+b") as handle:
                handle.seek(0, os.SEEK_END)
                size = handle.tell()
                window = min(size, 16)
                handle.seek(size - window)
                tail = handle.read().decode("utf-8", "ignore")
                bracket = tail.rfind("]")
                if bracket == -1:  # unexpected shape; do not clobber it
                    logger.warning("audit_trail.json has no closing bracket; skipping append")
                    return
                handle.seek(size - window + bracket)
                handle.truncate()
                handle.write((",\n" + body + "\n]\n").encode("utf-8"))
        except OSError:
            # Auditing must never take the shop down.
            logger.exception("Could not write audit trail")


def _audit_events(
    result: object, user: PublicUser | None, asked: str, page: object, elapsed_ms: int
) -> list[dict[str, object]]:
    """Turn one agent run into audit rows: one per tool call, plus a run summary."""
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    actor = f"user:{user.id}" if user else "guest"
    events: list[dict[str, object]] = []

    calls: dict[str, dict[str, object]] = {}
    for message in result.all_messages():  # type: ignore[attr-defined]
        for part in getattr(message, "parts", []):
            kind = part.__class__.__name__
            if kind == "ToolCallPart":
                calls[part.tool_call_id] = {
                    "tool": part.tool_name,
                    "args": _clip(part.args),
                }
            elif kind == "ToolReturnPart":
                call = calls.get(part.tool_call_id, {"tool": part.tool_name, "args": ""})
                events.append(
                    {
                        "ts": now,
                        "event": "tool_call",
                        "actor": actor,
                        "tool": call["tool"],
                        "args": call["args"],
                        "result": _clip(part.content),
                    }
                )

    # `result.usage` is a property in pydantic-ai 2.x (it was a method in 1.x).
    usage = getattr(result, "usage", None)
    if callable(usage):
        usage = usage()
    events.append(
        {
            "ts": now,
            "event": "agent_run",
            "actor": actor,
            "model": model_name(),
            "message": _clip(asked, 160),
            "page": _clip(page.model_dump() if page is not None else None, 120),
            "tool_calls": len(events),
            "stop_reason": "complete",
            "duration_ms": elapsed_ms,
            "requests": getattr(usage, "requests", None),
            "input_tokens": getattr(usage, "input_tokens", None),
            "output_tokens": getattr(usage, "output_tokens", None),
        }
    )
    return events


def audit_failure(user: PublicUser | None, asked: str, stop_reason: str, detail: str) -> None:
    """Record a turn that did not complete, so the trail shows failures too."""
    append_audit(
        [
            {
                "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "event": "agent_run",
                "actor": f"user:{user.id}" if user else "guest",
                "model": model_name(),
                "message": _clip(asked, 160),
                "tool_calls": 0,
                "stop_reason": stop_reason,
                "detail": _clip(detail, 200),
            }
        ]
    )


# --- chat ---------------------------------------------------------------------

CHAT_HISTORY_LIMIT = 20

# Shown when the model provider's own content filter rejects a message, so the
# shopper gets a plain refusal rather than a stack of gateway internals.
CONTENT_FILTER_REPLY = (
    "I can't help with that one, sorry. I'm here for Campus Customs gear though - "
    "ask me about sizes, prices or what to get someone."
)


def _is_content_filter(exc: Exception) -> bool:
    """True if the upstream provider blocked the prompt on its safety policy."""
    text = str(exc).lower()
    return "content_filter" in text or "content management policy" in text


def _load_history(user_id: int) -> list[ChatMessage]:
    """Recent turns for a signed-in shopper, oldest first."""
    with closing(connect()) as conn:
        rows = conn.execute(
            "SELECT role, content, products_json, created_at FROM chat_messages "
            "WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?",
            (user_id, CHAT_HISTORY_LIMIT),
        ).fetchall()

    history: list[ChatMessage] = []
    for row in reversed(rows):
        products: list[Product] = []
        if row["products_json"]:
            try:
                products = [
                    Product.model_validate(item) for item in json.loads(row["products_json"])
                ]
            except (ValueError, TypeError):
                # A stored card that no longer matches the model shouldn't break the
                # transcript; show the message without its cards.
                products = []
        history.append(
            ChatMessage(
                role=row["role"],
                content=row["content"],
                products=products,
                created_at=row["created_at"],
            )
        )
    return history


def _history_as_messages(history: list[ChatMessage]) -> list[ModelMessage]:
    """Turn stored rows into Pydantic AI message history.

    Replaying real `ModelRequest`/`ModelResponse` messages (rather than pasting a
    transcript into the next prompt) keeps the roles intact, so the model treats past
    turns as conversation rather than as text to analyse.
    """
    messages: list[ModelMessage] = []
    for turn in history:
        if turn.role == "user":
            messages.append(ModelRequest(parts=[UserPromptPart(content=turn.content)]))
        else:
            messages.append(ModelResponse(parts=[TextPart(content=turn.content)]))
    return messages


def _save_turn(user_id: int, role: str, content: str, products: list[Product]) -> None:
    """Persist one turn so the conversation survives a reload."""
    payload = json.dumps([p.model_dump() for p in products]) if role == "assistant" else None
    with closing(connect_rw()) as conn:
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content, products_json) "
            "VALUES (?, ?, ?, ?)",
            (user_id, role, content, payload),
        )
        conn.commit()


@app.get("/api/chat/history", response_model=list[ChatMessage])
def chat_history(user: PublicUser = Depends(current_user)) -> list[ChatMessage]:
    """Replay a signed-in shopper's previous conversation."""
    return _load_history(user.id)


@app.post("/api/chat", response_model=ChatReply)
async def chat(
    payload: ChatRequest,
    user: PublicUser | None = Depends(optional_user),
) -> ChatReply:
    """Send a shopper's message to the agent and return its reply plus product cards.

    Guests get answers too; only signed-in shoppers have their history saved.
    """
    try:
        agent = get_agent()
    except MissingAPIKey as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    # Who is chatting, and where they are standing on the site.
    deps = ShopDeps(user=user, page=payload.page)
    asked = payload.message.strip()

    # Signed-in shoppers get their saved conversation replayed as real model
    # messages, so the agent remembers them across visits. Guests start fresh.
    history = _history_as_messages(_load_history(user.id)) if user is not None else []

    started = time.perf_counter()
    try:
        result = await agent.run(
            asked,
            deps=deps,
            message_history=history,
            # Loop limits: one shopper message cannot fan out without bound.
            usage_limits=UsageLimits(
                request_limit=MAX_MODEL_REQUESTS, tool_calls_limit=MAX_TOOL_CALLS
            ),
        )
    except DataPackMissing as exc:
        audit_failure(user, asked, "no_database", str(exc))
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 - never leak provider internals to the browser
        logger.exception("Agent run failed")
        # The upstream provider's own safety filter can reject a message before the
        # agent sees it. That is a refusal, not an outage, so answer like a refusal
        # instead of showing the shopper a gateway error.
        if _is_content_filter(exc):
            audit_failure(user, asked, "content_filter", "blocked upstream")
            return ChatReply(reply=CONTENT_FILTER_REPLY, products=[])
        audit_failure(user, asked, type(exc).__name__, str(exc))
        raise HTTPException(
            status_code=502,
            detail="The shop assistant is unavailable right now. Please try again in a moment.",
        ) from exc

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    append_audit(_audit_events(result, user, asked, payload.page, elapsed_ms))

    reply = ChatReply(reply=result.output, products=deps.cards)

    if user is not None:
        _save_turn(user.id, "user", asked, [])
        _save_turn(user.id, "assistant", reply.reply, reply.products)

    return reply
