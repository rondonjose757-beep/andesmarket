import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, Button, Card, Field, Select, Textarea } from '../../shared/components/ui'
import { adminClient } from '../../lib/adminSupabaseClient'
import { ADMIN_CANCEL_REASONS, ADMIN_EVENT_LABELS, ADMIN_PAYMENT_METHODS, ADMIN_SPEEDY_PHONE, ADMIN_STATUS_TRANSITIONS, adminOrderStatus, buildCustomerWhatsAppMessage, buildSpeedyWhatsAppMessage, buildWhatsAppUrl, formatOrderNumber, isSafeMapsUrl, isSafeWhatsAppUrl } from '../../lib/adminOrders'
import { formatDateTime, formatPrice } from '../../lib/format'
import AdminHeading from '../../components/admin/AdminHeading'

function DetailLine({ label, children }) { return <div className="space-y-1"><dt className="text-xs font-bold uppercase tracking-wide text-muted">{label}</dt><dd className="leading-relaxed text-ink">{children || 'No indicado'}</dd></div> }
function hasRegisteredPayment(order) { return order.payment_status === 'confirmado' || Boolean(order.payment_method) || ['pendiente_speedy', 'recibido'].includes(order.cash_handover_status) }

export default function AdminOrderDetailPage() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelNote, setCancelNote] = useState('')
  const [paymentWarningConfirmed, setPaymentWarningConfirmed] = useState(false)
  const [editingItems, setEditingItems] = useState(false)
  const [catalogProducts, setCatalogProducts] = useState([])
  const [newProductId, setNewProductId] = useState('')
  const [draftItems, setDraftItems] = useState([])
  const [itemsError, setItemsError] = useState('')
  const [paymentMethodDraft, setPaymentMethodDraft] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [speedyBusy, setSpeedyBusy] = useState(false)
  const [speedyError, setSpeedyError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const { data, error: requestError } = await adminClient.rpc('admin_order_detail', { p_order_id: orderId })
    if (requestError) setError('No pudimos cargar este pedido. Intenta nuevamente.')
    else if (!data?.[0]) setError('Este pedido no está disponible.')
    else setOrder(data[0])
    setLoading(false)
  }, [orderId])
  useEffect(() => { void load() }, [load])

  const transition = useMemo(() => order && ADMIN_STATUS_TRANSITIONS[order.status], [order])
  const paymentRegistered = order ? hasRegisteredPayment(order) : false
  const historical = Boolean(order?.is_historical)
  const editable = order && !historical && ['nuevo', 'confirmado', 'preparando'].includes(order.status)
  const selectedPaymentMethod = paymentMethodDraft || order?.payment_method || ''
  const customerWhatsAppUrl = order && buildWhatsAppUrl(order.customer_phone, buildCustomerWhatsAppMessage(order))
  const speedyWhatsAppUrl = order && buildWhatsAppUrl(ADMIN_SPEEDY_PHONE, buildSpeedyWhatsAppMessage(order))

  async function startEditingItems() {
    setDraftItems(order.items.map((item) => ({ id: item.id, product_id: item.product_id, product_name: item.product_name, unit_price: item.unit_price, quantity: item.quantity })))
    setItemsError('')
    const { data, error: productsError } = await adminClient.from('products').select('id,name,price,discount_type,discount_value').eq('active', true).order('name')
    if (productsError) { setItemsError('No pudimos cargar el catálogo activo.'); return }
    setCatalogProducts(data || [])
    setNewProductId('')
    setEditingItems(true)
  }

  function addCatalogProduct() {
    const product = catalogProducts.find((item) => item.id === newProductId)
    if (!product || draftItems.some((item) => item.product_id === product.id)) return
    const discount = product.discount_type === 'porcentaje' ? Number(product.price) * Number(product.discount_value || 0) / 100 : Number(product.discount_value || 0)
    setDraftItems((items) => [...items, { product_id: product.id, product_name: product.name, unit_price: Math.max(0, Number(product.price) - discount), quantity: 1, isNew: true }])
    setNewProductId('')
  }

  function updateDraftQuantity(itemId, quantity) {
    setDraftItems((items) => items.map((item) => (item.id || item.product_id) === itemId ? { ...item, quantity: Math.max(1, Number(quantity) || 1) } : item))
  }

  async function saveItems() {
    if (!order || !draftItems.length) {
      setItemsError('El pedido debe conservar al menos un producto.')
      return
    }
    setActionBusy(true); setItemsError('')
    const { data, error: requestError } = await adminClient.rpc('admin_update_order_items', {
      p_order_id: order.id,
      p_items: draftItems.map((item) => item.isNew ? ({ product_id: item.product_id, quantity: item.quantity }) : ({ id: item.id, quantity: item.quantity })),
      p_expected_version: order.version,
    })
    const result = data?.[0]
    if (requestError || !result?.success) setItemsError({ version_conflict: 'El pedido cambió en otra sesión. Recarga el detalle.', not_editable: 'Este pedido ya no admite modificaciones.', empty_items: 'El pedido debe conservar al menos un producto.' }[result?.outcome] || 'No pudimos guardar los productos.')
    else { setEditingItems(false); await load() }
    setActionBusy(false)
  }

  async function recordPayment() {
    if (!order || !selectedPaymentMethod) {
      setPaymentError('Selecciona un método de pago.')
      return
    }
    setActionBusy(true); setPaymentError('')
    const { data, error: requestError } = await adminClient.rpc('admin_record_payment', {
      p_order_id: order.id,
      p_payment_method: selectedPaymentMethod,
      p_expected_version: order.version,
    })
    const result = data?.[0]
    if (requestError || !result?.success) setPaymentError({ version_conflict: 'El pedido cambió en otra sesión. Recarga el detalle.', not_editable: 'Este pedido ya no admite cambios de pago.', invalid_method: 'Selecciona un método de pago válido.' }[result?.outcome] || 'No pudimos registrar el pago.')
    else { setPaymentMethodDraft(''); await load() }
    setActionBusy(false)
  }

  function openWhatsApp(url) {
    if (!isSafeWhatsAppUrl(url)) {
      setSpeedyError('No pudimos validar el enlace de WhatsApp.')
      return false
    }
    const popup = window.open(url, '_blank', 'noopener,noreferrer')
    if (!popup) setSpeedyError('El navegador bloqueó WhatsApp. Usa el enlace para abrirlo manualmente.')
    return Boolean(popup)
  }

  async function requestSpeedy() {
    if (!order || !speedyWhatsAppUrl) {
      setSpeedyError('No pudimos preparar el enlace de WhatsApp para Speedy.')
      return
    }
    setSpeedyBusy(true); setSpeedyError('')
    if (order.speedy_requested_at) {
      openWhatsApp(speedyWhatsAppUrl)
      setSpeedyBusy(false)
      return
    }
    const { data, error: requestError } = await adminClient.rpc('mark_speedy_requested', { p_order_id: order.id, p_expected_version: order.version })
    const result = data?.[0]
    if (requestError || !result?.success) {
      setSpeedyError({ version_conflict: 'El pedido cambió en otra sesión. Recarga el detalle.', not_ready: 'Speedy solo se puede solicitar cuando el pedido está preparando.' }[result?.outcome] || 'No pudimos iniciar la solicitud de Speedy.')
    } else {
      setOrder((current) => ({ ...current, speedy_requested_at: result.speedy_requested_at, version: result.version, events: [...(current.events || []), { event_type: 'speedy_requested', created_at: result.speedy_requested_at, after_data: { initiated_from: 'admin_dashboard' } }] }))
      openWhatsApp(speedyWhatsAppUrl)
    }
    setSpeedyBusy(false)
  }

  async function changeStatus() {
    if (!order || !transition) return
    setActionBusy(true); setActionError('')
    const { data, error: requestError } = await adminClient.rpc('admin_change_order_status', { p_order_id: order.id, p_new_status: transition.next, p_expected_version: order.version })
    const result = data?.[0]
    if (requestError || !result?.success) setActionError(result?.outcome === 'version_conflict' ? 'El pedido cambió en otra sesión. Recarga el detalle.' : 'No pudimos cambiar el estado del pedido.')
    else await load()
    setActionBusy(false)
  }

  async function cancelOrder(event) {
    event.preventDefault(); if (!order) return
    setActionBusy(true); setActionError('')
    const { data, error: requestError } = await adminClient.rpc('admin_cancel_order', { p_order_id: order.id, p_reason: cancelReason, p_note: cancelNote || null, p_payment_warning_confirmed: paymentRegistered ? paymentWarningConfirmed : true, p_expected_version: order.version })
    const result = data?.[0]
    if (requestError || !result?.success) setActionError({ note_required: 'Escribe una observación para el motivo «Otro».', invalid_note: 'La observación no puede superar 500 caracteres.', payment_warning_required: 'Confirma la advertencia de pago registrado para continuar.', version_conflict: 'El pedido cambió en otra sesión. Recarga el detalle.' }[result?.outcome] || 'No pudimos cancelar el pedido.')
    else { setCancelOpen(false); setCancelReason(''); setCancelNote(''); setPaymentWarningConfirmed(false); await load() }
    setActionBusy(false)
  }

  if (loading) return <div role="status" aria-busy="true" className="space-y-4"><div className="h-10 w-48 animate-pulse rounded bg-cream-dim" /><div className="h-96 animate-pulse rounded-[24px] bg-cream-dim" /></div>
  if (error) return <section className="space-y-5"><Link to="/admin" className="text-sm font-bold text-brand-dark">← Volver a pedidos</Link><Card className="space-y-4 p-6"><p role="alert" className="font-semibold text-danger">{error}</p><Button onClick={() => void load()}>Volver a intentar</Button></Card></section>

  const status = adminOrderStatus(order.status)
  const draftSubtotal = draftItems.reduce((sum, item) => sum + Number(item.unit_price) * item.quantity, 0)
  return <section className="space-y-6">
    <Link to="/admin" className="inline-flex text-sm font-bold text-brand-dark hover:text-brand-deep">← Volver a pedidos</Link>
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="space-y-2"><p className="text-sm font-bold text-brand-dark">Detalle de bodega</p><AdminHeading>Pedido {formatOrderNumber(order.order_number)}</AdminHeading></div><Badge variant={status.variant}>{status.label}</Badge></div>
    {(historical || transition || !['entregado', 'cancelado'].includes(order.status)) && <Card className="space-y-4 p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-xl font-bold">Operación</h2><p className="mt-1 text-sm text-muted">{historical ? 'Pedido histórico: solo consulta, sin acciones operativas.' : 'Cada acción queda registrada en el historial.'}</p></div><div className="flex flex-wrap gap-3">{!historical && transition && <Button onClick={() => void changeStatus()} loading={actionBusy}>{transition.label}</Button>}{!historical && !['entregado', 'cancelado'].includes(order.status) && <Button variant="danger" onClick={() => { setActionError(''); setCancelOpen(true) }}>Cancelar pedido</Button>}</div></div>{actionError && !cancelOpen && <p role="alert" className="text-sm font-semibold text-danger">{actionError}</p>}</Card>}
    {cancelOpen && <Card className="space-y-5 border-2 border-danger/20 p-6" aria-labelledby="cancelar-pedido-titulo"><div><h2 id="cancelar-pedido-titulo" className="font-display text-xl font-bold">Cancelar pedido</h2><p className="mt-1 text-sm text-muted">Esta acción no se puede deshacer.</p></div>{paymentRegistered && <div role="alert" className="space-y-3 rounded-2xl bg-danger-light p-4 text-sm text-danger"><p className="font-bold">Este pedido tiene un pago registrado.</p><p>La cancelación no ejecuta reembolsos ni conciliaciones. Confirma que deseas continuar.</p><label className="flex items-start gap-3 font-semibold"><input type="checkbox" checked={paymentWarningConfirmed} onChange={(event) => setPaymentWarningConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-brand-dark" />Entiendo la advertencia y deseo cancelar.</label></div>}<form className="space-y-4" onSubmit={cancelOrder}><Field label="Motivo" htmlFor="cancel-reason" required><Select id="cancel-reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} required><option value="">Selecciona un motivo</option>{ADMIN_CANCEL_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field><Field label="Observación" htmlFor="cancel-note" hint="Máximo 500 caracteres. Obligatoria para «Otro»." required={cancelReason === 'otro'}><Textarea id="cancel-note" value={cancelNote} onChange={(event) => setCancelNote(event.target.value)} maxLength={500} placeholder="Añade contexto si hace falta" /></Field>{actionError && <p role="alert" className="text-sm font-semibold text-danger">{actionError}</p>}<div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setCancelOpen(false)}>Volver</Button><Button type="submit" variant="danger" loading={actionBusy} disabled={paymentRegistered && !paymentWarningConfirmed}>Confirmar cancelación</Button></div></form></Card>}
    <Card className="space-y-5 p-6"><h2 className="font-display text-xl font-bold">Entrega</h2><dl className="grid gap-5 sm:grid-cols-2"><DetailLine label="Cliente">{order.customer_name}</DetailLine><DetailLine label="Teléfono">{order.customer_phone}</DetailLine><DetailLine label="Sector">{order.sector_name}</DetailLine><DetailLine label="Creado">{formatDateTime(order.created_at)}</DetailLine><DetailLine label="Dirección">{order.delivery_address}</DetailLine><DetailLine label="Indicaciones">{order.delivery_instructions}</DetailLine>{order.last_operator_name && <DetailLine label="Último operador">{order.last_operator_name}</DetailLine>}{order.speedy_operator_name && <DetailLine label="Operador de Speedy">{order.speedy_operator_name}</DetailLine>}{order.cancellation_operator_name && <DetailLine label="Operador de cancelación">{order.cancellation_operator_name}</DetailLine>}</dl>{isSafeMapsUrl(order.google_maps_url) && <a href={order.google_maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex font-bold text-brand-dark underline underline-offset-4">Abrir ubicación en Google Maps</a>}{order.google_maps_url && !isSafeMapsUrl(order.google_maps_url) && <p className="text-sm text-muted">Ubicación registrada no disponible como enlace.</p>}</Card>
    <Card className="space-y-5 p-6"><div><h2 className="font-display text-xl font-bold">Contactos</h2><p className="mt-1 text-sm text-muted">Los enlaces abren WhatsApp con un mensaje revisable. No confirman el envío del mensaje.</p></div><div className="flex flex-wrap gap-3">{customerWhatsAppUrl ? <a href={customerWhatsAppUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center rounded-full bg-brand-dark px-5 text-[15px] font-bold text-white shadow-float">Contactar al cliente</a> : <p className="text-sm text-muted">No hay un teléfono válido para contactar al cliente.</p>}{!historical && (order.status === 'preparando' || order.speedy_requested_at) ? (order.speedy_requested_at ? <><Button variant="secondary" loading={speedyBusy} onClick={() => void requestSpeedy()}>Abrir solicitud de Speedy</Button>{speedyWhatsAppUrl && <a href={speedyWhatsAppUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center rounded-full bg-white px-5 text-[15px] font-bold text-brand-dark ring-1 ring-ink/10">Abrir enlace</a>}</> : <Button variant="secondary" loading={speedyBusy} onClick={() => void requestSpeedy()}>Solicitar Speedy</Button>) : null}</div>{order.speedy_requested_at && <p className="text-sm text-muted">Solicitud iniciada desde el dashboard el {formatDateTime(order.speedy_requested_at)}. Esto no confirma que WhatsApp haya enviado el mensaje.</p>}{speedyError && <p role="alert" className="text-sm font-semibold text-danger">{speedyError}</p>}</Card>
    <Card className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 p-6"><h2 className="font-display text-xl font-bold">Productos</h2>{editable && !editingItems && <Button variant="secondary" size="sm" onClick={startEditingItems}>Editar productos</Button>}</div>{editingItems ? <div className="space-y-5 p-6"><p className="text-sm text-muted">Cambia cantidades o quita líneas. El servidor recalculará los importes antes de guardar.</p><div className="flex flex-wrap gap-3"><Field label="Producto del catálogo" htmlFor="admin-product-select"><Select id="admin-product-select" value={newProductId} onChange={(event) => setNewProductId(event.target.value)}><option value="">Selecciona un producto</option>{catalogProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</Select></Field><Button type="button" variant="secondary" onClick={addCatalogProduct} disabled={!newProductId}>Agregar producto</Button></div><div className="grid gap-3 rounded-2xl bg-cream p-4 text-sm sm:grid-cols-2"><p><span className="text-muted">Subtotal actual:</span> <strong>{formatPrice(order.subtotal)}</strong></p><p><span className="text-muted">Subtotal propuesto:</span> <strong>{formatPrice(draftSubtotal)}</strong></p><p><span className="text-muted">Total actual:</span> <strong>{formatPrice(order.total)}</strong></p><p><span className="text-muted">Total propuesto:</span> <strong>{formatPrice(draftSubtotal + Number(order.delivery_fee || 0))}</strong></p></div><ul className="space-y-3">{draftItems.map((item, index) => <li key={item.id || item.product_id || index} className="grid gap-3 rounded-2xl bg-cream p-4 sm:grid-cols-[1fr_7rem_auto] sm:items-end"><div><p className="font-bold">{item.product_name}</p><p className="mt-1 text-sm text-muted">{formatPrice(item.unit_price)} por unidad</p></div><Field label="Cantidad" htmlFor={`quantity-${item.id || item.product_id}`}><input id={`quantity-${item.id || item.product_id}`} aria-label={`Cantidad de ${item.product_name}`} type="number" min="1" inputMode="numeric" value={item.quantity} onChange={(event) => updateDraftQuantity(item.id || item.product_id, event.target.value)} className="w-full rounded-2xl border-0 bg-white px-4 py-3 text-base ring-1 ring-ink/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark" /></Field><Button variant="danger" size="sm" onClick={() => setDraftItems((items) => items.filter((draft) => (draft.id || draft.product_id) !== (item.id || item.product_id)))}>Quitar {item.product_name}</Button></li>)}</ul>{itemsError && <p role="alert" className="text-sm font-semibold text-danger">{itemsError}</p>}<div className="flex flex-wrap justify-end gap-3"><Button variant="secondary" onClick={() => setEditingItems(false)}>Cancelar</Button><Button onClick={() => void saveItems()} loading={actionBusy} disabled={!draftItems.length}>Guardar cambios</Button></div></div> : <><ul className="divide-y divide-ink/10">{order.items.map((item, index) => <li key={item.id || `${item.product_name}-${index}`} className="grid grid-cols-[1fr_auto] gap-4 p-5"><div><p className="font-bold">{item.product_name}</p><p className="mt-1 text-sm text-muted">{item.quantity} × {formatPrice(item.unit_price)}</p></div><p className="font-display font-extrabold">{formatPrice(item.line_total)}</p></li>)}</ul><div className="space-y-2 border-t border-ink/10 p-6 text-sm"><p className="flex justify-between"><span className="text-muted">Subtotal</span><span className="font-bold">{formatPrice(order.subtotal)}</span></p><p className="flex justify-between"><span className="text-muted">Delivery</span><span className="font-bold">{formatPrice(order.delivery_fee)}</span></p><p className="flex justify-between border-t border-ink/10 pt-3 font-display text-lg font-extrabold"><span>Total</span><span>{formatPrice(order.total)}</span></p></div></>}</Card>
    <Card className="space-y-5 p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-xl font-bold">Pago</h2><p className="mt-1 text-sm text-muted">La confirmación es manual y queda auditada.</p></div><Badge variant={order.payment_status === 'confirmado' ? 'brand' : 'muted'}>{order.payment_status === 'confirmado' ? 'Confirmado' : 'Pendiente'}</Badge></div>{editable ? <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"><Field label="Método" htmlFor="payment-method"><Select id="payment-method" value={selectedPaymentMethod} onChange={(event) => { setPaymentMethodDraft(event.target.value); setPaymentError('') }}><option value="">Selecciona un método</option>{ADMIN_PAYMENT_METHODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field><Button onClick={() => void recordPayment()} loading={actionBusy} disabled={!selectedPaymentMethod}>{order.payment_status === 'confirmado' ? 'Guardar cambio de pago' : 'Confirmar pago'}</Button></div> : <p className="text-sm text-muted">Este pedido ya no admite cambios de pago.</p>}{selectedPaymentMethod === 'efectivo' && <p className="text-sm text-muted">Para Efectivo solo se registra el método y la confirmación. La conciliación con Speedy queda pendiente para una etapa posterior.</p>}{paymentError && <p role="alert" className="text-sm font-semibold text-danger">{paymentError}</p>}<dl className="grid gap-4 border-t border-ink/10 pt-4 sm:grid-cols-3"><DetailLine label="Método registrado">{order.payment_method === 'pago_movil' ? 'Pago Móvil' : order.payment_method === 'efectivo' ? 'Efectivo' : order.payment_method === 'binance' ? 'Binance' : 'Pendiente'}</DetailLine><DetailLine label="Estado">{order.payment_status}</DetailLine><DetailLine label="Efectivo / Speedy">{order.cash_handover_status === 'no_aplica' ? 'No gestionado en este módulo' : order.cash_handover_status}</DetailLine></dl></Card>
    <Card className="space-y-4 p-6"><h2 className="font-display text-xl font-bold">Historial operativo</h2>{order.events?.length ? <ol className="space-y-4">{order.events.map((event, index) => <li key={`${event.created_at}-${index}`} className="border-l-2 border-brand-light pl-4"><p className="font-bold">{ADMIN_EVENT_LABELS[event.event_type] || 'Evento operativo'}</p><p className="text-sm text-muted">{formatDateTime(event.created_at)}{event.new_status ? ` · ${adminOrderStatus(event.new_status).label}` : ''}{event.operator_name ? ` · ${event.operator_name}` : ''}</p>{event.reason && <p className="mt-1 text-sm">Motivo: {ADMIN_CANCEL_REASONS.find(([value]) => value === event.reason)?.[1] || event.reason}</p>}{event.note && <p className="mt-1 text-sm">{event.note}</p>}</li>)}</ol> : <p className="text-sm text-muted">Aún no hay cambios operativos registrados.</p>}</Card>
  </section>
}
