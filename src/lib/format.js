// Formato de precio en USD por defecto (referencia estable en Venezuela).
// Para cambiar de moneda, ajusta currency/locale aquí — es el único lugar
// donde se define el formato de precios en toda la app.
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

export function formatPrice(value) {
  return currencyFormatter.format(Number(value ?? 0))
}

const dateTimeFormatter = new Intl.DateTimeFormat('es-VE', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDateTime(value) {
  if (!value) return ''
  return dateTimeFormatter.format(new Date(value))
}

export function computeDiscountedPrice(product) {
  const price = Number(product.price ?? 0)
  if (!product.discount_type || product.discount_value == null) return price
  if (product.discount_type === 'porcentaje') {
    return Math.max(0, price * (1 - Number(product.discount_value) / 100))
  }
  return Math.max(0, price - Number(product.discount_value))
}
