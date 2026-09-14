import { computeDiscountedPrice, formatPrice } from '../lib/format'
import { productTone } from '../lib/tones'
import { useCart } from '../state/CartProvider'
import ProductImage from './ProductImage'

function PlusIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
      <path strokeLinecap="round" d="M5 12h14" />
    </svg>
  )
}

// Ficha tipo góndola: foto sobre el tono del departamento, precio en la
// esquina recortada y compra directa flotando sobre la foto.
export default function ProductCard({ product, onSelect, compact = false, tone }) {
  const { items, addItem, updateQuantity } = useCart()
  const price = computeDiscountedPrice(product)
  const hasDiscount = price < Number(product.price)
  const discountPct = hasDiscount ? Math.round((1 - price / Number(product.price)) * 100) : 0
  const outOfStock = product.stock != null && product.stock <= 0
  const quantity = items.find((item) => item.productId === product.id)?.quantity ?? 0

  function add() {
    if (outOfStock) return
    addItem({ productId: product.id, productName: product.name, productImage: product.image_url, unitPrice: price })
  }

  return (
    <article
      className={`tone-${tone ?? productTone(product)} group flex min-w-0 flex-col rounded-[24px] bg-white p-1.5 shadow-card ${compact ? 'w-[152px] shrink-0 snap-start sm:w-[176px]' : 'w-full'}`}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => onSelect(product)}
          aria-label={`Ver ${product.name}`}
          className="block w-full rounded-[19px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark focus-visible:ring-offset-2"
        >
          <div className="relative aspect-square overflow-hidden rounded-[19px] bg-(--tone-media)">
            <div
              className={`absolute inset-0 px-4 pb-6 pt-8 transition-transform duration-500 ease-out-soft group-hover:-rotate-3 group-hover:scale-105 ${outOfStock ? 'opacity-60 grayscale' : ''}`}
            >
              <ProductImage src={product.image_url} />
            </div>
            {hasDiscount && (
              <span className="absolute left-2 top-2 rounded-full bg-accent-dark px-2 py-1 text-[11px] font-extrabold leading-none text-white">
                −{discountPct}%
              </span>
            )}
            {outOfStock && (
              <span className="absolute bottom-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-muted">
                Agotado
              </span>
            )}
          </div>
        </button>

        <p className="price-notch pointer-events-none pb-2 pl-2.5 pr-2 pt-1 font-display text-[17px] font-extrabold leading-none tracking-tight tabular-nums text-ink">
          {formatPrice(price)}
        </p>

        <div className="absolute bottom-2 right-2">
          {quantity > 0 ? (
            <div className="flex animate-pop-in items-center rounded-full bg-white p-0.5 shadow-lg shadow-ink/15">
              <button
                type="button"
                aria-label={`Quitar una unidad de ${product.name}`}
                onClick={() => updateQuantity(product.id, quantity - 1)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-brand-dark transition active:scale-90 hover:bg-brand-light focus-visible:outline-2 focus-visible:outline-brand-dark"
              >
                <MinusIcon />
              </button>
              <span
                aria-live="polite"
                aria-label={`${quantity} en el carrito`}
                className="min-w-5 text-center font-display text-base font-extrabold tabular-nums text-ink"
              >
                {quantity}
              </span>
              <button
                type="button"
                aria-label={`Agregar una unidad de ${product.name}`}
                onClick={add}
                disabled={outOfStock}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-dark text-white transition active:scale-90 hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark disabled:opacity-40"
              >
                <PlusIcon />
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label={`Agregar ${product.name}`}
              onClick={add}
              disabled={outOfStock}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-dark text-white shadow-float ring-4 ring-white/70 transition hover:bg-brand-deep active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 disabled:shadow-none"
            >
              <PlusIcon />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-2">
        <button
          type="button"
          onClick={() => onSelect(product)}
          className="min-h-11 text-left text-[13.5px] font-semibold leading-snug text-ink focus-visible:rounded focus-visible:outline-2 focus-visible:outline-brand-dark"
        >
          <span className="line-clamp-2">{product.name}</span>
        </button>
        {hasDiscount && (
          <p className="text-xs tabular-nums text-muted">
            Antes <del>{formatPrice(product.price)}</del>
          </p>
        )}
      </div>
    </article>
  )
}
