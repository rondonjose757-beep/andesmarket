import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../state/CartProvider'

// Único acceso al carrito en toda la app: un botón flotante que solo
// aparece cuando hay algo que ver, para no ocupar pantalla de más, y se
// oculta en la propia página del carrito para no ser redundante.
export default function FloatingCart() {
  const { itemCount } = useCart()
  const { pathname } = useLocation()

  if (itemCount === 0 || pathname === '/carrito') return null

  return (
    <Link
      to="/carrito"
      aria-label={`Ver carrito, ${itemCount} producto${itemCount === 1 ? '' : 's'}`}
      className="fixed bottom-6 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-xl shadow-brand-dark/30 transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.4 12.2a2 2 0 002 1.8h7.2a2 2 0 002-1.8L18 8H6M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
      </svg>
      <span className="absolute -right-1 -top-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-ink px-1.5 text-sm font-bold text-white ring-2 ring-cream">
        {itemCount}
      </span>
    </Link>
  )
}
