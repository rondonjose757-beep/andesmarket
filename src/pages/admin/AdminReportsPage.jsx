import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, Field, Input, Select } from '../../shared/components/ui'
import AdminHeading from '../../components/admin/AdminHeading'
import AdminNavigation from '../../components/admin/AdminNavigation'
import { adminClient } from '../../lib/adminSupabaseClient'
import { getReportDateRange, normalizeReport } from '../../lib/adminReports'
import { formatPrice } from '../../lib/format'

const paymentLabels = { pago_movil: 'Pago Móvil', binance: 'Binance', efectivo: 'Efectivo', sin_registrar: 'Sin registrar' }
const paymentStateLabels = { confirmado: 'Confirmado', pendiente: 'Pendiente' }

export default function AdminReportsPage() {
  const [preset, setPreset] = useState('hoy')
  const initialRange = getReportDateRange('hoy')
  const [fromDate, setFromDate] = useState(initialRange.from)
  const [toDate, setToDate] = useState(initialRange.to)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (from = fromDate, to = toDate) => {
    setLoading(true); setError('')
    const { data, error: requestError } = await adminClient.rpc('admin_sales_report', { p_from_date: from, p_to_date: to })
    if (requestError || !data?.[0]) { setReport(null); setError('No pudimos cargar el reporte. Intenta nuevamente.') }
    else setReport(normalizeReport(data[0]))
    setLoading(false)
  }, [fromDate, toDate])

  useEffect(() => { void load() }, [load])

  function choosePreset(event) {
    const next = event.target.value
    setPreset(next)
    if (next !== 'rango') {
      const range = getReportDateRange(next)
      setFromDate(range.from); setToDate(range.to); void load(range.from, range.to)
    }
  }

  function submit(event) { event.preventDefault(); void load() }

  return <section className="space-y-7">
    <AdminNavigation />
    <div className="space-y-3"><p className="text-sm font-bold text-brand-dark">Bodega · Ventas</p><AdminHeading>Reportes básicos</AdminHeading><p className="leading-relaxed text-muted">Solo incluye pedidos entregados, usando sus líneas finales y la fecha de entrega en Caracas.</p></div>
    <Card className="p-6"><form onSubmit={submit} className="grid gap-4 sm:grid-cols-3 sm:items-end">
      <Field label="Período" htmlFor="report-period"><Select id="report-period" value={preset} onChange={choosePreset}><option value="hoy">Hoy</option><option value="ayer">Ayer</option><option value="semana">Esta semana</option><option value="rango">Rango personalizado</option></Select></Field>
      <Field label="Desde" htmlFor="report-from"><Input id="report-from" type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPreset('rango') }} /></Field>
      <Field label="Hasta" htmlFor="report-to"><Input id="report-to" type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPreset('rango') }} /></Field>
      <Button type="submit" variant="secondary" disabled={loading} className="sm:col-span-3">Consultar reporte</Button>
    </form></Card>
    {loading && <div role="status" aria-busy="true" className="h-72 animate-pulse rounded-[22px] bg-cream-dim" />}
    {error && <Card className="space-y-4 p-6"><p role="alert" className="font-semibold text-danger">{error}</p><Button onClick={() => void load()} disabled={loading}>Volver a intentar</Button></Card>}
    {!loading && report && <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3"><Metric label="Pedidos entregados" value={report.summary.orderCount} /><Metric label="Ventas totales" value={formatPrice(report.summary.salesTotal)} /><Metric label="Delivery cobrado" value={formatPrice(report.summary.deliveryTotal)} /></div>
      <Card className="overflow-hidden"><div className="border-b border-ink/10 p-6"><h2 className="font-display text-xl font-bold">Productos y unidades</h2></div>{report.products.length ? <div className="divide-y divide-ink/10">{report.products.map((product) => <div key={product.product_name} className="flex items-center justify-between gap-4 p-5"><div><p className="font-bold">{product.product_name}</p><p className="text-sm text-muted">{product.units} unidades</p></div><p className="font-display font-extrabold">{formatPrice(product.sales_total)}</p></div>)}</div> : <p className="p-6 text-sm text-muted">No hubo productos vendidos en este período.</p>}</Card>
      <Card className="overflow-hidden"><div className="border-b border-ink/10 p-6"><h2 className="font-display text-xl font-bold">Ventas por método de pago</h2></div>{report.payments.length ? <div className="divide-y divide-ink/10">{report.payments.map((payment) => <div key={payment.payment_method} className="flex items-center justify-between gap-4 p-5"><div><p className="font-bold">{paymentLabels[payment.payment_method] || payment.payment_method}</p><p className="text-sm text-muted">{payment.order_count} pedidos</p></div><p className="font-display font-extrabold">{formatPrice(payment.sales_total)}</p></div>)}</div> : <p className="p-6 text-sm text-muted">No hubo pagos registrados en este período.</p>}<p className="border-t border-ink/10 p-5 text-xs text-muted">La conciliación de efectivo pendiente o recibido por Speedy no forma parte de este reporte.</p></Card>
      <Card className="overflow-hidden"><div className="border-b border-ink/10 p-6"><h2 className="font-display text-xl font-bold">Ventas por estado de pago</h2></div>{report.paymentStates.length ? <div className="divide-y divide-ink/10">{report.paymentStates.map((state) => <div key={state.payment_status || 'sin_estado'} className="flex items-center justify-between gap-4 p-5"><div><p className="font-bold">{paymentStateLabels[state.payment_status] || 'Sin registrar'}</p><p className="text-sm text-muted">{state.order_count} {state.order_count === 1 ? 'pedido' : 'pedidos'}</p></div><p className="font-display font-extrabold">{formatPrice(state.sales_total)}</p></div>)}</div> : <p className="p-6 text-sm text-muted">No hay estados de pago registrados.</p>}</Card>
    </div>}
  </section>
}

function Metric({ label, value }) {
  return <Card className="space-y-2 p-5"><p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p><p className="font-display text-2xl font-extrabold text-brand-dark">{value}</p><Badge variant="muted">Entregados</Badge></Card>
}
