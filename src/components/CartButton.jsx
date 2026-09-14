import { Link } from 'react-router-dom'
import { useCart } from '../state/CartProvider'

function BagIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5.5 8h13l-1 12.5a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5Z" />
      <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" />
    </svg>
  )
}

// Acceso al carrito sobre las cabeceras verdes, incluso cuando está vacío.
export default function CartButton() {
  const { itemCount } = useCart()

  return (
    <Link
      to="/carrito"
      aria-label={`Ver carrito${itemCount > 0 ? `, ${itemCount} producto${itemCount === 1 ? '' : 's'}` : ''}`}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-deep/35 text-white ring-1 ring-white/25 transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <BagIcon />
      {itemCount > 0 && (
        <span
          key={itemCount}
          className="absolute -right-1 -top-1 flex h-5 min-w-5 animate-bump items-center justify-center rounded-full bg-white px-1 text-[11px] font-extrabold tabular-nums text-brand-dark shadow-md shadow-brand-deep/20"
        >
          {itemCount}
        </span>
      )}
    </Link>
  )
}
