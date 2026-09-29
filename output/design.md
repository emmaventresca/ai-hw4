# Design

What we changed to make the site feel like a real Broadway storefront rather than a database
with a form on top — and why each change should help a shopper stick around and buy.

All artwork is **original vector illustration drawn for this project**. No stock photos, no
third-party image assets, so the repo carries no licensing baggage and the art matches the
palette exactly.

---

## 1. A collegiate typographic voice

**Changed.** Headings are now set in a serif (Iowan Old Style / Palatino / Georgia), body copy
stays in Inter, and the brand mark is a **"Y" in Times New Roman** inside a hairline box in the
navbar. Section labels are small-caps eyebrows in Yale blue.

**Why it sells.** Serif headlines read as *institutional and trustworthy* — the same reason
diplomas and college crests use them. Pairing that with a clean sans for body text keeps it
readable rather than stuffy. The Times New Roman Y gives the shop a mark a shopper can
recognise on a hangtag, which is what separates a brand from a web page.

## 2. Harkness Tower hero illustration

**Changed.** The home hero is a two-column layout: headline and copy on the left, an original
illustration of **Harkness Tower and the Gothic rooflines of Old Campus at dusk** on the right
— lit lancet windows, a gold clock face, courtyard trees, and two small figures walking
through, a parent and a student.

**Why it sells.** People buying Yale merchandise are buying a *place* and a memory, not a
garment. Showing the campus at dusk with two people walking across it puts the shopper in the
scene before they see a single price. The two figures are deliberate: this shop sells to
parents as much as students, and they should see themselves on the page.

## 3. A live, honest hero stat

**Changed.** Under the hero buttons: a pulsing green dot and "**102 pieces in stock today ·
free pickup on Broadway**".

**Why it sells.** It signals the shop is real and current, not a dormant catalogue. The green
pulse is the same visual language as "open now", which creates gentle urgency without a fake
countdown timer.

## 4. Value-prop strip: why here, not the bookstore

**Changed.** A navy strip directly under the hero with four props: *all 14 residential
colleges · free pickup on Broadway · officially licensed · 30-day returns*.

**Why it sells.** This answers the shopper's real question — "why not just walk to the
bookstore?" — in the first screen. "All 14 residential colleges" is the genuine differentiator:
the bookstore sells the generic shield, we sell the courtyard you actually lived in. Returns
and licensing remove the two biggest objections to buying apparel online.

## 5. Social proof

**Changed.** A three-card review section with star ratings and named shoppers — a parent, a
grad student and an undergrad. One review specifically praises the chat assistant for saying
something was sold out.

**Why it sells.** Reviews are the highest-converting element on most retail pages. Splitting
them across parent / grad / undergrad lets each visitor find themselves. Highlighting an
*honest* answer as a positive turns our biggest constraint — the agent tells you when things
are out of stock — into a selling point. *(These are placeholder testimonials for the demo,
labelled as such on the page.)*

## 6. Handsome Dan as a two-tone mark

**Changed.** An original flat bulldog mark appears in the section eyebrows, the chat launcher,
the chat panel header, and large on the assistant banner. It takes a `paper` colour so the face
reads correctly on white and on dark blue alike.

**Why it sells.** It gives the chatbot a face, which measurably increases the chance a shopper
opens it, and it carries the Bulldogs identity through the site without using a licensed logo.

## 7. Product presentation

**Changed.** Cards sit on white with a 1:1 image well, a blue category eyebrow, name, short
description, price and a **colour-coded stock badge** — green "In stock", amber "Only N left",
grey "Sold out". Cards lift on hover and **stagger-fade in** as results load. The detail page
is a two-column split: large sticky image on one side, full text and a per-size stock table on
the other.

**Why it sells.** The amber "Only 2 left" badge is honest scarcity taken straight from the
database — it nudges a decision without inventing pressure. The stagger animation makes a
search feel fast even before it is. The sticky image keeps the product visible while the
shopper reads the size table, which is exactly when they decide.

## 8. Chat that feels like a person at the counter

**Changed.** The panel has the bulldog avatar, a bouncing three-dot typing indicator, bold and
bulleted markdown, and product cards under each reply. Its results also publish to a **"From
your chat" rail across the top of the page**, captioned with the question asked.

**Why it sells.** Answers that *change the page* make the assistant feel like a salesperson
pulling things off the rack rather than a help widget. Because those cards are the same
component as the grid, clicking one opens the full product page — the conversation leads
straight into the funnel instead of dead-ending in a bubble.

## 9. Motion, restrained

**Changed.** Card hover lift, staggered result entry, the results rail sliding in, the pulsing
stock dot, typing dots. Everything is short (≤360 ms), and all of it is disabled under
`prefers-reduced-motion`.

**Why it sells.** Motion tells the shopper their action worked. Keeping it under a third of a
second keeps the site feeling quick rather than showy, and honouring the reduced-motion setting
means it never makes anyone ill.

---

## Colour

| Token | Use |
| --- | --- |
| Yale blue `#00356b` | Navigation, primary buttons, brand |
| Navy `#0a2240` | Headings, footer, value strip |
| Bright blue `#286dc0` | Eyebrows, links, focus rings |
| Light blue `#e6f0f9` / `#f4f9fd` | Page ground and image wells |
| Green `#1f7a4d` | **Reserved for in-stock status only** |
| Amber `#8a5a00` | Low stock |

Green is never used decoratively. If something is green on this site, it means you can buy it —
so a shopper learns to scan for it.

**Screenshots:** `app_check_images/home_design.jpg`, `app_check_images/reviews_offers.jpg`.
