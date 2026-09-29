interface Props {
  size?: number
  /** Background colour the mark sits on, used for the muzzle and eyes so the
   *  face reads on a dark banner as well as on white. */
  paper?: string
}

/** Handsome Dan, drawn as a flat two-tone mark. Original artwork. */
export default function BulldogMark({ size = 40, paper = '#ffffff' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Bulldog mascot">
      {/* ears */}
      <path d="M14 22c-4-6 0-11 5-9l5 4z" fill="currentColor" />
      <path d="M50 22c4-6 0-11-5-9l-5 4z" fill="currentColor" />
      {/* head */}
      <path d="M32 13c11 0 18 7 18 17 0 11-8 19-18 19s-18-8-18-19c0-10 7-17 18-17z" fill="currentColor" />
      {/* brow shadow */}
      <path d="M20 24c3-3 7-4 12-4s9 1 12 4" stroke={paper} strokeWidth="1.8" fill="none"
        strokeLinecap="round" opacity="0.55" />
      {/* eyes */}
      <circle cx="25" cy="28" r="3" fill={paper} />
      <circle cx="39" cy="28" r="3" fill={paper} />
      <circle cx="25.8" cy="28.6" r="1.3" fill="currentColor" />
      <circle cx="39.8" cy="28.6" r="1.3" fill="currentColor" />
      {/* muzzle */}
      <ellipse cx="32" cy="40" rx="12" ry="8.5" fill={paper} />
      {/* nose */}
      <path d="M32 34.5c2.4 0 3.8 1.4 3.8 2.8S34 39.8 32 39.8s-3.8-1.1-3.8-2.5 1.4-2.8 3.8-2.8z"
        fill="currentColor" />
      {/* mouth */}
      <path d="M32 39.8v2.4m0 0c0 1.8-1.8 2.8-3.6 2.8m3.6-2.8c0 1.8 1.8 2.8 3.6 2.8"
        stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* collar */}
      <path d="M18 47c4 3 9 4.6 14 4.6S42 50 46 47" stroke="currentColor" strokeWidth="3.6"
        fill="none" strokeLinecap="round" />
    </svg>
  )
}
