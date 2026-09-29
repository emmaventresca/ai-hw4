import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../auth'
import YaleMark from './art/YaleMark'
import { useCart } from '../cart'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'nav__link is-active' : 'nav__link'

export default function NavBar() {
  const { user, logout } = useAuth()
  const { count, open } = useCart()

  return (
    <header className="nav">
      <nav className="container nav__inner" aria-label="Main">
        <Link to="/" className="nav__brand">
          <YaleMark size={38} />
          <span className="nav__brand-text">
            Campus Customs
            <span>Yale Bulldog Blue</span>
          </span>
        </Link>

        <div className="nav__links">
          <NavLink to="/" className={linkClass} end>Home</NavLink>
          <NavLink to="/products" className={linkClass}>Products</NavLink>
          <NavLink to="/about" className={linkClass}>About Us</NavLink>

          <button type="button" className="nav__cart" onClick={open} aria-label={`Open bag, ${count} items`}>
            <span aria-hidden="true">🛍️</span>
            Bag
            {count > 0 && <span className="nav__cart-badge">{count}</span>}
          </button>

          {user ? (
            <span className="nav__user">
              <span className="nav__greeting">Hi, {user.first_name ?? user.name}</span>
              <button type="button" className="btn btn--light" onClick={logout}>
                Log out
              </button>
            </span>
          ) : (
            <>
              <NavLink to="/login" className={linkClass}>Login</NavLink>
              <NavLink
                to="/signup"
                className={({ isActive }) =>
                  isActive ? 'nav__link nav__link--cta is-active' : 'nav__link nav__link--cta'
                }
              >
                Create Account
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
