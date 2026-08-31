import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatPrice } from '../lib/format'
import { STATUS_LABEL, STATUS_VARIANT, ORDER_TYPE_LABEL } from '../lib/orderStatus'
import { Badge, Button, Card } from '../shared/components/ui'

export default function ConfirmationPage() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [orderResult, itemsResult] = await Promise.all([
        supabase.from('orders').select('id, status, order_type, address, created_at').eq('id', orderId).single(),
        supabase.from('order_items').select('id, product_name, quantity, unit_price').eq('order_id', orderId).order('created_at'),
      ])

      if (cancelled) return
      if (orderResult.error) setError(orderResult.error.message)
      else setOrder(orderResult.data)
      if (itemsResult.data) setItems(itemsResult.data)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [orderId])

  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, (payload) => {
        setOrder((current) => ({ ...current, ...payload.new }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId])

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.unit_price) * item.quantity, 0), [items])

  return (
    <main className="min-h-svh bg-cream px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-3xl">✅</span>
          <h1 className="text-2xl font-black text-ink">¡Pedido confirmado!</h1>
          <p className="text-base text-ink/65">Aquí verás el estado de tu pedido en vivo, sin recargar.</p>
        </div>

        {loading ? (
          <p className="py-10 text-center text-base text-ink/60">Cargando resumen…</p>
        ) : error || !order ? (
          <p className="py-10 text-center text-base text-red-600">No encontramos este pedido.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <Badge variant={STATUS_VARIANT[order.status] ?? 'neutral'}>{STATUS_LABEL[order.status] ?? 'En curso'}</Badge>
                <span className="text-sm text-ink/60">{ORDER_TYPE_LABEL[order.order_type] ?? order.order_type}</span>
              </div>
              {order.address && <p className="mb-3 text-base text-ink/70">Entrega en: {order.address}</p>}
              <div className="flex flex-col gap-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-t border-ink/8 pt-3 text-base first:border-t-0 first:pt-0">
                    <p className="font-semibold text-ink">
                      {item.quantity}× {item.product_name}
                    </p>
                    <span className="shrink-0 tabular-nums text-ink/75">{formatPrice(Number(item.unit_price) * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="flex items-center justify-between p-4">
              <span className="text-lg font-bold text-ink">Total del pedido</span>
              <span className="text-2xl font-black text-ink tabular-nums">{formatPrice(total)}</span>
            </Card>
          </div>
        )}

        <Link to="/catalogo" className="mt-6 block">
          <Button size="lg" className="w-full">
            Seguir comprando
          </Button>
        </Link>
      </div>
    </main>
  )
}
