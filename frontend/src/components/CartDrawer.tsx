import { Link } from 'react-router-dom'
import { useCart } from '../cart'
import { formatPrice } from '../api'

const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

/** Slide-over basket. Quantities are clamped to real per-size stock. */
export default function CartDrawer() {
  const { lines, count, subtotal, isOpen, setQuantity, remove, clear, close } = useCart()

  if (!isOpen) return null

  return (
    <>
      <div className="drawer__scrim" onClick={close} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-label="Your bag" aria-modal="true">
        <header className="drawer__header">
          <h2>Your bag {count > 0 && <span className="drawer__count">{count}</span>}</h2>
          <button type="button" className="drawer__close" onClick={close} aria-label="Close bag">×</button>
        </header>

        {lines.length === 0 ? (
          <div className="drawer__empty">
            <p>Your bag is empty.</p>
            <Link to="/products" className="btn btn--primary" onClick={close}>Start shopping</Link>
          </div>
        ) : (
          <>
            <ul className="drawer__lines">
              {lines.map((line) => (
                <li key={`${line.product_id}-${line.size}`} className="cart-line">
                  <Link to={`/products/${line.product_id}`} onClick={close}>
                    <img src={`${BASE}${line.image_url}`} alt={line.name} />
                  </Link>
                  <div className="cart-line__body">
                    <Link
                      to={`/products/${line.product_id}`}
                      className="cart-line__name"
                      onClick={close}
                    >
                      {line.name}
                    </Link>
                    <span className="cart-line__size">Size {line.size}</span>
                    <div className="cart-line__controls">
                      <div className="stepper">
                        <button
                          type="button"
                          onClick={() => setQuantity(line.product_id, line.size, line.quantity - 1)}
                          aria-label={`Decrease quantity of ${line.name}`}
                        >−</button>
                        <span aria-live="polite">{line.quantity}</span>
                        <button
                          type="button"
                          disabled={line.quantity >= line.available}
                          onClick={() => setQuantity(line.product_id, line.size, line.quantity + 1)}
                          aria-label={`Increase quantity of ${line.name}`}
                        >+</button>
                      </div>
                      <button
                        type="button"
                        className="cart-line__remove"
                        onClick={() => remove(line.product_id, line.size)}
                      >
                        Remove
                      </button>
                    </div>
                    {line.quantity >= line.available && (
                      <span className="cart-line__max">
                        That's all {line.available} we have in {line.size}.
                      </span>
                    )}
                  </div>
                  <span className="cart-line__price">{formatPrice(line.price * line.quantity)}</span>
                </li>
              ))}
            </ul>

            <footer className="drawer__footer">
              <div className="drawer__total">
                <span>Subtotal</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <p className="drawer__note">Shipping and tax calculated at checkout.</p>
              <button type="button" className="btn btn--primary btn--block btn--lg">
                Checkout
              </button>
              <button type="button" className="btn btn--ghost btn--block" onClick={clear}>
                Empty bag
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  )
}
