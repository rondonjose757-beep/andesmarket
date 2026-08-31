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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="h-40 w-full shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-ink/10 sm:h-28 sm:w-28">
            {product.image_url ? (
              <img src={product.image_url} alt="" className="h-full w-full object-contain p-3" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl">🛒</div>
            )}
          </div>
          <div className="min-w-0">
            {product.category?.name && (
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-dark">{product.category.name}</p>
            )}
            {product.description && <p className="mt-1.5 text-base text-ink/70">{product.description}</p>}
            {outOfStock && <p className="mt-1.5 text-sm font-semibold text-red-600">Sin stock por ahora</p>}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-ink/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-center gap-4 rounded-full border-2 border-ink/12 px-2 py-1.5">
            <button
              type="button"
              aria-label="Disminuir cantidad"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-bold text-ink/70 hover:bg-ink/5"
            >
              −
            </button>
            <span className="w-6 text-center text-lg font-bold tabular-nums">{quantity}</span>
            <button
              type="button"
              aria-label="Aumentar cantidad"
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-bold text-ink/70 hover:bg-ink/5"
            >
              +
            </button>
          </div>

          <Button size="lg" onClick={handleAdd} disabled={outOfStock} className="w-full sm:w-auto">
            Agregar · {formatPrice(unitPrice * quantity)}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
