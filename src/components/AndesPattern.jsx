// Cordilleras en curvas de nivel: textura decorativa de la marca.
const RIDGE =
  'M-20 150 C10 140 26 112 48 104 S78 118 96 96 S126 36 150 42 S182 96 204 90 S236 50 262 58 S300 112 326 104 S364 72 420 96'

export default function AndesPattern({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 240"
      preserveAspectRatio="xMaxYMin slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
    >
      {[0, 1, 2, 3, 4, 5, 6, 7].map((line) => (
        <path
          key={line}
          d={RIDGE}
          strokeWidth="1.1"
          vectorEffect="non-scaling-stroke"
          opacity={1 - line * 0.11}
          transform={`translate(0 ${line * 15}) scale(1 ${1 - line * 0.05})`}
        />
      ))}
    </svg>
  )
}
