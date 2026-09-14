import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../state/CartProvider'
import { useAuth } from '../state/AuthProvider'
import { submitOrder } from '../lib/checkout'
import { formatPrice } from '../lib/format'
import { ORDER_TYPE_LABEL } from '../lib/orderStatus'
import { Button, Card, Field, Textarea } from '../shared/components/ui'
import { useToast } from '../shared/components/Toast'
import CheckoutModal from '../components/CheckoutModal'
import ProductImage from '../components/ProductImage'

function StoreIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 9.5 5 4h14l1.5 5.5" />
      <path d="M3.5 9.5a2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.8 0 2.8 2.8 0 0 0 5.6 0" />
      <path d="M5 12v8h14v-8M10 20v-4.5h4V20" />
    </svg>
  )
}

function DeliveryIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 16V6.5A1.5 1.5 0 0 1 4.5 5H13v11" />
      <path d="M13 9h4l4 4v3h-2" />
      <circle cx="7.5" cy="17.5" r="2" />
      <circle cx="17" cy="17.5" r="2" />
      <path d="M9.5 17.5H15" />
    </svg>
  )
}

function StepButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-sm transition active:scale-90 hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-brand-dark"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" aria-hidden="true">
        <path strokeLinecap="round" d={children === '+' ? 'M12 5v14M5 12h14' : 'M5 12h14'} />
      </svg>
    </button>
  )
}

export default function CartPage() {
  const { items, itemCount, grandTotal, removeItem, updateQuantity, clearCart } = useCart()
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
      <div className="flex animate-fade-up flex-col items-center py-12 text-center">
        <span
          aria-hidden="true"
          className="flex h-28 w-28 items-center justify-center rounded-[32px] rounded-tr-[56px] bg-white text-brand-dark shadow-card"
        >
          <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5.5 8h13l-1 12.5a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5Z" />
            <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" />
          </svg>
        </span>
        <h1 className="mt-6 font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink">Tu carrito está vacío</h1>
        <p className="mt-2 max-w-xs text-[15px] text-muted">Agrega productos del catálogo para armar tu pedido.</p>
        <Button size="lg" className="mt-6" onClick={() => navigate('/catalogo')}>
          Ver el catálogo
        </Button>
      </div>
    )
  }

  return (
    <div className="flex animate-fade-up flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-dark">Tu pedido</p>
          <h1 className="mt-1 font-display text-[32px] font-extrabold leading-none tracking-[-0.035em] text-ink">Tu carrito</h1>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-sm font-bold tabular-nums text-ink shadow-card">
          {itemCount} producto{itemCount === 1 ? '' : 's'}
        </span>
      </div>

      <Card className="divide-y divide-ink/5 px-4">
        {items.map((item) => (
          <div key={item.productId} className="flex gap-3 py-4">
            <span className="h-[76px] w-[76px] shrink-0 rounded-[18px] rounded-tr-[30px] bg-brand-light p-2.5">
              <ProductImage src={item.productImage} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 pt-0.5 text-[15px] font-bold leading-snug text-ink">{item.productName}</p>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  aria-label={`Quitar ${item.productName}`}
                  className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-danger-light hover:text-danger focus-visible:outline-2 focus-visible:outline-danger"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.8 12.5a1.5 1.5 0 0 0 1.5 1.5h6.4a1.5 1.5 0 0 0 1.5-1.5L17.5 7M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
              <p className="text-xs tabular-nums text-muted">{formatPrice(item.unitPrice)} c/u</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-0.5 rounded-full bg-cream p-0.5">
                  <StepButton
                    label={`Quitar una unidad de ${item.productName}`}
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  >
                    −
                  </StepButton>
                  <span className="w-8 text-center font-display text-base font-extrabold tabular-nums">{item.quantity}</span>
                  <StepButton
                    label={`Agregar una unidad de ${item.productName}`}
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  >
                    +
                  </StepButton>
                </div>
                <span className="font-display text-lg font-extrabold tracking-tight tabular-nums text-ink">
                  {formatPrice(item.unitPrice * item.quantity)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </Card>

      <Card className="p-4">
        <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-ink">Método de entrega</h2>
        <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-[22px] bg-cream p-1.5">
          {[
            ['retiro', 'Retiro en tienda', <StoreIcon key="retiro" />],
            ['delivery', 'Delivery', <DeliveryIcon key="delivery" />],
          ].map(([value, label, icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={orderType === value}
              onClick={() => setOrderType(value)}
              className={`flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-[18px] px-2 text-[15px] font-bold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark ${orderType === value ? 'bg-white text-brand-dark shadow-card ring-2 ring-brand-dark' : 'text-muted hover:bg-white/60 hover:text-ink'}`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {orderType === 'delivery' && (
          <div className="mt-4 animate-fade-up">
            <Field label="Dirección de entrega" htmlFor="cart-address" required>
              <Textarea
                id="cart-address"
                placeholder="Calle, casa/apto, punto de referencia…"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className="bg-cream"
              />
            </Field>
          </div>
        )}
      </Card>

      <Card className="relative p-5">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Entrega</span>
          <span className="font-semibold text-ink">{ORDER_TYPE_LABEL[orderType]}</span>
        </div>
        <div className="relative my-4 border-t-2 border-dashed border-ink/10">
          <span aria-hidden="true" className="absolute -left-8 -top-3 h-6 w-6 rounded-full bg-cream" />
          <span aria-hidden="true" className="absolute -right-8 -top-3 h-6 w-6 rounded-full bg-cream" />
        </div>
        <div className="flex items-end justify-between gap-3">
          <span className="text-base font-bold text-ink">Total del pedido</span>
          <span className="font-display text-[32px] font-extrabold leading-none tracking-tight tabular-nums text-ink">
            {formatPrice(grandTotal)}
          </span>
        </div>
      </Card>

      <div
        className="sticky bottom-0 -mx-4 bg-linear-to-t from-cream via-cream/90 to-transparent px-4 pt-6"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <Button size="lg" onClick={handleConfirmClick} loading={confirming} className="w-full">
          {confirming ? 'Confirmando…' : 'Confirmar pedido'}
        </Button>
      </div>

      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} onReady={handleCheckoutReady} />
    </div>
  )
}
