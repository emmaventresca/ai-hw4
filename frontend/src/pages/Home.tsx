import { Link } from 'react-router-dom'
import CampusScene from '../components/art/CampusScene'
import BulldogMark from '../components/art/BulldogMark'
import Reviews from '../components/Reviews'
import PromoStrip from '../components/PromoStrip'

const COLLECTIONS = [
  { emoji: '🏛️', title: 'Your college, your crest', body: 'All fourteen, from Benjamin Franklin to Trumbull. Rep the courtyard you actually lived in.', to: '/products?search=college' },
  { emoji: '🏒', title: 'Game day, sorted', body: 'Hockey, crew, squash, lacrosse. Left-chest logos for the subtle flex, big graphics for when subtlety is not the point.', to: '/products?search=sports' },
  { emoji: '🎁', title: 'Gifts that actually land', body: 'Yale Mom, Yale Dad, Yale Grandpa. The relatives who will wear it to the grocery store.', to: '/products?search=mom' },
]

export default function Home() {
  return (
    <>
      <section className="hero hero--art">
        <div className="hero__copy">
          <div className="hero__eyebrow">57 Broadway · New Haven</div>
          <h1 className="display">
            Wear the blue<br />like you mean it.
          </h1>
          <p>
            We're Campus Customs, the shop on Broadway that's been putting Yale on hoodies,
            crewnecks and tees for students, parents and anybody who yells for the Bulldogs.
            Officially licensed, built for a New Haven winter, soft enough to wear past graduation.
          </p>
          <div className="hero__actions">
            <Link to="/products" className="btn btn--light btn--lg">Shop the collection</Link>
            <Link to="/products?sort=price-asc" className="btn btn--outline btn--lg">Under $40</Link>
          </div>
          <p className="hero__meta">
            <span className="dot" /> 102 pieces in stock today · free pickup on Broadway
          </p>
        </div>
        <CampusScene className="hero__scene" />
      </section>

      <PromoStrip />

      <div className="container">
        <section className="section">
          <span className="section__eyebrow"><BulldogMark size={22} /> Find your people</span>
          <h2>Three ways in</h2>
          <div className="grid-3" style={{ marginTop: 22 }}>
            {COLLECTIONS.map((item) => (
              <Link key={item.title} to={item.to} className="card card--link">
                <span className="card__emoji" aria-hidden="true">{item.emoji}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <span className="card__cta">Browse →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section offer-banner">
          <div>
            <span className="offer-banner__tag">Students & parents</span>
            <h2>Ask the shop assistant anything</h2>
            <p>
              It reads the same stock list we do. Ask "what hoodies do you have in XL" and the
              matching pieces appear right here on the page — with honest prices and real stock.
            </p>
          </div>
          <BulldogMark size={92} paper="#1552a0" />
        </section>

        <Reviews />

        <section className="section">
          <h2>Come say hi</h2>
          <p className="section__lead">
            We're at <strong>57 Broadway</strong>, right in the middle of everything. Ordering
            online? Most pieces take 8–10 business days to get out the door. Questions about an
            order: <a href="mailto:orderdept@campuscustoms.com">orderdept@campuscustoms.com</a>.
          </p>
          <div style={{ marginTop: 20 }}>
            <Link to="/products" className="btn btn--primary btn--lg">Start browsing</Link>
          </div>
        </section>
      </div>
    </>
  )
}
