# Usability improvements

Four improvements — two on the frontend, two in the agent/backend — plus one extra front-end
addition (the shopping bag). Each one is live in the running app, not just described here.

---

## Frontend 1 — "Shop my size" filter

**What we added.** A size chip row (XS–XXL) above the product grid. Picking a size shows only
the pieces that are **actually in stock in that size**, backed by a new `size` parameter on
`GET /api/products` that filters on the `inventory` table. The choice lives in the URL
(`/products?size=XL`), so it survives a refresh and can be shared. A green note confirms the
filter, and the empty state offers to clear it rather than dead-ending.

**Why it helps.** 145 of our 612 size rows sit at zero, so browsing the full catalogue means
constantly opening a product only to find your size is gone. This removes that entire loop: a
shopper in XL sees 77 pieces they can actually buy instead of 102 they might not. For the
business, it cuts the clicks between "interested" and "add to cart", and it stops the most
common source of abandonment — finding out too late that the thing is sold out.

**Verified live:** `?size=XL` → "77 pieces available in XL", matching
`SELECT COUNT(*) FROM inventory WHERE size='XL' AND quantity>0` exactly (77).
Screenshot: `app_check_images/size_filter.jpg`.

---

## Frontend 2 — Search as you type, plus sorting

**What we added.** The search box now queries **as you type**, debounced at 300 ms, so results
update without pressing a button — one request per pause, not per keystroke. Alongside it, a
**Sort by** control (name, price low→high, price high→low, most in stock). Search, category,
size and sort are all URL state, and a single "Clear all" resets them.

**Why it helps.** Typing "davenport" and immediately seeing the one matching crewneck feels
like the shop is responding to you; clicking Search and waiting feels like filing a form. Sort
by price is the single most requested control in any apparel store — a parent buying for
move-in wants the cheapest sweatshirt that works, and a shopper with a gift budget wants to
start at the top. Because it is all URL state, a shopper can send "here's the one I want" as a
link, which is free word-of-mouth for the shop.

---

## Frontend 3 (extra) — Add to bag, capped at real stock

*Beyond the two required front-end improvements.*

**What we added.** A shopping bag. Each product page gets a size picker where **sold-out sizes
are disabled outright**, a "only N left" warning at 3 units or fewer, and an **Add to bag**
button. A bag button in the navbar carries a live item count and opens a slide-over drawer with
thumbnails, quantity steppers, remove links and a subtotal. The bag is held in React context
and mirrored to `localStorage`, so it survives a refresh.

**The part that matters: it cannot exceed real stock.** Each line stores `available` — the
units on the shelf in that exact size, captured from the product's `inventory`. Adding refuses
outright if the size has zero units, every quantity change is clamped to `available`, the `+`
control disables at the cap and the line explains why, and dropping to zero removes the line.

**Why it helps.** Until now a shopper who found the right piece had nowhere to put it — the
site could answer questions but not take an order, so every visit ended at a dead end. This
closes the loop from "the assistant found it" to "it's in my bag". Enforcing stock at the cart
rather than at checkout matters commercially: overselling two XL hoodies you don't have means a
refund, an apology email and a customer who doesn't come back. It also keeps the cart honest in
the same way the chatbot is honest — the whole site tells you the truth about availability, in
every surface.

**Verified live:** the Basic Hoodie Big Yale has exactly **2 units in XL** in the database. The
page warned "Only 2 left in XL", the bag accepted 2, then **disabled the `+` control** and
showed "That's all 2 we have in XL." Subtotal read **$136.00** (2 × $68.00). After a full page
reload the badge still read 2, restored from `localStorage`.
Screenshot: `app_check_images/cart.jpg`.

---

## Agent/Backend 1 — Cached catalogue snapshot (fewer queries, faster and cheaper)

**What we added.** The catalogue used to be re-read from SQLite on every search, plus a second
query per result set to join stock — so a single chat turn could issue a query per tool call
and another per product batch. Now the **entire catalogue and all 612 inventory rows load in
two queries total** into an in-memory snapshot, keyed by the database file's modification time
so a swapped data pack invalidates it automatically. Searching, filtering and per-product
lookups all run against that snapshot with **zero SQL**. `/api/health` exposes the cache
counters.

**Why it helps.** Measured: the first (cold) search takes **28.9 ms**; every subsequent search
takes **0.7 ms** — about **41× faster**. The agent often makes several tool calls in one turn,
so this compounds directly into how long a shopper waits for a reply. It is also cheaper to
run: no repeated disk reads per message, and the per-product stock join that used to scale with
result count is now a dictionary lookup.

**Verified live:** `/api/health` reports `{"loads": 1, "hits": 5, "products_cached": 102}` after
six requests — one load, everything else served from memory.

---

## Agent/Backend 2 — `check_sizes_bulk`, a batched stock tool

**What we added.** A fifth agent tool. `check_size_stock` answers for one product; the agent was
therefore forced to loop it — one model round trip per product — to answer "which of these come
in XL?". `check_sizes_bulk(product_ids, size)` answers for **up to 25 products in a single
call**, returning the in-stock and sold-out products already separated into two lists. The
system prompt instructs the agent to prefer it over looping.

**Why it helps.** Narrowing eight search results to one size went from **eight tool calls to
one**. Each avoided call is a full model round trip, so this is the single biggest lever on
both reply latency and token cost for the most common follow-up question in the shop. It also
makes the answer *more accurate*: the results come back pre-sorted into in-stock and sold-out,
so the agent reads the split off the model instead of reasoning over eight separate quantities
and risking a mistake.

**Verified live:** one call checked 8 hoodies for XL, correctly returning 7 in stock and
`Champion Reverse Weave Hoodie 1` sold out — which matches the database (`XL = 0`).

---

## Summary

| # | Improvement | Measured effect |
| --- | --- | --- |
| FE1 | Shop-my-size filter | 102 → 77 buyable items surfaced for an XL shopper; no dead-end clicks |
| FE2 | Debounced live search + sort | results without a button press; price/stock ordering; shareable URLs |
| FE3 *(extra)* | Add to bag with stock caps | closes the loop from browsing to ordering; cannot oversell — capped at the real per-size count |
| BE1 | Cached catalogue snapshot | 28.9 ms → 0.7 ms per search (~41×); 2 queries per data-pack change instead of per request |
| BE2 | `check_sizes_bulk` tool | 8 tool calls → 1 for a size sweep; pre-split results reduce reasoning errors |
