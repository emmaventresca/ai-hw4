import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useMatch, useSearchParams } from 'react-router-dom'
import { authToken, useAuth } from '../auth'
import { useChatResults } from '../chatResults'
import BulldogMark from './art/BulldogMark'
import { formatPrice, imageUrl } from '../api'
import type { Product } from '../types'

const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
  products?: Product[]
}

const GREETING: ChatTurn = {
  role: 'assistant',
  content:
    "Hey! I'm the Campus Customs shop assistant. Ask me about sizes, prices, or what to " +
    'get your Yale parent — I look everything up in our actual stock list.',
}

/** Minimal Markdown: **bold** and "- " bullets, which is all the prompt asks for. */
function renderContent(text: string) {
  return text.split('\n').map((line, index) => {
    const bullet = line.trimStart().startsWith('- ')
    const body = bullet ? line.trimStart().slice(2) : line
    const parts = body.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        part
      ),
    )
    return (
      <div key={index} className={bullet ? 'chat-bullet' : undefined}>
        {bullet && <span aria-hidden="true">• </span>}
        {parts}
      </div>
    )
  })
}

/** Product cards shown under an assistant reply, matching what it looked up. */
function ChatCards({ products, onNavigate }: { products: Product[]; onNavigate: () => void }) {
  if (products.length === 0) return null
  return (
    <div className="chat-cards">
      {products.map((product) => (
        <Link
          key={product.product_id}
          to={`/products/${product.product_id}`}
          className="chat-card"
          onClick={onNavigate}
        >
          <img src={imageUrl(product)} alt={product.name} loading="lazy" />
          <span className="chat-card__body">
            <span className="chat-card__name">{product.name}</span>
            <span className="chat-card__price">{formatPrice(product.price)}</span>
          </span>
        </Link>
      ))}
    </div>
  )
}

/**
 * Floating shop assistant, bottom right.
 *
 * Posts to `POST /api/chat`, which runs the Pydantic AI agent in the backend. The
 * agent returns its reply plus the products it actually looked up, and those become
 * the cards under the message — so what's on screen always matches what it said.
 */
export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<ChatTurn[]>([GREETING])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { publish } = useChatResults()

  // Page context (Problem 8): tells the agent where the shopper is standing, so
  // "do you have this in pink?" from a product page resolves to that product.
  const location = useLocation()
  const productMatch = useMatch('/products/:productId')
  const [searchParams] = useSearchParams()
  const pageContext = {
    path: location.pathname,
    product_id: productMatch?.params.productId ?? null,
    search: searchParams.get('search'),
    category: searchParams.get('category'),
  }

  // Keep the newest message in view as the transcript grows.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, pending, open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Signed-in shoppers get their saved conversation back when the panel opens.
  useEffect(() => {
    if (!open || !user) return
    const token = authToken()
    if (!token) return
    fetch(`${BASE}/api/chat/history`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => (response.ok ? response.json() : []))
      .then((history: ChatTurn[]) => {
        if (history.length > 0) setTurns([GREETING, ...history])
      })
      .catch(() => {
        /* History is a nicety; a failure here shouldn't block chatting. */
      })
  }, [open, user])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || pending) return

    setTurns((prev) => [...prev, { role: 'user', content: text }])
    setDraft('')
    setPending(true)
    setError(null)

    try {
      const token = authToken()
      const response = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text, page: pageContext }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.detail ?? `Chat failed (${response.status})`)
      }
      const matches: Product[] = payload.products ?? []
      setTurns((prev) => [...prev, { role: 'assistant', content: payload.reply, products: matches }])
      // Push the agent's structured matches onto the page as full product cards.
      publish(text, matches)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPending(false)
    }
  }

  if (!open) {
    return (
      <button type="button" className="chat-launcher" onClick={() => setOpen(true)}>
        <span className="chat-launcher__dog" aria-hidden="true"><BulldogMark size={26} paper="#00356b" /></span>
        Ask us anything
      </button>
    )
  }

  return (
    <section className="chat-panel" aria-label="Shop assistant">
      <header className="chat-panel__header">
        <span className="chat-panel__avatar" aria-hidden="true"><BulldogMark size={34} paper="#00356b" /></span>
        <div>
          <div className="chat-panel__title">Campus Customs Assistant</div>
          <div className="chat-panel__subtitle">Sizes, stock and gift ideas</div>
        </div>
        <button
          type="button"
          className="chat-panel__close"
          onClick={() => setOpen(false)}
          aria-label="Close chat"
        >
          ×
        </button>
      </header>

      <div className="chat-panel__log" ref={logRef} role="log" aria-live="polite">
        {turns.map((turn, index) => (
          <div key={index} className="chat-turn">
            <div className={`chat-msg chat-msg--${turn.role === 'user' ? 'user' : 'bot'}`}>
              {renderContent(turn.content)}
            </div>
            {turn.role === 'assistant' && turn.products && turn.products.length > 0 && (
              <ChatCards products={turn.products} onNavigate={() => setOpen(false)} />
            )}
          </div>
        ))}
        {pending && (
          <div className="chat-msg chat-msg--bot chat-typing">
            <span /><span /><span />
          </div>
        )}
        {error && <div className="chat-error">{error}</div>}
      </div>

      <form className="chat-panel__form" onSubmit={handleSubmit}>
        <label htmlFor="chat-input" className="visually-hidden">Message the shop assistant</label>
        <input
          id="chat-input"
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Do you have the big Yale hoodie in M?"
          autoComplete="off"
        />
        <button type="submit" className="chat-panel__send" disabled={!draft.trim() || pending}>
          Send
        </button>
      </form>
    </section>
  )
}
