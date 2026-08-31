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

function SearchIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
    </svg>
  )
}

// Cabecera estilo "hero" (referencia: Mercado Libre): verde de marca sólido
// que se difumina hacia transparente en la parte inferior, para que el
// carrusel de banners de HomePage se superponga a ese difuminado.
export default function Header() {
  const { itemCount } = useCart()

  return (
    <div
      className="relative pb-[272px] sm:pb-[320px]"
      style={{ background: 'linear-gradient(to bottom, var(--color-brand) 0%, var(--color-brand) 26%, transparent 100%)' }}
    >
      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-4 sm:px-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl font-black tracking-tight text-white">
            AndesMarket
          </Link>
          <Link
            to="/carrito"
            aria-label={`Ver carrito${itemCount > 0 ? `, ${itemCount} producto${itemCount === 1 ? '' : 's'}` : ''}`}
            className="relative text-white transition-transform active:scale-90"
          >
            <BagIcon />
            {itemCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold text-white ring-2 ring-brand">
                {itemCount}
              </span>
            )}
          </Link>
        </div>

        <Link
          to="/catalogo"
          className="flex items-center gap-2.5 rounded-full bg-white px-4 py-3 text-ink/40 shadow-sm transition-transform active:scale-[0.99]"
        >
          <SearchIcon />
          <span className="truncate text-[15px] font-medium">¿Qué quieres comprar hoy?</span>
        </Link>
      </div>
    </div>
  )
}
