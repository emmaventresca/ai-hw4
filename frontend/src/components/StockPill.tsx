/** Stock badge. Thresholds are shared by the card and the detail page so the two
 *  never disagree about whether something is "low". */
export default function StockPill({ totalStock }: { totalStock: number }) {
  if (totalStock <= 0) return <span className="pill pill--out">Sold out</span>
  if (totalStock <= 10) return <span className="pill pill--low">Only {totalStock} left</span>
  return <span className="pill pill--in">In stock</span>
}
