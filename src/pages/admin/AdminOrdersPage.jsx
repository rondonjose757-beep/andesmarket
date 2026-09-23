import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, Field, Input, Select } from '../../shared/components/ui'
import { adminClient } from '../../lib/adminSupabaseClient'
import { ADMIN_ORDER_STATUSES, adminOrderStatus, formatOrderNumber } from '../../lib/adminOrders'
import { formatDateTime, formatPrice } from '../../lib/format'
import { useAdminAuth } from '../../state/AdminAuthContext'
import AdminHeading from '../../components/admin/AdminHeading'
import AdminNavigation from '../../components/admin/AdminNavigation'

const PAGE_SIZE = 50

function OrderCard({ order }) {
  const status = adminOrderStatus(order.status)
  return <Link to={`/admin/pedidos/${order.id}`} className="block rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark">
    <Card className="space-y-4 p-5 transition hover:-translate-y-0.5 hover:shadow-float">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-extrabold text-ink">{formatOrderNumber(order.order_number)}</p>
          <p className="mt-1 text-xs font-semibold text-muted">{formatDateTime(order.created_at)}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2"><Badge variant={status.variant}>{status.label}</Badge>{order.is_historical && <Badge variant="muted">Histórico</Badge>}</div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <p><span className="block text-xs font-bold uppercase tracking-wide text-muted">Cliente</span>{order.customer_name}</p>
        <p><span className="block text-xs font-bold uppercase tracking-wide text-muted">Sector</span>{order.sector_name || 'Sin sector'}</p>
        <p><span className="block text-xs font-bold uppercase tracking-wide text-muted">Pago</span>{order.payment_method === 'efectivo' ? 'Efectivo' : order.payment_method || 'Pendiente'}</p>
        {order.last_operator_name && <p><span className="block text-xs font-bold uppercase tracking-wide text-muted">Último operador</span>{order.last_operator_name}</p>}
        <p className="font-display text-base font-extrabold"><span className="block font-sans text-xs font-bold uppercase tracking-wide text-muted">Total</span>{formatPrice(order.total)}</p>
      </div>
    </Card>
  </Link>
}

export default function AdminOrdersPage() {
  const { operator, logout, busy } = useAdminAuth()
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const requestId = useRef(0)

  const load = useCallback(async (nextStatus = status, nextQuery = query, nextOffset = offset) => {
    const currentRequest = ++requestId.current
    setLoading(true)
    setError('')
    const { data, error: requestError } = await adminClient.rpc('admin_order_inbox', {
      p_status: nextStatus || null,
      p_query: nextQuery.trim() || null,
      p_limit: PAGE_SIZE,
      p_offset: nextOffset,
    })
    if (currentRequest !== requestId.current) return
    if (requestError) {
      setOrders([])
      setError('No pudimos cargar los pedidos. Intenta nuevamente.')
    } else { setOrders(data || []); setHasNext((data || []).length === PAGE_SIZE) }
    setLoading(false)
  }, [offset, query, status])

  useEffect(() => { void load() }, [load])

  function submit(event) {
    event.preventDefault()
    setOffset(0)
    void load(status, query, 0)
  }

  function changeStatus(event) {
    const nextStatus = event.target.value
    setStatus(nextStatus)
    setOffset(0)
    void load(nextStatus, query, 0)
  }

  return <section className="space-y-7">
    <AdminNavigation />
    <div className="space-y-3">
      <p className="text-sm font-bold text-brand-dark">Bodega · {operator.display_name}</p>
      <AdminHeading>Pedidos de bodega</AdminHeading>
      <p className="leading-relaxed text-muted">Los pedidos abiertos aparecen primero. Abre un pedido para operarlo; los históricos son solo de consulta.</p>
    </div>

    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]" aria-label="Filtros de pedidos">
      <Field label="Buscar pedidos" htmlFor="admin-order-search">
        <Input id="admin-order-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Número, nombre o teléfono" maxLength={100} disabled={loading} />
      </Field>
      <Field label="Estado" htmlFor="admin-order-status">
        <Select id="admin-order-status" value={status} onChange={changeStatus}>
          <option value="">Todos</option>
          {ADMIN_ORDER_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </Field>
      <Button type="submit" variant="secondary" disabled={loading} className="sm:col-span-2">Buscar</Button>
    </form>

    {loading && <div role="status" aria-busy="true" className="space-y-3">
      {[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-[22px] bg-cream-dim" />)}
    </div>}
    {error && <Card className="space-y-4 p-6">
      <p role="alert" className="font-semibold text-danger">{error}</p>
      <Button onClick={() => void load()} disabled={loading}>Volver a intentar</Button>
    </Card>}
    {!loading && !error && orders.length === 0 && <Card className="p-7 text-center">
      <h2 className="font-display text-xl font-bold">No encontramos pedidos</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">Prueba con otro estado o término de búsqueda.</p>
    </Card>}
    {!loading && !error && orders.length > 0 && <div className="space-y-3" aria-label="Bandeja de pedidos">
      {orders.map((order) => <OrderCard key={order.id} order={order} />)}
    </div>}
    {!loading && !error && (offset > 0 || hasNext) && <div className="flex justify-between gap-3"><Button variant="secondary" disabled={offset === 0} onClick={() => { const next = Math.max(0, offset - PAGE_SIZE); setOffset(next); void load(status, query, next) }}>Anterior</Button><Button variant="secondary" disabled={!hasNext} onClick={() => { const next = offset + PAGE_SIZE; setOffset(next); void load(status, query, next) }}>Siguiente</Button></div>}
    <Button variant="ghost" onClick={logout} disabled={busy || loading} className="w-full">Cerrar sesión administrativa</Button>
  </section>
}
