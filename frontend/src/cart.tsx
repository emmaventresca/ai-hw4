import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Product } from './types'

const STORAGE_KEY = 'cc.cart'

export interface CartLine {
  product_id: string
  name: string
  price: number
  image_url: string
  size: string
  quantity: number
  /** Units on the shelf in this size, so the cart can never exceed real stock. */
  available: number
}

interface CartValue {
  lines: CartLine[]
  count: number
  subtotal: number
  isOpen: boolean
  add: (product: Product, size: string, quantity?: number) => void
  setQuantity: (productId: string, size: string, quantity: number) => void
  remove: (productId: string, size: string) => void
  clear: () => void
  open: () => void
  close: () => void
}

const CartContext = createContext<CartValue | null>(null)

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartLine[]) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load)
  const [isOpen, setIsOpen] = useState(false)

  // The basket survives a refresh, which is the whole point of a cart.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      /* storage full or blocked; the cart still works for this session */
    }
  }, [lines])

  const add = useCallback((product: Product, size: string, quantity = 1) => {
    const stock = product.inventory.find((row) => row.size === size)
    const available = stock?.quantity ?? 0
    if (available <= 0) return // never add something that isn't on the shelf

    setLines((prev) => {
      const existing = prev.find((l) => l.product_id === product.product_id && l.size === size)
      if (existing) {
        return prev.map((line) =>
          line === existing
            ? { ...line, quantity: Math.min(line.quantity + quantity, available), available }
            : line,
        )
      }
      return [
        ...prev,
        {
          product_id: product.product_id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
          size,
          quantity: Math.min(quantity, available),
          available,
        },
      ]
    })
    setIsOpen(true)
  }, [])

  const setQuantity = useCallback((productId: string, size: string, quantity: number) => {
    setLines((prev) =>
      prev.flatMap((line) => {
        if (line.product_id !== productId || line.size !== size) return [line]
        const next = Math.max(0, Math.min(quantity, line.available))
        return next === 0 ? [] : [{ ...line, quantity: next }]
      }),
    )
  }, [])

  const remove = useCallback((productId: string, size: string) => {
    setLines((prev) => prev.filter((l) => !(l.product_id === productId && l.size === size)))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const count = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines])
  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity * l.price, 0),
    [lines],
  )

  const value = useMemo(
    () => ({
      lines,
      count,
      subtotal,
      isOpen,
      add,
      setQuantity,
      remove,
      clear,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [lines, count, subtotal, isOpen, add, setQuantity, remove, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used inside <CartProvider>')
  return context
}
