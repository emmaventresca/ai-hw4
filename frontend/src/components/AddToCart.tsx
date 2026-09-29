import { useState } from 'react'
import type { Product } from '../types'
import { useCart } from '../cart'

/** Size picker + add button on the product page. Sold-out sizes are unselectable. */
export default function AddToCart({ product }: { product: Product }) {
  const { add } = useCart()
  const inStock = product.inventory.filter((row) => row.quantity > 0)
  const [size, setSize] = useState<string>(inStock[0]?.size ?? '')

  if (inStock.length === 0) {
    return (
      <div className="add-cart add-cart--out">
        <p>Every size is sold out right now. Ask the shop assistant about something similar.</p>
      </div>
    )
  }

  const selected = product.inventory.find((row) => row.size === size)

  return (
    <div className="add-cart">
      <h3>Choose a size</h3>
      <div className="add-cart__sizes" role="group" aria-label="Choose a size">
        {product.inventory.map((row) => {
          const soldOut = row.quantity <= 0
          return (
            <button
              key={row.size}
              type="button"
              disabled={soldOut}
              aria-pressed={row.size === size}
              className={`size-chip${row.size === size ? ' is-active' : ''}${soldOut ? ' is-out' : ''}`}
              onClick={() => setSize(row.size)}
              title={soldOut ? `${row.size} is sold out` : `${row.quantity} in stock`}
            >
              {row.size}
            </button>
          )
        })}
      </div>

      {selected && selected.quantity <= 3 && (
        <p className="add-cart__low">Only {selected.quantity} left in {selected.size}.</p>
      )}

      <button
        type="button"
        className="btn btn--primary btn--block btn--lg"
        onClick={() => add(product, size)}
        disabled={!size}
      >
        Add to bag
      </button>
    </div>
  )
}
