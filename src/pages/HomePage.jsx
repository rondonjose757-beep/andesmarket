import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog } from '../hooks/useCatalog'
import { computeDiscountedPrice } from '../lib/format'
import { categoryLook } from '../lib/tones'
import PromoCarousel from '../components/PromoCarousel'
import CategoryChips from '../components/CategoryChips'
import CategorySection from '../components/CategorySection'
import ProductDetailModal from '../components/ProductDetailModal'
import CatalogState from '../components/CatalogState'
import AndesPattern from '../components/AndesPattern'

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  )
}

export default function HomePage() {
  const { products, categories, loading, error, retry } = useCatalog()
  const [selectedProduct, setSelectedProduct] = useState(null)
  const offers = products.filter((p) => computeDiscountedPrice(p) < Number(p.price))
  if (loading || error) return <CatalogState loading={loading} error={error} retry={retry} />
  return (
    <div className="flex flex-col gap-9">
      <h1 className="sr-only">Tu supermercado AndesMarket</h1>
      <PromoCarousel products={products} onSelect={setSelectedProduct} />
      {categories.length > 0 && (
        <section className="animate-fade-up [animation-delay:80ms]">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-dark">Departamentos</p>
              <h2 className="mt-1 font-display text-2xl font-extrabold leading-tight tracking-[-0.03em] text-ink">
                ¿Qué necesitas hoy?
              </h2>
            </div>
            <Link to="/catalogo" className="flex min-h-11 items-center gap-1 text-sm font-extrabold text-brand-dark hover:underline">
              Ver todo <ArrowIcon />
            </Link>
          </div>
          <CategoryChips categories={categories} products={products} />
        </section>
      )}
      {products.length === 0 ? (
        <CatalogState />
      ) : (
        <div className="animate-fade-up [animation-delay:160ms]">
          <CategorySection
            eyebrow={offers.length ? 'Precios especiales' : 'Para empezar'}
            title={offers.length ? 'Ofertas para ti' : 'Descubre nuestros productos'}
            to={offers.length ? '/catalogo?ofertas=1' : '/catalogo'}
            products={(offers.length ? offers : products).slice(0, 10)}
            onSelect={setSelectedProduct}
          />
        </div>
      )}
      <div className="mt-6 flex flex-col gap-14">
        {categories.map((category, index) => {
          const items = products.filter((p) => p.category?.id === category.id)
          return (
            <CategorySection
              key={category.id}
              look={categoryLook(category.name)}
              eyebrow={`Pasillo ${String(index + 1).padStart(2, '0')}`}
              title={category.name}
              to={`/catalogo?categoria=${category.id}`}
              products={items.slice(0, 10)}
              total={items.length}
              onSelect={setSelectedProduct}
            />
          )
        })}
      </div>
      <Link
        to="/mis-pedidos"
        className="group relative flex items-center gap-4 overflow-hidden rounded-[28px] rounded-tr-[64px] bg-brand-deep p-5 text-white shadow-float focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-dark"
      >
        <AndesPattern className="text-white/10" />
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z M9 8h6 M9 12h6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block font-display text-lg font-extrabold leading-tight">Tus compras, a mano</span>
          <span className="mt-0.5 block text-[13px] text-white/80">Consulta cómo va tu pedido.</span>
        </span>
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-deep transition-transform group-hover:translate-x-1">
          <ArrowIcon />
        </span>
      </Link>
      <div aria-hidden="true" className="relative -mx-4 -mb-10 h-40 overflow-hidden sm:mx-0">
        <AndesPattern className="text-brand/40 [mask-image:linear-gradient(to_top,black,transparent)]" />
        <p className="absolute inset-x-0 bottom-6 text-center font-display text-[52px] font-extrabold leading-none tracking-[-0.05em] text-brand-dark/15">
          AndesMarket
        </p>
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
