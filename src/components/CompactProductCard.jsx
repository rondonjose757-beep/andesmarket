import { computeDiscountedPrice, formatPrice } from '../lib/format'

// Tarjeta compacta vertical para carruseles horizontales (referencia: sección
// "Comprar" de Cashea) — imagen arriba, nombre y precio abajo. A diferencia de
// <ProductCard>, no tiene botón "+" de agregar rápido: al tocarla se abre el
// detalle del producto, igual que el resto de tarjetas de la app.
export default function CompactProductCard({ product, onSelect }) {
  const discounted = computeDiscountedPrice(product)
  const hasDiscount = discounted < Number(product.price)
  const discountPct = hasDiscount ? Math.round((1 - discounted / Number(product.price)) * 100) : 0
  const outOfStock = product.stock != null && product.stock <= 0

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      aria-label={`Ver ${product.name}`}
      className="flex w-[152px] shrink-0 snap-start flex-col gap-2 rounded-2xl bg-white p-3 text-left shadow-md shadow-ink/10 transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white ring-1 ring-ink/10">
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
            <span className="rounded-full bg-ink/80 px-2 py-1 text-[11px] font-bold text-white">Agotado</span>
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-bold leading-snug text-ink">{product.name}</p>
        <p className="mt-1 text-sm font-semibold tabular-nums text-ink">
          {formatPrice(discounted)}
          {hasDiscount && <span className="ml-1.5 text-xs font-medium text-ink/50 line-through">{formatPrice(product.price)}</span>}
        </p>
      </div>
    </button>
  )
}
