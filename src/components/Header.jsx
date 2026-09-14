import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CartButton from './CartButton'
import SearchBar from './SearchBar'

// Cabecera estilo "hero" (referencia: Mercado Libre): verde de marca sólido
// que se difumina hacia transparente en la parte inferior, para que el
// carrusel de banners de HomePage se superponga a ese difuminado. Al hacer
// scroll y perder de vista la fila del logo, aparece una barra compacta fija
// (solo buscador + carrito) para mantener la búsqueda siempre a mano.
export default function Header() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [showCompactBar, setShowCompactBar] = useState(false)
  const logoRowRef = useRef(null)

  function handleSearchSubmit(event) {
    event.preventDefault()
    const trimmed = query.trim()
    navigate(trimmed ? `/catalogo?q=${encodeURIComponent(trimmed)}` : '/catalogo')
  }

  useEffect(() => {
    const node = logoRowRef.current
    if (!node) return undefined

    const observer = new IntersectionObserver(([entry]) => setShowCompactBar(!entry.isIntersecting), { threshold: 0 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div
        className={`fixed inset-x-0 top-0 z-50 bg-brand shadow-md shadow-ink/10 transition-transform duration-200 ${
          showCompactBar ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <SearchBar query={query} onQueryChange={setQuery} onSubmit={handleSearchSubmit} />
          <CartButton />
        </div>
      </div>

      <div
        className="relative pb-[272px] sm:pb-[320px]"
        style={{ background: 'linear-gradient(to bottom, var(--color-brand) 0%, var(--color-brand) 26%, transparent 100%)' }}
      >
        <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-4 sm:px-6">
          <div ref={logoRowRef} className="flex items-center justify-between">
            <Link to="/" className="text-xl font-black tracking-tight text-white">
              AndesMarket
            </Link>
            <CartButton />
          </div>

          <SearchBar query={query} onQueryChange={setQuery} onSubmit={handleSearchSubmit} />
        </div>
      </div>
    </>
  )
}
