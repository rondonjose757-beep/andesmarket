import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../state/AuthProvider'
import { formatDateTime, formatPrice } from '../lib/format'
import { STATUS_LABEL, STATUS_VARIANT, ORDER_TYPE_LABEL } from '../lib/orderStatus'
import { Badge } from '../shared/components/ui'

function PageTitle() {
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-dark">Historial</p>
      <h1 className="mt-1 font-display text-[32px] font-extrabold leading-none tracking-[-0.035em] text-ink">Mis pedidos</h1>
    </div>
  )
}

export default function OrdersPage() {
  const { customer } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!customer) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('id, created_at, status, order_type, order_items(id, quantity, unit_price)')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })

      if (cancelled) return
      if (fetchError) setError(fetchError.message)
      else setOrders(data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [customer])

  if (!customer || (!loading && orders.length === 0)) {
    return (
      <div className="flex animate-fade-up flex-col items-center py-12 text-center">
        <span
          aria-hidden="true"
          className="flex h-28 w-28 items-center justify-center rounded-[32px] rounded-tr-[56px] bg-white text-brand-dark shadow-card"
        >
          <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z M9 8h6 M9 12h6 M9 16h3" />
          </svg>
        </span>
        <h1 className="mt-6 font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink">Aún no tienes pedidos</h1>
        <p className="mt-2 max-w-xs text-[15px] text-muted">
          Cuando confirmes tu primer pedido, lo verás aquí con su estado en vivo.
        </p>
        <Link
          to="/catalogo"
          className="mt-6 inline-flex h-14 items-center justify-center rounded-full bg-brand-dark px-7 text-base font-bold text-white shadow-float transition hover:bg-brand-deep active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
        >
          Ver el catálogo
        </Link>
      </div>
    )
  }

  if (loading)
    return (
      <div className="flex flex-col gap-5">
        <PageTitle />
        <p role="status" className="sr-only">
          Cargando tus pedidos…
        </p>
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-[84px] animate-pulse rounded-[24px] bg-white shadow-card" />
        ))}
      </div>
    )
  if (error)
    return (
      <div className="flex flex-col gap-5">
        <PageTitle />
        <p role="alert" className="rounded-[24px] bg-danger-light px-5 py-4 text-[15px] font-semibold text-danger">
          No se pudieron cargar tus pedidos: {error}
        </p>
      </div>
    )

  return (
    <div className="flex animate-fade-up flex-col gap-5">
      <PageTitle />
      <div className="flex flex-col gap-3">
        {orders.map((order) => {
          const total = order.order_items.reduce((sum, item) => sum + Number(item.unit_price) * item.quantity, 0)
          const delivery = order.order_type === 'delivery'
          return (
            <Link
              key={order.id}
              to={`/pedido/${order.id}`}
              className="group flex items-center gap-3 rounded-[24px] bg-white p-3.5 shadow-card transition duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
            >
              <span
                aria-hidden="true"
                className={`${delivery ? 'tone-cielo' : 'tone-mantequilla'} flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] rounded-tr-[26px] bg-(--tone-shelf) text-(--tone-deep)`}
              >
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {delivery ? (
                    <path d="M3 16V6.5A1.5 1.5 0 0 1 4.5 5H13v11M13 9h4l4 4v3h-2M9.5 17.5H15M9.5 17.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm9.5 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
                  ) : (
                    <path d="M3.5 9.5 5 4h14l1.5 5.5M3.5 9.5a2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.8 0 2.8 2.8 0 0 0 5.6 0M5 12v8h14v-8M10 20v-4.5h4V20" />
                  )}
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge variant={STATUS_VARIANT[order.status] ?? 'neutral'}>{STATUS_LABEL[order.status] ?? 'En curso'}</Badge>
                  <span className="text-xs text-muted">{formatDateTime(order.created_at)}</span>
                </div>
                <p className="mt-1 truncate text-sm text-muted">
                  {ORDER_TYPE_LABEL[order.order_type] ?? order.order_type} · {order.order_items.length} producto
                  {order.order_items.length === 1 ? '' : 's'}
                </p>
              </div>
              <span className="shrink-0 font-display text-xl font-extrabold tracking-tight tabular-nums text-ink">
                {formatPrice(total)}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
