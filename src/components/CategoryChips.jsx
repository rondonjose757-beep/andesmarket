import { Link } from 'react-router-dom'

// Chips de categoría (referencia: fila de accesos rápidos de Mercado Libre)
// pero con la foto de un producto real de esa categoría en vez de un ícono,
// y el nombre en letra pequeña debajo. Sin título de sección.
export default function CategoryChips({ categories, products }) {
  const chips = categories
    .map((category) => {
      const sample = products.find((p) => p.category?.id === category.id && p.image_url)
      return sample ? { id: category.id, name: category.name, image: sample.image_url } : null
    })
    .filter(Boolean)

  if (chips.length === 0) return null

  return (
    <div className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {chips.map((chip) => (
        <Link
          key={chip.id}
          to={`/catalogo?categoria=${chip.id}`}
          className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-ink/5 transition-transform active:scale-95">
            <img src={chip.image} alt="" className="h-full w-full object-contain" />
          </div>
          <span className="line-clamp-2 text-xs font-semibold leading-tight text-ink/70">{chip.name}</span>
        </Link>
      ))}
    </div>
  )
}
