/** Rotating value props — the reasons to buy here rather than the bookstore. */
const PROMOS = [
  { icon: '🎓', title: 'All 14 residential colleges', body: 'Not just the generic shield.' },
  { icon: '🚚', title: 'Free pickup on Broadway', body: 'Skip shipping, grab it same week.' },
  { icon: '🐶', title: 'Officially licensed', body: 'Real Yale blue, real quality.' },
  { icon: '↩️', title: '30-day returns', body: 'Unworn with tags, no fuss.' },
]

export default function PromoStrip() {
  return (
    <aside className="promo-strip" aria-label="Why shop with us">
      <div className="container promo-strip__inner">
        {PROMOS.map((promo) => (
          <div key={promo.title} className="promo">
            <span className="promo__icon" aria-hidden="true">{promo.icon}</span>
            <span className="promo__text">
              <strong>{promo.title}</strong>
              <span>{promo.body}</span>
            </span>
          </div>
        ))}
      </div>
    </aside>
  )
}
