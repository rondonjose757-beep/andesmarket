import { formatPrice } from './format.js'

export const ADMIN_SPEEDY_PHONE = '04143757566'

export const ADMIN_ORDER_STATUSES = [
  ['nuevo', 'Nuevo'],
  ['confirmado', 'Confirmado'],
  ['preparando', 'Preparando'],
  ['listo', 'Listo'],
  ['enviado', 'Enviado'],
  ['entregado', 'Entregado'],
  ['cancelado', 'Cancelado'],
]

export const ADMIN_STATUS_TRANSITIONS = {
  nuevo: { next: 'confirmado', label: 'Confirmar pedido' },
  confirmado: { next: 'preparando', label: 'Iniciar preparación' },
  preparando: { next: 'enviado', label: 'Marcar como enviado' },
  enviado: { next: 'entregado', label: 'Marcar como entregado' },
}

export const ADMIN_CANCEL_REASONS = [
  ['cliente_cancelo', 'Cliente canceló'],
  ['producto_no_disponible', 'Producto no disponible'],
  ['pago_no_confirmado', 'No se pudo confirmar el pago'],
  ['problema_delivery', 'Problema con dirección/delivery'],
  ['otro', 'Otro'],
]

export const ADMIN_EVENT_LABELS = {
  status_changed: 'Cambio de estado',
  cancelled: 'Pedido cancelado',
  items_modified: 'Productos modificados',
  payment_changed: 'Pago actualizado',
  speedy_requested: 'Solicitud de Speedy iniciada',
}

export const ADMIN_PAYMENT_METHODS = [
  ['pago_movil', 'Pago Móvil'],
  ['binance', 'Binance'],
  ['efectivo', 'Efectivo'],
]

const statusLabels = Object.fromEntries(ADMIN_ORDER_STATUSES)
const statusVariants = {
  nuevo: 'info', confirmado: 'brand', preparando: 'accent', listo: 'accent',
  enviado: 'brand', entregado: 'muted', cancelado: 'danger',
}

export function formatOrderNumber(value) {
  return `AM-${String(value ?? '').padStart(5, '0')}`
}

export function adminOrderStatus(status) {
  return { label: statusLabels[status] || 'Sin estado', variant: statusVariants[status] || 'neutral' }
}

export function isSafeMapsUrl(value) {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && [
      'maps.google.com', 'www.google.com', 'google.com', 'maps.app.goo.gl', 'goo.gl',
    ].includes(url.hostname)
  } catch {
    return false
  }
}

export function normalizeWhatsAppPhone(value) {
  let digits = String(value ?? '').replace(/\D/g, '')
  if (digits.startsWith('0')) digits = `58${digits.slice(1)}`
  return /^58\d{10}$/.test(digits) ? digits : null
}

export function buildWhatsAppUrl(phone, message) {
  const normalizedPhone = normalizeWhatsAppPhone(phone)
  if (!normalizedPhone || typeof message !== 'string' || !message.trim()) return null
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`
}

export function isSafeWhatsAppUrl(value) {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'wa.me'
      && /^\/58\d{10}$/.test(url.pathname)
      && Boolean(url.searchParams.get('text'))
  } catch {
    return false
  }
}

function paymentMethodLabel(method) {
  return Object.fromEntries(ADMIN_PAYMENT_METHODS)[method] || 'un método por coordinar'
}

export function buildCustomerWhatsAppMessage(order) {
  return `Hola${order.customer_name ? ` ${order.customer_name}` : ''}. Te escribimos por tu pedido ${formatOrderNumber(order.order_number)}. Total: ${formatPrice(order.total)}. Coordinemos el pago por ${paymentMethodLabel(order.payment_method)}.`
}

export function buildSpeedyWhatsAppMessage(order) {
  return [
    `Pedido: ${formatOrderNumber(order.order_number)}`,
    `Nombre: ${order.customer_name || 'No indicado'}`,
    `Teléfono: ${order.customer_phone || 'No indicado'}`,
    `Sector: ${order.sector_name || 'No indicado'}`,
    `Dirección: ${order.delivery_address || 'No indicado'}`,
    `Google Maps: ${isSafeMapsUrl(order.google_maps_url) ? order.google_maps_url : 'No indicado'}`,
    'Pedido listo para recoger en 10 minutos',
  ].join('\n')
}
