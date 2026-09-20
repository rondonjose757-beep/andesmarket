import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../state/CartProvider'
import { useAuth } from '../state/AuthProvider'
import { submitOrder } from '../lib/checkout'
import { formatPrice } from '../lib/format'
import { Button, Card, Field, Select, Textarea } from '../shared/components/ui'
import { useToast } from '../shared/components/Toast'
import { useDeliverySectors } from '../hooks/useDeliverySectors'
import CheckoutModal from '../components/CheckoutModal'
import ProductImage from '../components/ProductImage'

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

function orderErrorMessage(error) {
  const message = error?.message?.toLowerCase() ?? ''
  if (message.includes('producto') || message.includes('product')) {
    return 'Revisa los productos del carrito: uno o más ya no están disponibles.'
  }
  if (message.includes('sector')) return 'El sector seleccionado ya no está disponible. Elige otro.'
  if (message.includes('sesión') || message.includes('session') || error?.code === '42501') {
    return 'No pudimos validar tu sesión. Recarga la página e intenta de nuevo.'
  }
  return 'No se pudo confirmar tu pedido. Intenta de nuevo.'
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
  const { sectors, loading: sectorsLoading, error: sectorsError, retry: retrySectors } = useDeliverySectors()
  const notify = useToast()
  const navigate = useNavigate()
  const [sectorId, setSectorId] = useState('')
  const [address, setAddress] = useState('')
  const [instructions, setInstructions] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [sectorTouched, setSectorTouched] = useState(false)
  const [addressTouched, setAddressTouched] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const selectedSector = sectors.find((sector) => sector.id === sectorId)
  const deliveryFee = selectedSector ? Number(selectedSector.delivery_fee) : 0
  const estimatedTotal = grandTotal + deliveryFee
  const hasDestination = Boolean(address.trim() || googleMapsUrl)
  const formIsValid = Boolean(selectedSector && hasDestination)

  function captureLocation() {
    setSubmitError('')
    setLocationError('')

    if (!navigator.geolocation) {
      setLocationError('Tu navegador no permite capturar la ubicación. Puedes escribir la dirección de entrega.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setGoogleMapsUrl(`https://maps.google.com/?q=${coords.latitude},${coords.longitude}`)
        setLocationError('')
        setLocating(false)
      },
      (error) => {
        if (error.code === 1) {
          setLocationError('No permitiste el acceso a tu ubicación. Puedes intentarlo de nuevo o escribir la dirección de entrega.')
        } else if (error.code === 3) {
          setLocationError('La solicitud de ubicación tardó demasiado. Intenta de nuevo o escribe la dirección de entrega.')
        } else {
          setLocationError('No pudimos obtener tu ubicación. Intenta de nuevo o escribe la dirección de entrega.')
        }
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function removeLocation() {
    setGoogleMapsUrl('')
    setLocationError('')
    setSubmitError('')
  }

  const handleConfirm = useCallback(
    async (orderCustomer) => {
      setSectorTouched(true)
      setAddressTouched(true)
      if (!formIsValid) {
        return
      }
      setSubmitError('')
      setConfirming(true)
      try {
        const order = await submitOrder({
          customerId: orderCustomer.id,
          name: orderCustomer.name,
          phone: orderCustomer.phone,
          sectorId,
          address: address.trim() || null,
          instructions: instructions.trim() || null,
          googleMapsUrl: googleMapsUrl || null,
          items,
        })
        clearCart()
        navigate(`/pedido/${order.id}`)
      } catch (error) {
        const message = orderErrorMessage(error)
        setSubmitError(message)
        notify(message, 'error')
      } finally {
        setConfirming(false)
      }
    },
    [formIsValid, sectorId, address, instructions, googleMapsUrl, items, clearCart, navigate, notify],
  )

  function handleConfirmClick() {
    setSectorTouched(true)
    setAddressTouched(true)
    if (!formIsValid) return
    if (!customer) {
      setCheckoutOpen(true)
      return
    }
    handleConfirm(customer)
  }

  function handleCheckoutReady(newCustomer) {
    setCheckoutOpen(false)
    handleConfirm(newCustomer)
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
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand-dark">
            <DeliveryIcon />
          </span>
          <div>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-ink">Entrega por delivery</h2>
            <p className="text-sm text-muted">Selecciona dónde recibiremos tu pedido.</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {sectorsError ? (
            <div role="alert" className="rounded-2xl bg-danger-light px-4 py-3 text-sm font-semibold text-danger">
              <p>{sectorsError}</p>
              <button type="button" onClick={retrySectors} className="mt-2 underline underline-offset-2">Reintentar</button>
            </div>
          ) : (
            <Field
              label="Sector de entrega"
              htmlFor="cart-sector"
              required
              error={sectorTouched && !selectedSector ? 'Selecciona un sector de entrega.' : ''}
              hint="Puedes escribir para buscar dentro de la lista en dispositivos compatibles."
            >
              <Select
                id="cart-sector"
                value={sectorId}
                disabled={sectorsLoading}
                onBlur={() => setSectorTouched(true)}
                onChange={(event) => {
                  setSectorId(event.target.value)
                  setSubmitError('')
                }}
                className="bg-cream"
              >
                <option value="">{sectorsLoading ? 'Cargando sectores…' : 'Selecciona un sector'}</option>
                {sectors.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <div className="flex flex-col gap-2">
            <Button
              variant={googleMapsUrl ? 'secondary' : 'primary'}
              onClick={captureLocation}
              loading={locating}
              disabled={locating}
              className="w-full"
            >
              {locating ? 'Obteniendo ubicación…' : googleMapsUrl ? 'Cambiar ubicación' : 'Usar mi ubicación'}
            </Button>
            {googleMapsUrl && (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand-light px-4 py-3">
                <p role="status" className="text-sm font-bold text-brand-dark">Ubicación capturada</p>
                <button
                  type="button"
                  onClick={removeLocation}
                  className="shrink-0 text-sm font-bold text-brand-dark underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-brand-dark"
                >
                  Quitar ubicación
                </button>
              </div>
            )}
            {locationError && (
              <p role="alert" className="rounded-2xl bg-danger-light px-4 py-3 text-sm font-semibold text-danger">
                {locationError}
              </p>
            )}
          </div>

          <Field
            label="Dirección de entrega (opcional)"
            htmlFor="cart-address"
            hint="Puedes escribirla o usar la ubicación del dispositivo. Necesitamos al menos una de las dos."
            error={addressTouched && !hasDestination ? 'Escribe una dirección o usa la ubicación del dispositivo.' : ''}
          >
            <Textarea
              id="cart-address"
              placeholder="Calle, casa/apto, punto de referencia…"
              value={address}
              onBlur={() => setAddressTouched(true)}
              onChange={(event) => {
                setAddress(event.target.value)
                setSubmitError('')
              }}
              className="bg-cream"
            />
          </Field>

          <Field label="Indicaciones" htmlFor="cart-instructions" hint="Opcional. Por ejemplo: portón azul o tocar el timbre.">
            <Textarea
              id="cart-instructions"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              className="bg-cream"
            />
          </Field>

        </div>
      </Card>

      <Card className="relative p-5">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Subtotal estimado</span>
          <span className="font-semibold tabular-nums text-ink">{formatPrice(grandTotal)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm text-muted">
          <span>Delivery estimado</span>
          <span className="font-semibold tabular-nums text-ink">{selectedSector ? formatPrice(deliveryFee) : '—'}</span>
        </div>
        <div className="relative my-4 border-t-2 border-dashed border-ink/10">
          <span aria-hidden="true" className="absolute -left-8 -top-3 h-6 w-6 rounded-full bg-cream" />
          <span aria-hidden="true" className="absolute -right-8 -top-3 h-6 w-6 rounded-full bg-cream" />
        </div>
        <div className="flex items-end justify-between gap-3">
          <span className="text-base font-bold text-ink">Total estimado</span>
          <span className="font-display text-[32px] font-extrabold leading-none tracking-tight tabular-nums text-ink">
            {formatPrice(estimatedTotal)}
          </span>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">Los importes definitivos serán validados y calculados por AndesMarket al crear el pedido.</p>
      </Card>

      {submitError && (
        <p role="alert" className="rounded-[20px] bg-danger-light px-4 py-3 text-sm font-semibold text-danger">
          {submitError}
        </p>
      )}

      <div
        className="sticky bottom-0 -mx-4 bg-linear-to-t from-cream via-cream/90 to-transparent px-4 pt-6"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <Button
          size="lg"
          onClick={handleConfirmClick}
          loading={confirming}
          disabled={!formIsValid || sectorsLoading || Boolean(sectorsError)}
          className="w-full"
        >
          {confirming ? 'Confirmando…' : 'Confirmar pedido'}
        </Button>
      </div>

      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} onReady={handleCheckoutReady} />
    </div>
  )
}
