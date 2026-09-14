import { Link } from 'react-router-dom'
import AndesPattern from './AndesPattern'
import BrandLogo from './BrandLogo'
import CartButton from './CartButton'
import SearchBar from './SearchBar'

// Cabecera verde del catálogo. Casi toda la fila superior (52 de 60 px) sale
// de pantalla al hacer scroll y quedan fijos el buscador y los departamentos.
export default function CatalogHeader({ query, onQueryChange, categories, activeCategoryId, onSelectCategory }) {
  return (
    <header className="andes-bar sticky top-[-52px] z-30 overflow-hidden rounded-br-[32px] pt-[env(safe-area-inset-top)] text-white shadow-float">
      <AndesPattern className="text-white/15 [mask-image:linear-gradient(to_bottom,black,transparent_65%)]" />
      <div className="relative mx-auto flex h-[60px] max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Link
          to="/"
          aria-label="Volver al inicio"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-deep/35 ring-1 ring-white/25 transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M19 12H5m6-6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-44">
            <BrandLogo />
          </div>
        </div>
        <CartButton />
      </div>
      <div className="relative mx-auto max-w-5xl px-4 pb-3 sm:px-6">
        <SearchBar
          query={query}
          onQueryChange={onQueryChange}
          onSubmit={(event) => event.preventDefault()}
          placeholder="Buscar en AndesMarket"
        />
      </div>
      <nav
        aria-label="Categorías"
        className="scrollbar-hide relative mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 pb-3.5 sm:px-6"
      >
        {[{ id: 'all', name: 'Todo' }, ...categories].map((category) => {
          const active = activeCategoryId === category.id
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectCategory(category.id)}
              className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${active ? 'bg-white text-brand-deep shadow-md shadow-brand-deep/30' : 'bg-brand-deep/40 text-white ring-1 ring-white/15 hover:bg-brand-deep/60'}`}
            >
              {category.name}
            </button>
          )
        })}
      </nav>
    </header>
  )
}
