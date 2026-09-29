import { Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import ChatWidget from './components/ChatWidget'
import ChatResults from './components/ChatResults'
import CartDrawer from './components/CartDrawer'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import About from './pages/About'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Login from './pages/Login'
import Signup from './pages/Signup'

export default function App() {
  return (
    <div className="shell">
      <ScrollToTop />
      <NavBar />
      {/* Sits above the router, so chat results stay on screen while the shopper
          clicks through to a product detail page and back. */}
      <ChatResults />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:productId" element={<ProductDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="*"
            element={<div className="container state">That page doesn’t exist.</div>}
          />
        </Routes>
      </main>
      <footer className="footer">
        <div className="container footer__inner">
          <span>Campus Customs · 57 Broadway, New Haven, CT 06511</span>
          <span><a href="mailto:orderdept@campuscustoms.com">orderdept@campuscustoms.com</a></span>
        </div>
      </footer>
      <ChatWidget />
      <CartDrawer />
    </div>
  )
}
