import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCatalog } from '../hooks/useCatalog'
import CatalogHeader from '../components/CatalogHeader'
import ProductCard from '../components/ProductCard'
import ProductDetailModal from '../components/ProductDetailModal'

function normalize(str) {
  return (str ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export default function CatalogPage() {
  const { products, categories, loading, error } = useCatalog()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeCategoryId, setActiveCategoryId] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const categoriaParam = searchParams.get('categoria')
    const queryParam = searchParams.get('q')
    if (categoriaParam) setActiveCategoryId(categoriaParam)
    if (queryParam) setQuery(queryParam)
    if (categoriaParam || queryParam) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  const normalizedQuery = normalize(query.trim())

  const searchedProducts = useMemo(() => {
    if (!normalizedQuery) return products
    return products.filter(
      (product) => normalize(product.name).includes(normalizedQuery) || normalize(product.description).includes(normalizedQuery),
    )
  }, [products, normalizedQuery])

  const activeCategory = categories.find((c) => c.id === activeCategoryId) ?? null

  const pageTitle = activeCategory ? activeCategory.name : normalizedQuery ? `Resultados para "${query.trim()}"` : 'Catálogo'

  const flatProducts = useMemo(
    () => (activeCategory ? searchedProducts.filter((p) => p.category?.id === activeCategoryId) : []),
    [searchedProducts, activeCategory, activeCategoryId],
  )

  const groupedByCategory = useMemo(() => {
    if (activeCategory) return []
    const groups = new Map()
    for (const product of searchedProducts) {
      const key = product.category?.name ?? 'Otros'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(product)
    }
    return Array.from(groups.entries())
  }, [searchedProducts, activeCategory])

  const isEmpty = activeCategory ? flatProducts.length === 0 : groupedByCategory.length === 0

  return (
    <div>
      <CatalogHeader
        title={pageTitle}
        query={query}
        onQueryChange={setQuery}
        categories={categories}
        products={products}
        activeCategoryId={activeCategoryId}
        onSelectCategory={setActiveCategoryId}
      />

      <div className="flex flex-col gap-5 px-4 pb-28 sm:px-6">
        {loading ? (
          <p className="py-16 text-center text-base text-ink/60">Cargando catálogo…</p>
        ) : error ? (
          <p className="py-16 text-center text-base text-red-600">No se pudo cargar el catálogo: {error}</p>
        ) : isEmpty ? (
          <p className="py-10 text-center text-base text-ink/60">
            {normalizedQuery ? `Sin resultados para "${query.trim()}".` : 'Todavía no hay productos en esta categoría.'}
          </p>
        ) : activeCategory ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {flatProducts.map((product) => (
              <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {groupedByCategory.map(([categoryName, items]) => (
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
      </div>

      {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
    </div>
  )
}
