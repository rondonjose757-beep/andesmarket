import { Link } from 'react-router-dom'
import CompactProductCard from './CompactProductCard'

// Sección horizontal de productos por categoría en el Home (referencia:
// sección "Comprar" de Cashea) — título + "Explorar" arriba, carrusel de
// tarjetas compactas debajo, recortado al borde para insinuar que hay más.
export default function CategorySection({ title, to, products, onSelect }) {
  if (products.length === 0) return null

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-black text-ink">{title}</h2>
        <Link to={to} className="text-sm font-bold text-brand-dark hover:underline">
          Explorar →
        </Link>
      </div>

      <div className="scrollbar-hide -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {products.map((product) => (
          <CompactProductCard key={product.id} product={product} onSelect={onSelect} />
        ))}
      </div>
    </section>
  )
}
