import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCatalog } from '../hooks/useCatalog'
import ProductCard from '../components/ProductCard'
import ProductDetailModal from '../components/ProductDetailModal'

export default function CatalogPage() {
  const { products, categories, loading, error } = useCatalog()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeCategoryId, setActiveCategoryId] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState(null)

  useEffect(() => {
    const categoriaParam = searchParams.get('categoria')
    if (categoriaParam) {
      setActiveCategoryId(categoriaParam)
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const groupedByCategory = useMemo(() => {
    const groups = new Map()
    for (const product of products) {
      const key = product.category?.name ?? 'Otros'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(product)
    }
    return Array.from(groups.entries())
  }, [products])

  const filteredGroups =
    activeCategoryId === 'all'
      ? groupedByCategory
      : groupedByCategory.filter(([, items]) => items[0]?.category?.id === activeCategoryId)

  if (loading) return <p className="py-16 text-center text-base text-ink/60">Cargando catálogo…</p>
  if (error) return <p className="py-16 text-center text-base text-red-600">No se pudo cargar el catálogo: {error}</p>

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-black text-ink">Catálogo</h1>

      <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => setActiveCategoryId('all')}
          className={`shrink-0 rounded-full border-2 px-4 py-2.5 text-base font-semibold transition-colors ${
            activeCategoryId === 'all' ? 'border-brand bg-brand/10 text-brand-dark' : 'border-ink/15 text-ink/70 hover:border-ink/30'
          }`}
        >
          Todas
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveCategoryId(category.id)}
            className={`shrink-0 rounded-full border-2 px-4 py-2.5 text-base font-semibold transition-colors ${
              activeCategoryId === category.id ? 'border-brand bg-brand/10 text-brand-dark' : 'border-ink/15 text-ink/70 hover:border-ink/30'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {filteredGroups.length === 0 ? (
        <p className="py-10 text-center text-base text-ink/60">Todavía no hay productos en esta categoría.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {filteredGroups.map(([categoryName, items]) => (
            <div key={categoryName}>
              <h2 className="mb-3 text-base font-bold uppercase tracking-wide text-ink/60">{categoryName}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
    </div>
  )
}
