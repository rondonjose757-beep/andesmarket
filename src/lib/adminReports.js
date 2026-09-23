const CARACAS_TIME_ZONE = 'America/Caracas'

function caracasDateParts(value) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: CARACAS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value)
  return Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value: part }) => [type, Number(part)]))
}

function dateString(date) {
  return date.toISOString().slice(0, 10)
}

function addDays(value, days) {
  const result = new Date(value)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

export function getReportDateRange(preset, now = new Date()) {
  const { year, month, day } = caracasDateParts(now)
  const today = new Date(Date.UTC(year, month - 1, day))
  if (preset === 'ayer') return { from: dateString(addDays(today, -1)), to: dateString(addDays(today, -1)) }
  if (preset === 'semana') {
    const mondayOffset = (today.getUTCDay() + 6) % 7
    return { from: dateString(addDays(today, -mondayOffset)), to: dateString(addDays(today, 6 - mondayOffset)) }
  }
  return { from: dateString(today), to: dateString(today) }
}

function numberValue(value) {
  return Number(value || 0)
}

export function normalizeReport(row) {
  const value = row || {}
  return {
    summary: { orderCount: numberValue(value.order_count), salesTotal: numberValue(value.sales_total), deliveryTotal: numberValue(value.delivery_total) },
    products: (value.products || []).map((product) => ({ ...product, units: numberValue(product.units), sales_total: numberValue(product.sales_total) })),
    payments: (value.payments || []).map((payment) => ({ ...payment, order_count: numberValue(payment.order_count), sales_total: numberValue(payment.sales_total) })),
    paymentStates: (value.payment_states || []).map((state) => ({ ...state, order_count: numberValue(state.order_count), sales_total: numberValue(state.sales_total) })),
  }
}

export { CARACAS_TIME_ZONE }
