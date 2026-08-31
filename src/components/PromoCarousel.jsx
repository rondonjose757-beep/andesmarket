import { computeDiscountedPrice } from '../lib/format'
import PromoBanner from './PromoBanner'
import InfoBanner from './InfoBanner'

const MAX_DEALS = 3

function DeliveryIcon() {
  return (
    <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 16V6a1 1 0 0 1 1-1h9v11" />
      <path d="M13 9h4l4 4v3h-2" />
      <circle cx="7.5" cy="17.5" r="2" />
      <circle cx="17.5" cy="17.5" r="2" />
      <path d="M9.5 17.5h6" />
    </svg>
  )
}

function StoreIcon() {
  return (
    <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9.5 4.5 4h15L21 9.5" />
      <path d="M3 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
      <path d="M5 11v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" />
      <path d="M9.5 20v-5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5v5" />
    </svg>
  )
}

// Carrusel horizontal de banners (referencia: Mercado Libre) que se dibuja
// justo debajo del buscador, superpuesto al difuminado de <Header />: al
// tener márgenes laterales, el verde difuminado sigue viéndose alrededor.
// Combina banners de oferta (datos reales del catálogo) con banners fijos
// de delivery/retiro para que siempre haya varias tarjetas que deslizar.
export default function PromoCarousel({ products, onSelect }) {
  const deals = products
    .filter((p) => p.discount_type && p.discount_value != null)
    .map((p) => ({ product: p, savings: Number(p.price) - computeDiscountedPrice(p) }))
    .sort((a, b) => b.savings - a.savings)
    .slice(0, MAX_DEALS)
    .map((entry) => entry.product)

  const dealSlides = deals.length > 0 ? deals : [null]

  return (
    <div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {dealSlides.map((product) => (
        <div key={product?.id ?? 'welcome'} className="w-[93%] shrink-0 snap-center sm:w-[85%]">
          <PromoBanner product={product} onSelect={onSelect} />
        </div>
      ))}

      <div className="w-[93%] shrink-0 snap-center sm:w-[85%]">
        <InfoBanner
          to="/catalogo"
          gradientClass="bg-gradient-to-br from-brand-dark to-teal-600"
          icon={<DeliveryIcon />}
          eyebrow="Delivery"
          title="Directo a tu puerta."
          subtitle="Elige delivery al pagar y lo llevamos hasta ti."
        />
      </div>

      <div className="w-[93%] shrink-0 snap-center sm:w-[85%]">
        <InfoBanner
          to="/catalogo"
          gradientClass="bg-gradient-to-br from-accent to-orange-600"
          icon={<StoreIcon />}
          eyebrow="Retiro en tienda"
          title="Ahorra el envío."
          subtitle="Prepara tu pedido y retíralo cuando quieras."
        />
      </div>
    </div>
  )
}
