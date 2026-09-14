import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCatalog } from '../hooks/useCatalog'
import { computeDiscountedPrice } from '../lib/format'
import { categoryLook } from '../lib/tones'
import CatalogHeader from '../components/CatalogHeader'
import CatalogHero from '../components/CatalogHero'
import ProductCard from '../components/ProductCard'
import ProductDetailModal from '../components/ProductDetailModal'
import CatalogState from '../components/CatalogState'

function normalize(value) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export default function CatalogPage() {
  const { products, categories, loading, error, retry } = useCatalog()
  const [params, setParams] = useSearchParams()
  const [selectedProduct, setSelectedProduct] = useState(null)
  const categoryId = params.get('categoria') || 'all'
  const subcategoryId = params.get('subcategoria') || 'all'
  const query = params.get('q') || ''
  const offersOnly = params.get('ofertas') === '1'
  const category = categories.find((item) => item.id === categoryId)
  const tone = category ? categoryLook(category.name).tone : undefined
  const subcategories = Array.from(
    new Map(
      products
        .filter((p) => p.category?.id === categoryId && p.subcategory)
        .map((p) => [p.subcategory.id, p.subcategory]),
    ).values(),
  ).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, 'es'))
  const normalizedQuery = normalize(query.trim())
  const filtered = products.filter(
    (product) =>
      (categoryId === 'all' || product.category?.id === categoryId) &&
      (subcategoryId === 'all' || product.subcategory?.id === subcategoryId) &&
      (!offersOnly || computeDiscountedPrice(product) < Number(product.price)) &&
      (!normalizedQuery || normalize(`${product.name} ${product.description ?? ''}`).includes(normalizedQuery)),
  )

  function changeFilter(key, value, replace = false) {
    // BrowserRouter actualiza el historial antes de terminar el render. Leer la
    // URL vigente evita recuperar una categoría anterior al escribir enseguida.
    const next = new URLSearchParams(window.location.search)
    if (!value || ((key === 'categoria' || key === 'subcategoria') && value === 'all')) next.delete(key)
    else next.set(key, value)
    if (key === 'categoria') next.delete('subcategoria')
    setParams(next, { replace, preventScrollReset: true })
  }

  return (
    <div>
      <CatalogHeader
        query={query}
        onQueryChange={(value) => changeFilter('q', value, true)}
        categories={categories}
        activeCategoryId={categoryId}
        onSelectCategory={(id) => changeFilter('categoria', id)}
      />
      <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
        <CatalogHero
          eyebrow={category ? `Pasillo ${String(categories.indexOf(category) + 1).padStart(2, '0')}` : 'Tu supermercado digital'}
          title={category?.name ?? (categoryId !== 'all' ? 'Categoría no disponible' : 'Todos los productos')}
          tone={tone ?? 'menta'}
          status={
            loading
              ? 'Buscando productos…'
              : `${filtered.length} producto${filtered.length === 1 ? '' : 's'}${query.trim() ? ` para “${query.trim()}”` : ''}`
          }
          products={products}
          fanProducts={filtered}
          offersOnly={offersOnly}
          onToggleOffers={() => changeFilter('ofertas', offersOnly ? '' : '1')}
          subcategories={subcategories}
          activeSubcategoryId={subcategoryId}
          onSelectSubcategory={(id) => changeFilter('subcategoria', id)}
        />
        <div className="mt-5">
          {loading || error ? (
            <CatalogState loading={loading} error={error} retry={retry} />
          ) : filtered.length === 0 ? (
            <CatalogState
              message={
                query.trim() ? `No encontramos productos para “${query.trim()}”.` : 'No hay productos con estos filtros.'
              }
              onClear={params.size > 0 ? () => setParams({}) : undefined}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} tone={tone} />
              ))}
            </div>
          )}
        </div>
      </div>
      {selectedProduct && (
        <ProductDetailModal
          key={selectedProduct.id}
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  )
}
