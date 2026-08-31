import { useEffect, useState } from 'react'
import { Modal } from '../shared/components/Modal'
import { Button } from '../shared/components/ui'
import { computeDiscountedPrice, formatPrice } from '../lib/format'
import { useCart } from '../state/CartProvider'
import { useToast } from '../shared/components/Toast'

export default function ProductDetailModal({ product, onClose }) {
  const { addItem } = useCart()
  const notify = useToast()
  const unitPrice = computeDiscountedPrice(product)
  const outOfStock = product.stock != null && product.stock <= 0

  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    setQuantity(1)
  }, [product.id])

  function handleAdd() {
    addItem(
      {
        productId: product.id,
        productName: product.name,
        productImage: product.image_url,
        unitPrice,
      },
      quantity,
    )
    notify(`${product.name} agregado al carrito.`, 'success')
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={product.name} maxWidth="max-w-lg">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-cream-dim">
            {product.image_url ? (
              <img src={product.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl">🛒</div>
            )}
          </div>
          <div className="min-w-0">
            {product.category?.name && (
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">{product.category.name}</p>
            )}
            {product.description && <p className="mt-1 text-sm text-ink/60">{product.description}</p>}
            {outOfStock && <p className="mt-1 text-xs font-semibold text-red-600">Sin stock por ahora</p>}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-ink/8 pt-4">
          <div className="flex items-center gap-3 rounded-full border border-ink/12 px-2 py-1">
            <button
              type="button"
              aria-label="Disminuir cantidad"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full text-ink/60 hover:bg-ink/5"
            >
              −
            </button>
            <span className="w-5 text-center text-sm font-semibold tabular-nums">{quantity}</span>
            <button
              type="button"
              aria-label="Aumentar cantidad"
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-ink/60 hover:bg-ink/5"
            >
              +
            </button>
          </div>

          <Button size="lg" onClick={handleAdd} disabled={outOfStock}>
            Agregar · {formatPrice(unitPrice * quantity)}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
