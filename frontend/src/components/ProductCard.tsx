import { Link } from 'react-router-dom'
import type { Product } from '../types'
import { formatPrice, imageUrl } from '../api'
import StockPill from './StockPill'

/** A product tile. The whole card is the link, so clicking anywhere opens the item. */
export default function ProductCard({ product }: { product: Product }) {
  return (
    <li>
      <Link to={`/products/${product.product_id}`} className="product-card">
        <div className="product-card__media">
          <img src={imageUrl(product)} alt={product.name} loading="lazy" />
        </div>
        <div className="product-card__body">
          <span className="product-card__type">{product.garment_type}</span>
          <span className="product-card__name">{product.name}</span>
          <span className="product-card__desc">{product.short_description}</span>
          <span className="product-card__footer">
            <span className="product-card__price">{formatPrice(product.price)}</span>
            <StockPill totalStock={product.total_stock} />
          </span>
        </div>
      </Link>
    </li>
  )
}
