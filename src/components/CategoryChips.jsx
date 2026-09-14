import { Link } from 'react-router-dom'
import { categoryLook } from '../lib/tones'
import ProductImage from './ProductImage'

// Departamentos: cuadro con la esquina superior derecha redondeada y un
// producto real que sobresale por arriba.
export default function CategoryChips({ categories, products }) {
  if (!categories.length) return null
  return (
    <nav
      aria-label="Departamentos"
      className="scrollbar-hide -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 pt-6 sm:mx-0 sm:gap-4 sm:px-0"
    >
      {categories.map((category) => (
        <Link
          key={category.id}
          to={`/catalogo?categoria=${category.id}`}
          className={`tone-${categoryLook(category.name).tone} group flex w-[74px] shrink-0 flex-col items-center gap-2 rounded-2xl text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-dark sm:w-[88px]`}
        >
          <span className="relative block aspect-square w-full rounded-[18px] rounded-tr-[34px] bg-(--tone-shelf) transition-transform duration-300 ease-spring group-active:scale-95">
            <span className="absolute inset-x-2 -top-4 bottom-2 transition-transform duration-500 ease-spring group-hover:-translate-y-1 group-hover:rotate-6">
              <ProductImage src={products.find((p) => p.category?.id === category.id && p.image_url)?.image_url} />
            </span>
          </span>
          <span className="line-clamp-2 text-xs font-bold leading-tight text-ink">{category.name}</span>
        </Link>
      ))}
    </nav>
  )
}
