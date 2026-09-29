import BulldogMark from './art/BulldogMark'

/** Placeholder testimonials for the storefront mock-up (not real customer quotes). */
const REVIEWS = [
  {
    quote:
      'Bought the Davenport crewneck for move-in and my daughter has basically lived in it since. Washed it a dozen times and the letters still look new.',
    name: 'Marisa T.',
    role: 'Yale parent, Class of ’28',
    stars: 5,
  },
  {
    quote:
      'Asked the chat if they had my hoodie in XL, got a straight answer in about four seconds. It said sold out and offered two other ones. Refreshing.',
    name: 'Devon K.',
    role: 'Grad student, SOM',
    stars: 5,
  },
  {
    quote:
      'Way better selection than the bookstore — they actually carry my residential college, not just the generic shield.',
    name: 'Priya R.',
    role: 'Class of ’26',
    stars: 5,
  },
]

function Stars({ count }: { count: number }) {
  return (
    <span className="stars" aria-label={`${count} out of 5 stars`}>
      {'★'.repeat(count)}
      <span className="stars__empty">{'★'.repeat(5 - count)}</span>
    </span>
  )
}

export default function Reviews() {
  return (
    <section className="section reviews">
      <div className="reviews__head">
        <span className="section__eyebrow">
          <BulldogMark size={22} /> What shoppers say
        </span>
        <h2>Loved by students, parents and a lot of alumni</h2>
      </div>
      <div className="grid-3">
        {REVIEWS.map((review) => (
          <figure key={review.name} className="review-card">
            <Stars count={review.stars} />
            <blockquote>“{review.quote}”</blockquote>
            <figcaption>
              <strong>{review.name}</strong>
              <span>{review.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="reviews__note">Sample testimonials shown for this storefront demo.</p>
    </section>
  )
}
