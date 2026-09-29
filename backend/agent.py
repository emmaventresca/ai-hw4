"""Agent entry point and wiring.

The shop assistant is a Pydantic AI agent talking to an OpenAI-compatible model through
the Portkey gateway. The system prompt lives in `prompts/prompt.md` rather than in code,
so the shop's voice and safety rules can be edited without touching Python.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

from models import PageContext, PublicUser
from tools import (
    ShopDeps,
    query_product,
    check_size_stock,
    check_sizes_bulk,
    get_product_details,
    list_categories,
    search_catalogue,
)

BASE_DIR = Path(__file__).resolve().parent
PROMPT_PATH = BASE_DIR / "prompts" / "prompt.md"

load_dotenv(dotenv_path=BASE_DIR.parent / ".env")

PORTKEY_BASE_URL = os.getenv("PORTKEY_BASE_URL", "https://api.portkey.ai/v1")
DEFAULT_MODEL = "gpt-5.6-luna"


class MissingAPIKey(RuntimeError):
    """Raised when PORTKEY_API_KEY is absent, so the API can report it cleanly."""


def load_system_prompt() -> str:
    """Read the shop's voice and safety rules from prompts/prompt.md."""
    if not PROMPT_PATH.exists():
        raise RuntimeError(f"System prompt not found at {PROMPT_PATH}")
    return PROMPT_PATH.read_text(encoding="utf-8")


def model_name() -> str:
    """Chat model id, from PORTKEY_MODEL, falling back to the project default."""
    return os.getenv("PORTKEY_MODEL", DEFAULT_MODEL)


def _build_model() -> OpenAIChatModel:
    """Point Pydantic AI at Portkey's OpenAI-compatible endpoint.

    Portkey authenticates with the `x-portkey-api-key` header rather than a bearer
    token, so the OpenAI client is given a placeholder key and the real credential
    travels in the default headers. The key is read from the environment and never
    logged or returned to the frontend.
    """
    api_key = os.getenv("PORTKEY_API_KEY")
    if not api_key:
        raise MissingAPIKey(
            "PORTKEY_API_KEY is not set. Copy .env.example to .env and add your key."
        )

    client = AsyncOpenAI(
        base_url=PORTKEY_BASE_URL,
        api_key="unused",  # Portkey ignores this; the real key is in the header below.
        default_headers={
            "x-portkey-api-key": api_key,
            "x-portkey-provider": "openai",
        },
    )
    return OpenAIChatModel(model_name(), provider=OpenAIProvider(openai_client=client))


@lru_cache(maxsize=1)
def get_agent() -> Agent[ShopDeps, str]:
    """Build the shop agent once and reuse it across requests.

    Cached because constructing the model and registering tools on every message
    would be wasted work; the agent itself holds no conversation state.
    """
    agent = Agent(
        _build_model(),
        deps_type=ShopDeps,
        output_type=str,
        system_prompt=load_system_prompt(),
        retries=2,
    )

    # Catalogue tools. Everything the agent can claim about price or stock comes
    # from one of these.
    agent.tool(search_catalogue)
    agent.tool(get_product_details)
    agent.tool(check_size_stock)
    agent.tool(check_sizes_bulk)
    agent.tool(list_categories)

    @agent.system_prompt
    def who_is_shopping(ctx) -> str:
        """Tell the agent who it is talking to, if they are signed in."""
        user: PublicUser | None = ctx.deps.user
        if user is None:
            return (
                "The shopper is browsing as a guest. Do not claim to know who they are, and "
                "do not invent a name. If they ask about their account or past orders, "
                "suggest logging in."
            )
        first = user.first_name or user.name.split(" ")[0]
        return (
            f"The signed-in shopper is {user.name} (first name {first}, email {user.email}). "
            f"Greet them by first name when it is natural. Only mention their email if they "
            f"ask what address is on the account. You know nothing else about them - no order "
            f"history, no payment details, no address - so do not imply otherwise, and never "
            f"mention any other customer."
        )

    @agent.system_prompt
    def where_they_are(ctx) -> str:
        """Ground demonstratives like "this" in the page the shopper is actually on.

        Without this, "do you have this in pink?" sent from a product page has no
        referent and the agent has to guess which item is meant.
        """
        page: PageContext | None = ctx.deps.page
        if page is None:
            return ""

        if page.product_id:
            product = query_product(page.product_id)
            if product is not None:
                # Record it, so a follow-up about "this" still puts the right card
                # on the page even if no search tool runs this turn.
                ctx.deps.remember([product])
                colors = ", ".join(product.colors) if product.colors else "not listed"
                in_stock = [s.size for s in product.inventory if s.quantity > 0] or ["none"]
                return (
                    "The shopper is currently looking at the product page for "
                    f"**{product.name}** (product_id `{product.product_id}`), "
                    f"${product.price:g}, colours: {colors}, sizes in stock: "
                    f"{', '.join(in_stock)}. If they say \"this\", \"it\" or \"that one\" "
                    "without naming a product, they mean this one. You may still call tools "
                    "to confirm details before quoting them."
                )

        if page.search or page.category:
            filters = ", ".join(
                bit for bit in (
                    f"search \"{page.search}\"" if page.search else "",
                    f"category \"{page.category}\"" if page.category else "",
                ) if bit
            )
            return (
                f"The shopper is on the products page, filtered by {filters}. If they say "
                '"these" or "any of these", they mean products matching that filter.'
            )

        if page.path == "/":
            return "The shopper is on the home page."
        if page.path == "/about":
            return "The shopper is reading the About Us page."
        return ""

    return agent
