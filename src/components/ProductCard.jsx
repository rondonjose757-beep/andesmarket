import { computeDiscountedPrice, formatPrice } from '../lib/format'

export default function ProductCard({ product, onSelect }) {
  const discounted = computeDiscountedPrice(product)
  const hasDiscount = discounted < Number(product.price)
  const discountPct = hasDiscount ? Math.round((1 - discounted / Number(product.price)) * 100) : 0
  const outOfStock = product.stock != null && product.stock <= 0

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      aria-label={`Ver ${product.name}`}
      className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-md shadow-ink/10 transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:gap-4 sm:p-4"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-ink/10 sm:h-28 sm:w-28">
        {product.image_url ? (
          <img src={product.image_url} alt="" className="h-full w-full object-contain p-2" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-cream-dim">
            <svg className="h-8 w-8 text-ink/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l1.5-3h15L21 7M3 7h18M3 7v12a1 1 0 001 1h16a1 1 0 001-1V7M9 11a3 3 0 006 0" />
            </svg>
          </div>
        )}

        {hasDiscount && (
          <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white shadow-sm">
            -{discountPct}%
          </span>
        )}

        {outOfStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <span className="rounded-full bg-ink/80 px-2.5 py-1 text-xs font-bold text-white">Agotado</span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-base font-bold leading-snug text-ink sm:text-lg">{product.name}</p>
        <p className="mt-1 text-base font-semibold tabular-nums text-ink sm:text-lg">
          {formatPrice(discounted)}
          {hasDiscount && <span className="ml-2 text-sm font-medium text-ink/60 line-through">{formatPrice(product.price)}</span>}
        </p>
      </div>

      <span
        aria-hidden="true"
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-md shadow-brand/30 ${
          outOfStock ? 'bg-ink/15' : 'bg-brand'
        }`}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
      </span>
    </button>
  )
}
