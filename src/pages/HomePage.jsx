import { useMemo, useState } from 'react'
import { useCatalog } from '../hooks/useCatalog'
import PromoCarousel from '../components/PromoCarousel'
import CategoryChips from '../components/CategoryChips'
import ProductCard from '../components/ProductCard'
import ProductDetailModal from '../components/ProductDetailModal'

const FEATURED_COUNT = 8

export default function HomePage() {
  const { products, categories, loading, error } = useCatalog()
  const [selectedProduct, setSelectedProduct] = useState(null)

  const featured = useMemo(() => {
    const discounted = products.filter((p) => p.discount_type && p.discount_value != null)
    const rest = products.filter((p) => !discounted.includes(p))
    return [...discounted, ...rest].slice(0, FEATURED_COUNT)
  }, [products])

  if (loading) return <p className="py-16 text-center text-base text-ink/60">Cargando…</p>
  if (error) return <p className="py-16 text-center text-base text-red-600">No se pudo cargar el inicio: {error}</p>

  return (
    <div className="flex flex-col gap-8">
      <h1 className="sr-only">Inicio</h1>
      <div className="-mt-[276px] animate-[fade-up_0.4s_ease-out_both] sm:-mt-[324px]">
        <PromoCarousel products={products} onSelect={setSelectedProduct} />
      </div>

      {categories.length > 0 && (
        <section className="animate-[fade-up_0.4s_ease-out_0.05s_both]">
          <CategoryChips categories={categories} products={products} />
        </section>
      )}

      <section className="animate-[fade-up_0.4s_ease-out_0.1s_both]">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-black text-ink">Destacados</h2>
          <a href="/catalogo" className="text-sm font-bold text-brand-dark hover:underline">
            Ver todo →
          </a>
        </div>
        {featured.length === 0 ? (
          <p className="text-base text-ink/60">Todavía no hay productos cargados en el catálogo.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} />
            ))}
          </div>
        )}
      </section>

      {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
    </div>
  )
}
