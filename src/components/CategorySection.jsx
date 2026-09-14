import { useId } from 'react'
import { Link } from 'react-router-dom'
import CompactProductCard from './CompactProductCard'
import ProductFan from './ProductFan'

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  )
}

// Sección horizontal con las mismas fichas y controles que el catálogo. Con
// `look` se dibuja como góndola del departamento (tono, abanico y pie).
export default function CategorySection({ title, to, products, onSelect, look, eyebrow, total }) {
  const titleId = useId()
  if (products.length === 0) return null

  const track = (
    <div
      className={`scrollbar-hide flex snap-x gap-2.5 overflow-x-auto pb-3 pt-1 ${look ? 'scroll-px-5 px-5' : '-mx-4 scroll-px-4 px-4 sm:mx-0 sm:px-0'}`}
    >
      {products.map((product) => (
        <CompactProductCard key={product.id} product={product} onSelect={onSelect} tone={look?.tone} />
      ))}
    </div>
  )

  if (!look) {
    return (
      <section aria-labelledby={titleId}>
        <div className="mb-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-dark">{eyebrow}</p>
            )}
            <h2 id={titleId} className="mt-1 font-display text-2xl font-extrabold leading-tight tracking-[-0.03em] text-ink">
              {title}
            </h2>
          </div>
          <Link
            to={to}
            className="flex min-h-11 shrink-0 items-center gap-1 text-sm font-extrabold text-brand-dark hover:underline"
          >
            Ver todo <ArrowIcon />
          </Link>
        </div>
        {track}
      </section>
    )
  }

  return (
    <section
      aria-labelledby={titleId}
      className={`tone-${look.tone} relative rounded-[28px] rounded-tr-[88px] bg-(--tone-shelf) pt-6`}
    >
      <div className="flex items-start gap-2 px-5 pb-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-(--tone-deep)">{eyebrow}</p>
          <h2
            id={titleId}
            className="mt-1.5 break-words font-display text-[30px] font-extrabold leading-[0.95] tracking-[-0.035em] text-ink"
          >
            {title}
          </h2>
          <p className="mt-2 text-[13px] leading-snug text-ink/70">{look.caption}</p>
        </div>
        <ProductFan products={products} />
      </div>
      {track}
      <div className="flex items-center justify-between gap-3 px-5 pb-2">
        <span className="text-xs font-bold text-(--tone-deep)">
          {total} producto{total === 1 ? '' : 's'}
        </span>
        <Link
          to={to}
          className="group flex min-h-11 items-center gap-1.5 text-sm font-extrabold text-ink focus-visible:rounded focus-visible:outline-2 focus-visible:outline-(--tone-deep)"
        >
          Ver todo<span className="sr-only"> en {title}</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white transition-transform group-hover:translate-x-0.5">
            <ArrowIcon />
          </span>
        </Link>
      </div>
    </section>
  )
}
