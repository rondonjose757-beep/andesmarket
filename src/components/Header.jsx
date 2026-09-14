import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AndesPattern from './AndesPattern'
import BrandLogo from './BrandLogo'
import CartButton from './CartButton'
import SearchBar from './SearchBar'

function ProfileIcon() {
  return (
    <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
    </svg>
  )
}

// Cabecera verde con curvas de cordillera. El degradado es un fondo absoluto
// que se funde con la página: en Inicio las promociones quedan encima. El
// buscador y el carrito se quedan fijos al hacer scroll y se tiñen de verde.
export default function Header({ hero = false }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [stuck, setStuck] = useState(false)
  const sentinelRef = useRef(null)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return undefined
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  function search(event) {
    event.preventDefault()
    navigate(query.trim() ? `/catalogo?q=${encodeURIComponent(query.trim())}` : '/catalogo')
  }

  return (
    <>
      <div
        aria-hidden="true"
        className={`andes-hero pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden ${hero ? 'h-[390px] sm:h-[440px]' : 'h-[230px]'}`}
      >
        <AndesPattern className="text-white/25 [mask-image:linear-gradient(to_bottom,black_20%,transparent_70%)]" />
      </div>

      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pb-1 pt-[max(14px,env(safe-area-inset-top))] sm:px-6">
        <Link
          to="/"
          aria-label="AndesMarket, ir al inicio"
          className="block min-h-11 w-64 min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <BrandLogo />
        </Link>
        <Link
          to="/perfil"
          aria-label="Mi perfil"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-deep/35 text-white ring-1 ring-white/25 transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <ProfileIcon />
        </Link>
      </header>

      <div ref={sentinelRef} aria-hidden="true" className="h-2" />
      <div
        className={`sticky top-[env(safe-area-inset-top)] z-30 transition-[background-color,box-shadow] duration-300 before:absolute before:inset-x-0 before:bottom-full before:h-[env(safe-area-inset-top)] before:bg-inherit ${stuck ? 'bg-brand-strong shadow-float' : 'bg-transparent'}`}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-4 py-2.5 sm:px-6">
          <SearchBar query={query} onQueryChange={setQuery} onSubmit={search} placeholder="¿Qué quieres comprar hoy?" />
          <CartButton />
        </div>
      </div>
    </>
  )
}
