import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import CartButton from './CartButton'
import SearchBar from './SearchBar'

function BackIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function AllCategoriesIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function TopRow({ title, innerRef }) {
  return (
    <div ref={innerRef} className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to="/"
          aria-label="Volver al inicio"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-transform active:scale-90"
        >
          <BackIcon />
        </Link>
        <h1 className="min-w-0 truncate text-xl font-black text-white">{title}</h1>
      </div>
      <CartButton />
    </div>
  )
}

// `light` = chips sobre fondo verde (barra fija); si no, sobre el fondo
// crema de la página (fila normal, debajo del hero).
function ChipsRow({ categories, products, activeCategoryId, onSelectCategory, light }) {
  const chips = categories.map((category) => {
    const sample = products.find((p) => p.category?.id === category.id && p.image_url)
    return { id: category.id, name: category.name, image: sample?.image_url ?? null }
  })

  const labelClass = light ? 'text-white' : 'text-ink/70'
  const activeRingClass = light ? 'ring-2 ring-white' : 'ring-2 ring-brand'
  const inactiveRingClass = light ? 'ring-white/30' : 'ring-ink/5'

  return (
    <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-1">
      <button type="button" onClick={() => onSelectCategory('all')} className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 text-ink/60 transition-transform active:scale-95 ${
            activeCategoryId === 'all' ? activeRingClass : inactiveRingClass
          }`}
        >
          <AllCategoriesIcon />
        </div>
        <span className={`line-clamp-2 text-xs font-semibold leading-tight ${labelClass}`}>Todas</span>
      </button>

      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onSelectCategory(chip.id)}
          className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center"
        >
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 transition-transform active:scale-95 ${
              activeCategoryId === chip.id ? activeRingClass : inactiveRingClass
            }`}
          >
            {chip.image ? <img src={chip.image} alt="" className="h-full w-full object-contain" /> : <AllCategoriesIcon />}
          </div>
          <span className={`line-clamp-2 text-xs font-semibold leading-tight ${labelClass}`}>{chip.name}</span>
        </button>
      ))}
    </div>
  )
}

// Cabecera propia de /catalogo, mismo mecanismo que el Header del Home:
// hero verde difuminado (flecha + título + carrito, buscador) que se
// desplaza con la página, y al perder de vista esa fila superior aparece
// una barra fija con la cabecera y los chips de categoría — el buscador no
// se repite ahí, desaparece al hacer scroll como pidió el usuario.
export default function CatalogHeader({ title, query, onQueryChange, categories, products, activeCategoryId, onSelectCategory }) {
  const [showCompactBar, setShowCompactBar] = useState(false)
  const topRowRef = useRef(null)

  useEffect(() => {
    const node = topRowRef.current
    if (!node) return undefined

    const observer = new IntersectionObserver(([entry]) => setShowCompactBar(!entry.isIntersecting), { threshold: 0 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const chipsProps = { categories, products, activeCategoryId, onSelectCategory }

  return (
    <>
      <div
        className={`fixed inset-x-0 top-0 z-40 bg-brand shadow-md shadow-ink/10 transition-transform duration-200 ${
          showCompactBar ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 pb-3 pt-4 sm:px-6">
          <TopRow title={title} />
          <ChipsRow {...chipsProps} light />
        </div>
      </div>

      <div
        className="px-4 pb-8 pt-4 sm:px-6 sm:pb-10"
        style={{ background: 'linear-gradient(to bottom, var(--color-brand) 0%, var(--color-brand) 40%, transparent 100%)' }}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <TopRow title={title} innerRef={topRowRef} />
          <SearchBar query={query} onQueryChange={onQueryChange} onSubmit={(event) => event.preventDefault()} placeholder="Buscar productos…" />
        </div>
      </div>

      <div className="px-4 pb-2 pt-1 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <ChipsRow {...chipsProps} />
        </div>
      </div>
    </>
  )
}
