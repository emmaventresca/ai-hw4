import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Product } from './types'

/**
 * The products the shop assistant most recently found.
 *
 * This is what makes a chat answer update the *page* rather than only the panel.
 * `ChatWidget` publishes the `products` array from the `/api/chat` response here;
 * `ChatResults` (rendered above the routed page in `App`) subscribes and draws them
 * as ordinary product cards.
 *
 * Because the strip lives above the router, it survives navigation — clicking a card
 * opens the Problem 3 detail page with the results still on screen.
 */
interface ChatResultsValue {
  products: Product[]
  /** What the shopper asked, shown as context above the cards. */
  query: string | null
  publish: (query: string, products: Product[]) => void
  clear: () => void
}

const ChatResultsContext = createContext<ChatResultsValue | null>(null)

export function ChatResultsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState<string | null>(null)

  const publish = useCallback((nextQuery: string, nextProducts: Product[]) => {
    // A reply with no product lookups (a greeting, a policy question) shouldn't wipe
    // the cards the shopper is still looking at.
    if (nextProducts.length === 0) return
    setQuery(nextQuery)
    setProducts(nextProducts)
  }, [])

  const clear = useCallback(() => {
    setProducts([])
    setQuery(null)
  }, [])

  const value = useMemo(
    () => ({ products, query, publish, clear }),
    [products, query, publish, clear],
  )

  return <ChatResultsContext.Provider value={value}>{children}</ChatResultsContext.Provider>
}

export function useChatResults(): ChatResultsValue {
  const context = useContext(ChatResultsContext)
  if (!context) throw new Error('useChatResults must be used inside <ChatResultsProvider>')
  return context
}
