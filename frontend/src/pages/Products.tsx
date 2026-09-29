import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchCategories, fetchProducts } from '../api'
import type { Product } from '../types'
import ProductCard from '../components/ProductCard'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const SORTS = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'stock', label: 'Most in stock' },
]

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const category = searchParams.get('category') ?? ''
  const size = searchParams.get('size') ?? ''
  const sort = searchParams.get('sort') ?? 'name'

  const [draft, setDraft] = useState(search)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => setDraft(search), [search])

  // Usability improvement 2: search as you type. A 300ms debounce means results
  // arrive without pressing a button, but one request per pause, not per keystroke.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (draft === search) return
    const timer = setTimeout(() => updateParams({ search: draft.trim() }), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchProducts({ search, category, size, sort })
      .then((data) => {
        if (!cancelled) setProducts(data.products)
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
  }, [search, category, size, sort])

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    setSearchParams(params, { replace: true })
  }

  const heading = useMemo(() => {
    if (category) return category.replace(/\b\w/g, (c) => c.toUpperCase())
    return 'All products'
  }, [category])

  const hasFilters = Boolean(search || category || size || sort !== 'name')

  return (
    <div className="container">
      <h1>{heading}</h1>
      <p className="section__lead">
        Officially licensed Yale gear, straight from the shop on Broadway. Click any piece for
        sizes and stock.
      </p>

      <div className="toolbar">
        <div className="field toolbar__search">
          <label htmlFor="product-search">Search</label>
          <input
            id="product-search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="hoodie, Davenport, baseball…"
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="product-category">Category</label>
          <select
            id="product-category"
            value={category}
            onChange={(event) => updateParams({ category: event.target.value })}
          >
            <option value="">All categories</option>
            {categories.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="product-sort">Sort by</label>
          <select
            id="product-sort"
            value={sort}
            onChange={(event) => updateParams({ sort: event.target.value })}
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setSearchParams({}, { replace: true })}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Usability improvement 1: shop your size. Filters to pieces actually in
          stock in that size, so nothing shown is a dead end. */}
      <div className="size-filter">
        <span className="size-filter__label">Shop my size</span>
        <div className="size-filter__options" role="group" aria-label="Filter by size in stock">
          <button
            type="button"
            className={`size-chip${size === '' ? ' is-active' : ''}`}
            onClick={() => updateParams({ size: '' })}
            aria-pressed={size === ''}
          >
            Any
          </button>
          {SIZES.map((option) => (
            <button
              key={option}
              type="button"
              className={`size-chip${size === option ? ' is-active' : ''}`}
              onClick={() => updateParams({ size: size === option ? '' : option })}
              aria-pressed={size === option}
            >
              {option}
            </button>
          ))}
        </div>
        {size && <span className="size-filter__note">Showing only pieces in stock in {size}</span>}
      </div>

      {loading && (
        <div className="state">
          <div className="spinner" />
          Loading the racks…
        </div>
      )}

      {error && !loading && (
        <div className="alert alert--error">{error} — is the backend running?</div>
      )}

      {!loading && !error && (
        <>
          <p className="results-count">
            {products.length} {products.length === 1 ? 'piece' : 'pieces'}
            {search && <> matching “{search}”</>}
            {size && <> available in {size}</>}
          </p>
          {products.length === 0 ? (
            <div className="state">
              Nothing matched that.{' '}
              {size ? `Try another size, or clear the ${size} filter.` : 'Try a broader search.'}
            </div>
          ) : (
            <ul className="product-grid">
              {products.map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
