import { useRef, useState } from 'react'
import { computeDiscountedPrice } from '../lib/format'
import PromoBanner from './PromoBanner'

export default function PromoCarousel({ products, onSelect }) {
  const trackRef = useRef(null)
  const [active, setActive] = useState(0)
  const deals = products
    .filter((p) => computeDiscountedPrice(p) < Number(p.price) && (p.stock == null || p.stock > 0))
    .slice(0, 3)
  const slides = deals.length ? deals : [null]

  // Un producto de cada departamento para ilustrar la bienvenida.
  const showcase = []
  for (const product of products) {
    if (showcase.length === 3) break
    if (product.image_url && !showcase.some((item) => item.category?.id === product.category?.id)) showcase.push(product)
  }

  function syncDots() {
    const track = trackRef.current
    const first = track?.firstElementChild
    if (first) setActive(Math.round(track.scrollLeft / (first.offsetWidth + 12)))
  }

  return (
    <section aria-label="Promociones" className="animate-fade-up">
      <div
        ref={trackRef}
        onScroll={slides.length > 1 ? syncDots : undefined}
        className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0"
      >
        {slides.map((product) => (
          <div
            key={product?.id ?? 'welcome'}
            className={`${slides.length > 1 ? 'w-[88%] sm:w-[62%]' : 'w-full'} shrink-0 snap-center`}
          >
            <PromoBanner product={product} onSelect={onSelect} showcase={showcase} />
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div aria-hidden="true" className="flex justify-center gap-1.5">
          {slides.map((product, index) => (
            <span
              key={product.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${index === active ? 'w-5 bg-brand-dark' : 'w-1.5 bg-ink/15'}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
