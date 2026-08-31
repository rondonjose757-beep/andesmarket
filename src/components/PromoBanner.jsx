import { computeDiscountedPrice, formatPrice } from '../lib/format'

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6l6 6-6 6" />
    </svg>
  )
}

export default function PromoBanner({ product, onSelect }) {
  if (!product) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-dark to-brand px-6 py-7 text-white shadow-lg shadow-brand/20 sm:px-8 sm:py-9">
        <p className="relative text-xs font-bold uppercase tracking-[0.15em] text-white/70">Bienvenido</p>
        <h2 className="relative mt-1.5 max-w-xs text-2xl font-black leading-[1.05] sm:text-3xl">
          Tu minimarket, a un pedido de distancia.
        </h2>
        <p className="relative mt-2 max-w-xs text-sm text-white/80">Arma tu pedido y elige retiro en tienda o delivery.</p>
      </div>
    )
  }

  const discounted = computeDiscountedPrice(product)
  const savings = Number(product.price) - discounted

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className="group relative block w-full overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-brand px-6 py-7 text-left text-white shadow-lg shadow-ink/10 transition-transform duration-200 active:scale-[0.99] sm:px-8 sm:py-9"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />

      {product.image_url && (
        <div className="absolute -right-4 top-1/2 h-32 w-32 -translate-y-1/2 overflow-hidden rounded-full border-4 border-white/40 shadow-xl transition-transform duration-300 group-hover:scale-105 sm:h-40 sm:w-40">
          <img src={product.image_url} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <p className="relative text-xs font-bold uppercase tracking-[0.15em] text-white/70">Oferta del día</p>
      <h2 className="relative mt-1.5 max-w-[65%] text-2xl font-black leading-[1.05] sm:max-w-xs sm:text-3xl">{product.name}</h2>

      <div className="relative mt-4 flex flex-wrap items-center gap-2">
        <span className="text-2xl font-black">{formatPrice(discounted)}</span>
        <span className="text-sm text-white/60 line-through">{formatPrice(product.price)}</span>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-accent">Ahorras {formatPrice(savings)}</span>
      </div>

      <span className="relative mt-5 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-accent transition-transform duration-200 group-hover:translate-x-0.5">
        Pedir ahora
        <ArrowIcon />
      </span>
    </button>
  )
}
