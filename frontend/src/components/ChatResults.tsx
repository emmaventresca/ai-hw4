import { useChatResults } from '../chatResults'
import ProductCard from './ProductCard'

/**
 * Products the shop assistant found, rendered onto the page as product cards.
 *
 * Deliberately uses the same `ProductCard` as the Products page, so a card the chat
 * put on screen behaves identically to one the shopper browsed to — same layout,
 * same stock badge, and the same link into the Problem 3 detail page.
 */
export default function ChatResults() {
  const { products, query, clear } = useChatResults()

  if (products.length === 0) return null

  return (
    <section className="chat-results" aria-live="polite">
      <div className="container">
        <div className="chat-results__head">
          <div>
            <span className="chat-results__eyebrow">💬 From your chat</span>
            <h2 className="chat-results__title">
              {products.length} {products.length === 1 ? 'piece' : 'pieces'} the assistant found
            </h2>
            {query && <p className="chat-results__query">You asked: “{query}”</p>}
          </div>
          <button type="button" className="btn btn--ghost" onClick={clear}>
            Clear
          </button>
        </div>

        <ul className="product-grid chat-results__grid">
          {products.map((product) => (
            <ProductCard key={product.product_id} product={product} />
          ))}
        </ul>
      </div>
    </section>
  )
}
