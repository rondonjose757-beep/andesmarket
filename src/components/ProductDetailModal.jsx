import { useState } from 'react'
import { Modal } from '../shared/components/Modal'
import { Button, IconButton } from '../shared/components/ui'
import { computeDiscountedPrice, formatPrice } from '../lib/format'
import { productTone } from '../lib/tones'
import { useCart } from '../state/CartProvider'
import { useToast } from '../shared/components/Toast'
import ProductImage from './ProductImage'

function StepIcon({ plus = false }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
      <path strokeLinecap="round" d={plus ? 'M12 5v14M5 12h14' : 'M5 12h14'} />
    </svg>
  )
}

export default function ProductDetailModal({ product, onClose }) {
  const { addItem } = useCart()
  const notify = useToast()
  const price = computeDiscountedPrice(product)
  const hasDiscount = price < Number(product.price)
  const outOfStock = product.stock != null && product.stock <= 0
  const tone = productTone(product)
  const [quantity, setQuantity] = useState(1)

  function handleAdd() {
    if (outOfStock) return
    addItem(
      { productId: product.id, productName: product.name, productImage: product.image_url, unitPrice: price },
      quantity,
    )
    notify(`${product.name} agregado al carrito.`, 'success')
    onClose()
  }

  const hero = (
    <div className={`tone-${tone} relative flex h-[17rem] items-center justify-center overflow-hidden bg-(--tone-media) sm:h-80`}>
      <span
        aria-hidden="true"
        className="absolute -bottom-24 left-1/2 h-48 w-[140%] -translate-x-1/2 rounded-[50%] bg-(--tone-shelf)"
      />
      <span aria-hidden="true" className="absolute bottom-14 left-1/2 h-5 w-32 -translate-x-1/2 rounded-full bg-(--tone-deep) opacity-20 blur-lg" />
      <div className={`relative mb-6 h-44 w-44 animate-pop-in sm:h-52 sm:w-52 ${outOfStock ? 'opacity-60 grayscale' : ''}`}>
        <ProductImage src={product.image_url} />
      </div>
      {hasDiscount && (
        <span className="absolute left-4 top-5 -rotate-12 rounded-full bg-accent-dark px-3 py-1.5 font-display text-lg font-extrabold leading-none text-white shadow-lg shadow-accent-dark/30 ring-4 ring-white/50">
          −{Math.round((1 - price / Number(product.price)) * 100)}%
        </span>
      )}
    </div>
  )

  const eyebrow = (
    <p className={`tone-${tone} mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-(--tone-deep)`}>
      {[product.category?.name, product.subcategory?.name].filter(Boolean).join(' · ')}
    </p>
  )

  const footer = (
    <div className="flex items-center gap-3">
      <div className="flex shrink-0 items-center gap-1 rounded-full bg-cream p-1">
        <IconButton
          label="Disminuir cantidad"
          disabled={quantity === 1}
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="bg-white !text-ink shadow-sm disabled:opacity-40"
        >
          <StepIcon />
        </IconButton>
        <span className="min-w-7 text-center font-display text-lg font-extrabold tabular-nums">{quantity}</span>
        <IconButton
          label="Aumentar cantidad"
          disabled={outOfStock}
          onClick={() => setQuantity((q) => q + 1)}
          className="bg-white !text-ink shadow-sm disabled:opacity-40"
        >
          <StepIcon plus />
        </IconButton>
      </div>
      <Button onClick={handleAdd} disabled={outOfStock} className="min-w-0 flex-1 !px-4">
        {outOfStock ? 'Agotado' : `Agregar · ${formatPrice(price * quantity)}`}
      </Button>
    </div>
  )

  return (
    <Modal open sheet onClose={onClose} title={product.name} footer={footer} hero={hero} eyebrow={eyebrow}>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="font-display text-[34px] font-extrabold leading-none tracking-tight tabular-nums text-ink">
          {formatPrice(price)}
        </p>
        {hasDiscount && (
          <>
            <del className="text-base font-medium tabular-nums text-muted">{formatPrice(product.price)}</del>
            <span className="rounded-full bg-accent-light px-2.5 py-1 text-xs font-bold text-accent-dark">
              Ahorras {formatPrice(Number(product.price) - price)}
            </span>
          </>
        )}
      </div>
      {product.description && (
        <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-muted">{product.description}</p>
      )}
      {outOfStock && (
        <p className="mt-4 rounded-2xl bg-danger-light px-4 py-3 text-sm font-semibold text-danger">Sin stock por ahora</p>
      )}
    </Modal>
  )
}
