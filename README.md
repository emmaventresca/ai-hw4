# Campus Customs — Yale Bulldog Blue

A customer website for Campus Customs, the licensed Yale merchandise shop at 57 Broadway in
New Haven. Shoppers browse the catalogue, create an account, and chat with a shop assistant
that answers from the real product database — never from guesswork.

- **Frontend:** React 19 + Vite + TypeScript
- **Backend:** FastAPI
- **Chatbot:** a Pydantic AI agent, reaching `gpt-5.6-luna` through the Portkey gateway
- **Data:** a local SQLite database and product images (not in this repo — see below)

---

## 1. Get the data pack

The database and product images are **not committed**. Place the local-only data pack so the
tree looks like this:

```
hw4/
  data/
    campus_customs.db
    products/          # one .jpg per product
```

Nothing will work until this is in place; the API reports `{"status": "no-database"}` at
`/api/health` if the pack is missing.

## 2. Configure environment variables

```bash
cp .env.example .env
```

Then edit `.env`:

| Variable | Purpose |
| --- | --- |
| `PORTKEY_API_KEY` | Your Portkey key. **Required for the chatbot.** |
| `PORTKEY_MODEL` | Chat model; defaults to `gpt-5.6-luna`. |
| `SESSION_SECRET` | Signs login tokens. Without it, sessions end when the server restarts. |

Generate a session secret with:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

`.env` is git-ignored. Never commit it.

## 3. Run the backend

From the `hw4/` directory, create the virtual environment and install dependencies:

```bash
python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
```

Then start the API **from the `backend/` folder**:

```bash
cd backend && ../venv/bin/uvicorn main:app --reload --port 8000
```

Check it came up — this should report `"status": "ok"` and a product count:

```bash
curl http://127.0.0.1:8000/api/health
```

> If port 8000 is already in use, run on another port (for example `--port 8010`) and start
> the frontend with a matching `VITE_BACKEND_URL`, as shown below.

## 4. Run the frontend

In a second terminal:

```bash
cd frontend && npm install && npm run dev
```

Open **http://localhost:5173**.

Vite proxies `/api` and `/media` to `http://127.0.0.1:8000`, so no other configuration is
needed. If the backend is on a different port:

```bash
VITE_BACKEND_URL=http://127.0.0.1:8010 npm run dev
```

## 5. Try it

- **Home / About Us** — the shop's story.
- **Products** — the full catalogue, searchable and filterable by category. Click any card for
  the full item page with per-size stock.
- **Create Account / Login** — a seeded test account exists:
  `test@campuscustoms.yale.edu` / `password`
- **Add to bag** — pick a size on any product page and add it. The bag button in the navbar
  opens a drawer with quantities, a subtotal and removal. Quantities are capped at real
  per-size stock, sold-out sizes can't be selected, and the bag survives a refresh.
- **Chat** — the bubble in the bottom right. Try:
  - "What hoodies do you have?"
  - "Do you have the Champion Reverse Weave Hoodie 1 in XL?" *(it's sold out — it will say so)*
  - "Do you have the Basic Hoodie Big Yale in hot pink?"

Signed-in shoppers have their conversation saved and replayed on their next visit.

---

## Project layout

```
hw4/
  AI_prompts.md          # prompt log, one section per problem
  requirements.txt
  .env.example
  .gitignore
  README.md
  frontend/              # React + Vite + TypeScript
    src/
      pages/             # Home, About, Products, ProductDetail, Login, Signup
      components/        # NavBar, ProductCard, ChatWidget, CartDrawer, AddToCart
      cart.tsx           # shopping bag (localStorage-backed)
      auth.tsx           # session context
      api.ts             # typed API client
  backend/
    main.py              # FastAPI app: catalogue, images, auth, chat
    agent.py             # Pydantic AI agent wiring (model + prompt)
    tools.py             # data layer and the tools the agent can call
    models.py            # Pydantic types shared by the API and the agent
    prompts/
      prompt.md          # system prompt: voice, safety, tool discipline
  output/                # written deliverables
  data/                  # local-only, git-ignored
```

## API reference

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Status, product count, model, whether a key is configured |
| `GET` | `/api/products` | List products (`search`, `category`, `limit`) |
| `GET` | `/api/products/{id}` | One product with per-size stock |
| `GET` | `/api/categories` | Garment categories |
| `GET` | `/media/products/{file}` | Product image |
| `POST` | `/api/auth/signup` | Create an account |
| `POST` | `/api/auth/login` | Log in, returns a session token |
| `GET` | `/api/auth/me` | Current user from a bearer token |
| `POST` | `/api/chat` | Send a message to the shop assistant |
| `GET` | `/api/chat/history` | Replay a signed-in shopper's conversation |

Interactive docs are at `http://127.0.0.1:8000/docs` while the backend is running.

## Notes on safety

- Passwords are hashed with PBKDF2-HMAC-SHA256 at 120,000 iterations with a per-account random
  salt; plaintext is never stored or logged.
- The API opens SQLite read-only for every read, so browsing cannot modify the data pack.
- Product images are served only from the image directory; path traversal is rejected.
- The agent can state a price, colour or stock level **only** from a database lookup. It is
  instructed never to reveal system internals, and provider errors are logged server-side
  rather than shown to the shopper.

See `output/harness.md` for the full write-up.
