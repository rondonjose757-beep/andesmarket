import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../state/CartProvider'
import { useAuth } from '../state/AuthProvider'
import { submitOrder } from '../lib/checkout'
import { formatPrice } from '../lib/format'
import { Button, Card, Field, Textarea } from '../shared/components/ui'
import { useToast } from '../shared/components/Toast'
import CheckoutModal from '../components/CheckoutModal'

export default function CartPage() {
  const { items, grandTotal, removeItem, updateQuantity, clearCart } = useCart()
  const { customer } = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  const [orderType, setOrderType] = useState('retiro')
  const [address, setAddress] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const handleConfirm = useCallback(
    async (customerId) => {
      if (orderType === 'delivery' && !address.trim()) {
        notify('Escribe una dirección de entrega.', 'error')
        return
      }
      setConfirming(true)
      try {
        const order = await submitOrder({ customerId, orderType, address, items })
        clearCart()
        navigate(`/pedido/${order.id}`)
      } catch {
        notify('No se pudo confirmar tu pedido. Intenta de nuevo.', 'error')
      } finally {
        setConfirming(false)
      }
    },
    [orderType, address, items, clearCart, navigate, notify],
  )

  function handleConfirmClick() {
    if (!customer) {
      setCheckoutOpen(true)
      return
    }
    handleConfirm(customer.id)
  }

  function handleCheckoutReady(newCustomer) {
    setCheckoutOpen(false)
    handleConfirm(newCustomer.id)
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-xl font-black text-ink">Tu carrito está vacío</p>
        <p className="max-w-xs text-base text-ink/65">Agrega productos del catálogo para armar tu pedido.</p>
        <Button size="lg" className="mt-2" onClick={() => navigate('/catalogo')}>
          Ver el catálogo
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-black text-ink">Tu carrito</h1>

      <Card className="p-4">
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div key={item.productId} className="flex items-start justify-between gap-3 border-t border-ink/8 pt-4 first:border-t-0 first:pt-0">
              <div className="min-w-0">
                <p className="text-base font-bold text-ink">{item.productName}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink/15 text-lg font-bold text-ink/70 hover:bg-ink/5"
                    aria-label="Disminuir cantidad"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-base font-bold tabular-nums">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink/15 text-lg font-bold text-ink/70 hover:bg-ink/5"
                    aria-label="Aumentar cantidad"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="ml-2 text-sm font-bold text-red-600 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              </div>
              <span className="shrink-0 text-base font-bold tabular-nums text-ink">{formatPrice(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-lg font-black text-ink">Método de entrega</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOrderType('retiro')}
            className={`flex-1 rounded-xl border-2 px-4 py-3.5 text-base font-bold transition-colors ${
              orderType === 'retiro' ? 'border-brand bg-brand/10 text-brand-dark' : 'border-ink/15 text-ink/70 hover:border-ink/30'
            }`}
          >
            Retiro en tienda
          </button>
          <button
            type="button"
            onClick={() => setOrderType('delivery')}
            className={`flex-1 rounded-xl border-2 px-4 py-3.5 text-base font-bold transition-colors ${
              orderType === 'delivery' ? 'border-brand bg-brand/10 text-brand-dark' : 'border-ink/15 text-ink/70 hover:border-ink/30'
            }`}
          >
            Delivery
          </button>
        </div>

        {orderType === 'delivery' && (
          <div className="mt-4">
            <Field label="Dirección de entrega" htmlFor="cart-address" required>
              <Textarea
                id="cart-address"
                placeholder="Calle, casa/apto, punto de referencia…"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
            </Field>
          </div>
        )}
      </Card>

      <Card className="flex items-center justify-between p-4">
        <span className="text-lg font-bold text-ink">Total del pedido</span>
        <span className="text-2xl font-black text-ink tabular-nums">{formatPrice(grandTotal)}</span>
      </Card>

      <Button size="lg" onClick={handleConfirmClick} loading={confirming}>
        {confirming ? 'Confirmando…' : 'Confirmar pedido'}
      </Button>

      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} onReady={handleCheckoutReady} />
    </div>
  )
}
