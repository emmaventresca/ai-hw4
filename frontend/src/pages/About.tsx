import { Link } from 'react-router-dom'

export default function About() {
  return (
    <div className="container">
      <section className="hero">
        <div className="hero__eyebrow">About us</div>
        <h1>A Broadway shop with a lot of blue in it.</h1>
        <p>
          Campus Customs has been outfitting New Haven for years, and Yale Bulldog Blue is
          where all of that lands online. Same shop, same people, same enormous pile of
          sweatshirts — just easier to browse in your pajamas.
        </p>
      </section>

      <section className="section">
        <h2>What we're about</h2>
        <p className="section__lead">
          We think college gear should feel personal. Not "generic university bookstore"
          personal — actually personal. The crewneck with <em>your</em> college on it. The tee
          for the sport you've been playing since you were nine. The hoodie your dad will
          quietly steal over winter break and never give back.
        </p>
        <p className="section__lead">
          So we carry the deep cuts: all fourteen residential colleges, the varsity teams, the
          graduate and professional schools, the class-year pieces, and the whole family of
          relative gear that somehow always sells out around Parents' Weekend.
        </p>
      </section>

      <section className="section">
        <h2>How we do it</h2>
        <div className="grid-3" style={{ marginTop: 24 }}>
          <div className="card">
            <h3>Officially licensed</h3>
            <p>
              Every piece is licensed Yale merchandise. The shield is right, the blue is right,
              and it'll still be right after twenty washes.
            </p>
          </div>
          <div className="card">
            <h3>Made to be worn out</h3>
            <p>
              Heavyweight fleece, reverse-weave hoodies, tri-blend tees. We pick fabric that
              holds up to walking across campus in February.
            </p>
          </div>
          <div className="card">
            <h3>Honest about stock</h3>
            <p>
              Our sizes and quantities come straight off the shelf. No mystery backorders, no
              "we'll see." If it says two left in medium, there are two left in medium.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>The fine print, minus the print</h2>
        <p className="section__lead">
          <strong>Returns:</strong> 30 days from the day your order ships, as long as it's
          unworn with the original tags. If we got the order wrong, we cover the return
          shipping. Custom pieces are final sale, because they were made for you and only you.
        </p>
        <p className="section__lead">
          <strong>Shipping:</strong> most orders take 8–10 business days to process before they
          ship. Around the holidays and big sales it can run a little longer — we'll tell you
          rather than leave you guessing.
        </p>
        <p className="section__lead">
          <strong>Refunds</strong> land 2–10 business days after your return arrives, depending
          on your bank.
        </p>
      </section>

      <section className="section">
        <h2>Find us</h2>
        <p className="section__lead">
          <strong>57 Broadway, New Haven, CT 06511</strong>
          <br />
          <a href="mailto:orderdept@campuscustoms.com">orderdept@campuscustoms.com</a> · (475) 301-4205
        </p>
        <p className="section__lead">
          Stuck between two sizes, or hunting for something specific? Pop open the chat in the
          corner — it knows the catalogue inside out.
        </p>
        <div style={{ marginTop: 20 }}>
          <Link to="/products" className="btn btn--primary">See what's in stock</Link>
        </div>
      </section>
    </div>
  )
}
