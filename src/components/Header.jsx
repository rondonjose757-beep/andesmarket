import { Link } from 'react-router-dom'
import { useCart } from '../state/CartProvider'

function CartButton() {
  const { itemCount } = useCart()
  return (
    <Link
      to="/carrito"
      aria-label="Ver carrito"
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.4 12.2a2 2 0 002 1.8h7.2a2 2 0 002-1.8L18 8H6M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
      </svg>
      {itemCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white ring-2 ring-brand-dark">
          {itemCount}
        </span>
      )}
    </Link>
  )
}

// Cabecera simple con degradado de marca — reemplaza el texto "AndesMarket"
// por tu logo (Link con <img>) en cuanto tengas el asset definitivo.
export default function Header() {
  return (
    <div
      className="relative overflow-hidden rounded-b-[28px] px-4 py-4 sm:px-6"
      style={{ background: 'linear-gradient(160deg, var(--color-brand-dark) 0%, var(--color-brand) 60%, var(--color-accent) 130%)' }}
    >
      <div className="relative mx-auto flex w-full max-w-3xl items-center justify-between">
        <Link to="/" className="text-lg font-black tracking-tight text-white">
          AndesMarket
        </Link>
        <CartButton />
      </div>
    </div>
  )
}
