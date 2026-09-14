import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../state/CartProvider'
import { formatPrice } from '../lib/format'

export default function FloatingCart() {
  const { itemCount, grandTotal } = useCart()
  const { pathname } = useLocation()
  if (!itemCount || pathname === '/carrito') return null
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-linear-to-t from-cream via-cream/85 to-transparent px-4 pt-8"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <Link
        to="/carrito"
        aria-label={`Ver carrito, ${itemCount} producto${itemCount === 1 ? '' : 's'}, ${formatPrice(grandTotal)}`}
        className="group pointer-events-auto relative mx-auto flex min-h-[60px] w-full max-w-xl animate-sheet-up items-center gap-3 overflow-hidden rounded-full bg-brand-deep py-2 pl-2 pr-3 text-white shadow-float ring-1 ring-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
      >
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-2/3 bg-linear-to-r from-brand-dark to-transparent" />
        <span aria-hidden="true" className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-deep">
          <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5.5 8h13l-1 12.5a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5Z" />
            <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" />
          </svg>
          <span
            key={itemCount}
            className="absolute -right-1.5 -top-1 flex h-5 min-w-5 animate-bump items-center justify-center rounded-full bg-accent-dark px-1 text-[11px] font-extrabold tabular-nums text-white ring-2 ring-brand-deep"
          >
            {itemCount}
          </span>
        </span>
        <span aria-hidden="true" className="relative flex-1 text-[15px] font-bold">
          Ver carrito
        </span>
        <span aria-hidden="true" className="relative font-display text-lg font-extrabold tracking-tight tabular-nums">
          {formatPrice(grandTotal)}
        </span>
        <span
          aria-hidden="true"
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </span>
      </Link>
    </div>
  )
}
