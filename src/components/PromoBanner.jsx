import { Link } from 'react-router-dom'
import { computeDiscountedPrice, formatPrice } from '../lib/format'
import { productTone } from '../lib/tones'
import AndesPattern from './AndesPattern'
import ProductImage from './ProductImage'

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  )
}

const shape = 'group relative flex h-full min-h-[196px] w-full overflow-hidden rounded-[28px] rounded-tr-[76px] p-5 pr-0 text-left transition-transform duration-300 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-dark'

export default function PromoBanner({ product, onSelect, showcase = [] }) {
  if (!product) {
    const [front, left, right] = showcase
    return (
      <Link to="/catalogo" className={`${shape} bg-brand-deep text-white shadow-float`}>
        <AndesPattern className="text-white/10" />
        <span aria-hidden="true" className="absolute -right-8 -top-10 h-52 w-52 rounded-full bg-brand/45 blur-3xl" />
        <div className="relative z-10 flex min-w-0 flex-1 flex-col items-start">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-brand-light">Bienvenido</p>
          <h2 className="mt-2 font-display text-[28px] font-extrabold leading-[0.98] tracking-[-0.035em]">
            Tu minimarket, a un pedido.
          </h2>
          <p className="mt-2 max-w-[16rem] text-[13px] leading-snug text-white/85">
            Arma tu pedido y elige retiro en tienda o delivery.
          </p>
          <span className="mt-auto pt-4">
            <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 pt-px text-sm font-extrabold text-brand-deep transition-transform group-hover:translate-x-0.5">
              Explorar productos <ArrowIcon />
            </span>
          </span>
        </div>
        <div aria-hidden="true" className="relative w-[40%] shrink-0">
          <span className="absolute bottom-2 left-1/2 h-4 w-24 -translate-x-1/2 rounded-full bg-ink/40 blur-md" />
          {left && (
            <div className="absolute bottom-7 left-0 h-[74px] w-[64px] -rotate-[16deg] transition-transform duration-500 ease-spring group-hover:-rotate-[22deg]">
              <ProductImage src={left.image_url} />
            </div>
          )}
          {right && (
            <div className="absolute right-1 top-4 h-[74px] w-[64px] rotate-[14deg] transition-transform duration-500 ease-spring group-hover:rotate-[20deg]">
              <ProductImage src={right.image_url} />
            </div>
          )}
          {front && (
            <div className="absolute bottom-3 left-1/2 h-[112px] w-[96px] -translate-x-1/2 transition-transform duration-500 ease-spring group-hover:-translate-y-1">
              <ProductImage src={front.image_url} />
            </div>
          )}
        </div>
      </Link>
    )
  }

  const price = computeDiscountedPrice(product)
  const discountPct = Math.round((1 - price / Number(product.price)) * 100)
  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className={`${shape} tone-${productTone(product)} bg-(--tone-shelf) text-ink shadow-card`}
    >
      <div className="relative z-10 flex min-w-0 flex-1 flex-col items-start">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-(--tone-deep)">Precio especial</p>
        <h2 className="mt-2 line-clamp-2 font-display text-[22px] font-extrabold leading-[1.02] tracking-[-0.025em]">
          {product.name}
        </h2>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="font-display text-[30px] font-extrabold tracking-tight tabular-nums">{formatPrice(price)}</span>
          <del className="text-sm font-medium tabular-nums text-muted">{formatPrice(product.price)}</del>
        </p>
        <span className="mt-auto pt-4">
          <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 pt-px text-sm font-extrabold text-white transition-transform group-hover:translate-x-0.5">
            Ver oferta <ArrowIcon />
          </span>
        </span>
      </div>
      <div aria-hidden="true" className="relative w-[40%] shrink-0">
        <span className="absolute right-3 top-0 z-10 flex h-[58px] w-[58px] rotate-12 items-center justify-center rounded-full bg-accent-dark font-display text-lg font-extrabold tracking-tight text-white shadow-lg shadow-accent-dark/30 ring-4 ring-white/60">
          −{discountPct}%
        </span>
        <span className="absolute bottom-2 left-1/2 h-4 w-24 -translate-x-1/2 rounded-full bg-(--tone-deep) opacity-25 blur-md" />
        <div className="absolute inset-x-2 bottom-3 top-10 transition-transform duration-500 ease-spring group-hover:-rotate-3 group-hover:scale-105">
          <ProductImage src={product.image_url} />
        </div>
      </div>
    </button>
  )
}
