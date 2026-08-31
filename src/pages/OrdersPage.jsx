import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../state/AuthProvider'
import { formatDateTime, formatPrice } from '../lib/format'
import { STATUS_LABEL, STATUS_VARIANT, ORDER_TYPE_LABEL } from '../lib/orderStatus'
import { Badge, Button, Card } from '../shared/components/ui'

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
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-lg font-black text-ink">Aún no tienes pedidos</p>
        <p className="max-w-xs text-sm text-ink/55">Cuando confirmes tu primer pedido, lo verás aquí con su estado en vivo.</p>
        <Link to="/catalogo">
          <Button className="mt-2">Ver el catálogo</Button>
        </Link>
      </div>
    )
  }

  if (loading) return <p className="py-16 text-center text-sm text-ink/40">Cargando tus pedidos…</p>
  if (error) return <p className="py-16 text-center text-sm text-red-600">No se pudieron cargar tus pedidos: {error}</p>

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-black text-ink">Mis pedidos</h1>

      <div className="flex flex-col gap-3">
        {orders.map((order) => {
          const total = order.order_items.reduce((sum, item) => sum + Number(item.unit_price) * item.quantity, 0)

          return (
            <Link key={order.id} to={`/pedido/${order.id}`}>
              <Card className="flex items-center justify-between gap-3 p-4 transition-shadow hover:shadow-md">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={STATUS_VARIANT[order.status] ?? 'neutral'}>{STATUS_LABEL[order.status] ?? 'En curso'}</Badge>
                    <span className="text-xs text-ink/40">{formatDateTime(order.created_at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink/50">
                    {ORDER_TYPE_LABEL[order.order_type] ?? order.order_type} · {order.order_items.length} producto
                    {order.order_items.length === 1 ? '' : 's'}
                  </p>
                </div>
                <span className="shrink-0 text-lg font-black text-ink tabular-nums">{formatPrice(total)}</span>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
