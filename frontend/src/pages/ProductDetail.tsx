import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProduct, formatPrice, imageUrl } from '../api'
import type { Product } from '../types'
import StockPill from '../components/StockPill'

export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!productId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setProduct(null)
    fetchProduct(productId)
      .then((data) => {
        if (!cancelled) setProduct(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [productId])

  if (loading) {
    return (
      <div className="container state">
        <div className="spinner" />
        Loading…
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container">
        <div className="alert alert--error">{error ?? 'Product not found.'}</div>
        <Link to="/products" className="btn btn--ghost">Back to all products</Link>
      </div>
    )
  }

  const availableSizes = product.inventory.filter((row) => row.quantity > 0)

  return (
    <div className="container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/products">Products</Link> <span aria-hidden="true">›</span> {product.name}
      </nav>

      <div className="detail">
        {/* Large image on one side… */}
        <div className="detail__media">
          <img src={imageUrl(product)} alt={product.name} />
        </div>

        {/* …full product text on the other. */}
        <div>
          <span className="detail__type">{product.garment_type}</span>
          <h1>{product.name}</h1>
          <div className="detail__price">{formatPrice(product.price)}</div>
          <StockPill totalStock={product.total_stock} />

          <p className="detail__desc" style={{ marginTop: 18 }}>{product.description}</p>

          <div className="detail__block">
            <h3>Colors</h3>
            {product.colors.length > 0 ? (
              <ul className="chip-row">
                {product.colors.map((color) => (
                  <li key={color} className="chip">{color}</li>
                ))}
              </ul>
            ) : (
              <p className="field__hint">Color information isn’t listed for this piece.</p>
            )}
          </div>

          <div className="detail__block">
            <h3>Sizes &amp; stock</h3>
            <table className="size-table">
              <thead>
                <tr>
                  <th scope="col">Size</th>
                  <th scope="col">Availability</th>
                  <th scope="col">Units</th>
                </tr>
              </thead>
              <tbody>
                {product.inventory.map((row) => (
                  <tr key={row.size}>
                    <td>{row.size}</td>
                    <td>
                      {row.quantity > 0 ? (
                        <span style={{ color: 'var(--green)', fontWeight: 600 }}>In stock</span>
                      ) : (
                        <span style={{ color: '#6b7280' }}>Sold out</span>
                      )}
                    </td>
                    <td>{row.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="field__hint" style={{ marginTop: 10 }}>
              {availableSizes.length > 0
                ? `Available now in ${availableSizes.map((row) => row.size).join(', ')} — ${product.total_stock} units in total.`
                : 'Every size is sold out right now.'}
            </p>
          </div>

          {product.search_tags.length > 0 && (
            <div className="detail__block">
              <h3>Tags</h3>
              <ul className="chip-row">
                {product.search_tags.map((tag) => (
                  <li key={tag} className="chip chip--muted">{tag}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="detail__block">
            <Link to="/products" className="btn btn--ghost">← Keep browsing</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
