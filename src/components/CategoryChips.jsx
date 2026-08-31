import { Link } from 'react-router-dom'

// Chips dinámicos a partir de las categorías reales del catálogo — a
// diferencia de una grilla con íconos fijos, no depende de assets de diseño
// que todavía no existen para AndesMarket.
export default function CategoryChips({ categories }) {
  if (categories.length === 0) return null

  return (
    <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {categories.map((category) => (
        <Link
          key={category.id}
          to={`/catalogo?categoria=${category.id}`}
          className="shrink-0 rounded-full border border-ink/12 bg-white px-4 py-2 text-sm font-medium text-ink/70 transition-colors hover:border-brand hover:text-brand-dark"
        >
          {category.name}
        </Link>
      ))}
    </div>
  )
}
