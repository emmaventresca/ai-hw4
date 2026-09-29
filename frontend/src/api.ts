import type { Product, ProductList } from './types'

// Vite proxies /api and /media to the FastAPI backend in dev (see vite.config.ts),
// so relative URLs work in both dev and a same-origin production deploy.
const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function getJSON<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`)
  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body = await response.json()
      if (body?.detail) detail = body.detail
    } catch {
      // Non-JSON error body; keep the status-based message.
    }
    throw new Error(detail)
  }
  return response.json() as Promise<T>
}

export interface ProductQuery {
  search?: string
  category?: string
  /** Only items actually in stock in this size. */
  size?: string
  sort?: string
}

export function fetchProducts(params: ProductQuery = {}) {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.category) query.set('category', params.category)
  if (params.size) query.set('size', params.size)
  if (params.sort) query.set('sort', params.sort)
  const suffix = query.toString() ? `?${query}` : ''
  return getJSON<ProductList>(`/api/products${suffix}`)
}

export function fetchProduct(productId: string) {
  return getJSON<Product>(`/api/products/${encodeURIComponent(productId)}`)
}

export function fetchCategories() {
  return getJSON<string[]>('/api/categories')
}

export function imageUrl(product: Product) {
  return `${BASE}${product.image_url}`
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
}
