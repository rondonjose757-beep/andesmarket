import { computeDiscountedPrice, formatPrice } from '../lib/format'
import { useCart } from '../state/CartProvider'
import { useToast } from '../shared/components/Toast'

export default function ProductCard({ product, onSelect }) {
  const { addItem } = useCart()
  const notify = useToast()
  const discounted = computeDiscountedPrice(product)
  const hasDiscount = discounted < Number(product.price)
  const discountPct = hasDiscount ? Math.round((1 - discounted / Number(product.price)) * 100) : 0
  const outOfStock = product.stock != null && product.stock <= 0

  function handleQuickAdd(event) {
    event.stopPropagation()
    addItem({
      productId: product.id,
      productName: product.name,
      productImage: product.image_url,
      unitPrice: discounted,
    })
    notify(`${product.name} agregado al carrito.`, 'success')
  }

  return (
    <div className="rounded-[22px] bg-white p-2.5 shadow-md shadow-ink/10 transition-shadow hover:shadow-lg">
      <button
        type="button"
        onClick={() => onSelect(product)}
        aria-label={`Ver detalles de ${product.name}`}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-cream-dim">
          {product.image_url ? (
            <img src={product.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-cream-dim">
              <svg className="h-7 w-7 text-ink/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l1.5-3h15L21 7M3 7h18M3 7v12a1 1 0 001 1h16a1 1 0 001-1V7M9 11a3 3 0 006 0" />
              </svg>
            </div>
          )}

          {hasDiscount && (
            <span className="absolute left-2 top-2 z-10 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
              -{discountPct}%
            </span>
          )}

          {outOfStock && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
              <span className="rounded-full bg-ink/80 px-3 py-1 text-[11px] font-bold text-white">Agotado</span>
            </div>
          )}

          {product.category?.name && (
            <p className="absolute inset-x-0 bottom-0 z-10 truncate rounded-b-2xl bg-brand-dark/85 px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-[1px]">
              {product.category.name}
            </p>
          )}
        </div>
      </button>

      <div className="flex items-center justify-between gap-2 px-1 pb-0.5 pt-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{product.name}</p>
          <p className="text-sm font-semibold tabular-nums text-ink/80">
            {formatPrice(discounted)}
            {hasDiscount && <span className="ml-1 text-xs text-muted line-through">{formatPrice(product.price)}</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={outOfStock}
          aria-label={`Agregar ${product.name} al carrito`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-md shadow-brand/30 transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-cream active:scale-95 disabled:cursor-not-allowed disabled:bg-ink/15 disabled:shadow-none"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  )
}
