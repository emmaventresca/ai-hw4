import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Send the shopper to the top on navigation, so a product page doesn't open
 *  scrolled past its own image when the chat results strip is on screen. */
export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])
  return null
}
