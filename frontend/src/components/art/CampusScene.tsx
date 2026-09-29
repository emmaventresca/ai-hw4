/**
 * Harkness Tower and the Gothic rooflines around Old Campus, drawn as flat vector
 * artwork. Original illustration — deliberately not a stock photo, so the repo
 * carries no third-party image licensing and the art matches the site palette
 * exactly. Two small figures walk across the foreground to keep it human.
 */
export default function CampusScene({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 520 300"
      role="img"
      aria-label="Illustration of Harkness Tower and the Yale campus skyline at dusk"
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a2240" />
          <stop offset="100%" stopColor="#1d4b86" />
        </linearGradient>
        <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dce8f5" />
          <stop offset="100%" stopColor="#9fb9d4" />
        </linearGradient>
        <linearGradient id="stoneDim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b9cee4" />
          <stop offset="100%" stopColor="#7c9ab9" />
        </linearGradient>
      </defs>

      <rect width="520" height="300" fill="url(#sky)" />

      {/* stars */}
      <g fill="#ffffff" opacity="0.55">
        <circle cx="60" cy="38" r="1.5" /><circle cx="140" cy="22" r="1" />
        <circle cx="415" cy="30" r="1.4" /><circle cx="470" cy="62" r="1" />
        <circle cx="330" cy="18" r="1" /><circle cx="235" cy="34" r="1.2" />
      </g>
      <circle cx="440" cy="52" r="20" fill="#ffffff" opacity="0.16" />

      {/* left range of buildings */}
      <g fill="url(#stoneDim)">
        <rect x="0" y="172" width="86" height="104" />
        <path d="M0 172h86l-43-26z" />
        <rect x="96" y="196" width="60" height="80" />
        <path d="M96 196h60l-30-20z" />
      </g>

      {/* Harkness Tower */}
      <g>
        <rect x="216" y="92" width="72" height="184" fill="url(#stone)" />
        {/* buttress turrets */}
        <rect x="206" y="128" width="14" height="148" fill="url(#stoneDim)" />
        <rect x="284" y="128" width="14" height="148" fill="url(#stoneDim)" />
        <path d="M206 128l7-16 7 16z" fill="url(#stone)" />
        <path d="M284 128l7-16 7 16z" fill="url(#stone)" />
        {/* crown */}
        <path d="M216 92h72l-36-46z" fill="url(#stone)" />
        <rect x="228" y="78" width="6" height="16" fill="url(#stoneDim)" />
        <rect x="270" y="78" width="6" height="16" fill="url(#stoneDim)" />
        {/* clock */}
        <circle cx="252" cy="124" r="12" fill="#0a2240" opacity="0.82" />
        <circle cx="252" cy="124" r="12" fill="none" stroke="#f0c14b" strokeWidth="1.6" />
        <path d="M252 124v-7m0 7l5 3" stroke="#f0c14b" strokeWidth="1.6" strokeLinecap="round" />
        {/* lancet windows, lit */}
        <g fill="#f5d98b" opacity="0.9">
          <path d="M232 150h8v20a4 4 0 01-8 0z" />
          <path d="M264 150h8v20a4 4 0 01-8 0z" />
          <path d="M232 190h8v20a4 4 0 01-8 0z" />
          <path d="M264 190h8v20a4 4 0 01-8 0z" />
          <path d="M246 228h12v24h-12z" opacity="0.75" />
        </g>
      </g>

      {/* right range */}
      <g fill="url(#stoneDim)">
        <rect x="318" y="182" width="96" height="94" />
        <path d="M318 182h96l-48-24z" />
        <rect x="424" y="204" width="96" height="72" />
        <path d="M424 204h96l-48-20z" />
      </g>
      <g fill="#f5d98b" opacity="0.75">
        <rect x="336" y="206" width="9" height="13" /><rect x="360" y="206" width="9" height="13" />
        <rect x="384" y="206" width="9" height="13" /><rect x="444" y="226" width="9" height="12" />
        <rect x="470" y="226" width="9" height="12" /><rect x="496" y="226" width="9" height="12" />
        <rect x="20" y="198" width="9" height="14" /><rect x="46" y="198" width="9" height="14" />
        <rect x="112" y="220" width="8" height="12" /><rect x="132" y="220" width="8" height="12" />
      </g>

      {/* courtyard trees */}
      <g fill="#14532d" opacity="0.85">
        <circle cx="172" cy="252" r="17" /><rect x="170" y="256" width="4" height="22" fill="#3b2a1c" />
        <circle cx="330" cy="256" r="14" /><rect x="328" y="260" width="4" height="18" fill="#3b2a1c" />
      </g>

      {/* ground */}
      <rect x="0" y="276" width="520" height="24" fill="#0a1a2f" />

      {/* two figures walking — a parent and a student */}
      <g fill="#0a1a2f" opacity="0.95">
        <circle cx="238" cy="262" r="4" />
        <path d="M238 266c4 0 6 3 6 7v5h-12v-5c0-4 2-7 6-7z" />
        <circle cx="254" cy="264" r="3.4" />
        <path d="M254 268c3.4 0 5 2.6 5 6v4h-10v-4c0-3.4 1.6-6 5-6z" />
      </g>
    </svg>
  )
}
