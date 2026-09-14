import { Link } from 'react-router-dom'
import { useCart } from '../state/CartProvider'

function BagIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

// Acceso al carrito reutilizado en cualquier cabecera sobre fondo verde de marca.
export default function CartButton() {
  const { itemCount } = useCart()

  return (
    <Link
      to="/carrito"
      aria-label={`Ver carrito${itemCount > 0 ? `, ${itemCount} producto${itemCount === 1 ? '' : 's'}` : ''}`}
      className="relative shrink-0 text-white transition-transform active:scale-90"
    >
      <BagIcon />
      {itemCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold text-white ring-2 ring-brand">
          {itemCount}
        </span>
      )}
    </Link>
  )
}
