/** The shop's wordmark "Y", set in Times New Roman for a collegiate, engraved feel. */
export default function YaleMark({ size = 34 }: { size?: number }) {
  return (
    <span className="yale-mark" style={{ width: size, height: size, fontSize: size * 0.72 }}>
      Y
    </span>
  )
}
