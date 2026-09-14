import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatPrice } from '../lib/format'
import { STATUS_FLOW, STATUS_LABEL, STATUS_VARIANT, ORDER_TYPE_LABEL } from '../lib/orderStatus'
import { Badge, Card } from '../shared/components/ui'
import AndesPattern from '../components/AndesPattern'

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
  const step = order ? STATUS_FLOW.indexOf(order.status) : -1

  return (
    <main className="relative isolate min-h-svh overflow-x-clip bg-cream px-4 pb-10 pt-[max(24px,env(safe-area-inset-top))] sm:px-6">
      <div aria-hidden="true" className="andes-hero absolute inset-x-0 top-0 -z-10 h-[340px] overflow-hidden">
        <AndesPattern className="text-white/25 [mask-image:linear-gradient(to_bottom,black_20%,transparent_70%)]" />
      </div>
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <div className="relative animate-fade-up overflow-hidden rounded-[32px] rounded-tr-[80px] bg-brand-deep px-6 pb-8 pt-9 text-center text-white shadow-float">
          <AndesPattern className="text-white/10" />
          <span aria-hidden="true" className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-brand/40 blur-3xl" />
          <span
            aria-hidden="true"
            className="relative mx-auto flex h-20 w-20 animate-pop-in items-center justify-center rounded-full bg-brand text-brand-deep ring-8 ring-white/10 [animation-delay:150ms]"
          >
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          </span>
          <h1 className="relative mt-5 font-display text-[32px] font-extrabold leading-none tracking-[-0.035em]">
            ¡Pedido confirmado!
          </h1>
          <p className="relative mx-auto mt-3 max-w-xs text-[15px] leading-snug text-white/85">
            Aquí verás el estado de tu pedido en vivo, sin recargar.
          </p>
        </div>

        {loading ? (
          <div role="status" aria-label="Cargando resumen" className="flex flex-col gap-4">
            <div className="h-36 animate-pulse rounded-[24px] bg-white shadow-card" />
            <div className="h-20 animate-pulse rounded-[24px] bg-white shadow-card" />
          </div>
        ) : error || !order ? (
          <p role="alert" className="rounded-[24px] bg-danger-light px-5 py-6 text-center text-[15px] font-semibold text-danger">
            No encontramos este pedido.
          </p>
        ) : (
          <>
            <Card className="animate-fade-up p-5 [animation-delay:80ms]">
              <div className="flex items-center justify-between gap-3">
                <Badge variant={STATUS_VARIANT[order.status] ?? 'neutral'}>{STATUS_LABEL[order.status] ?? 'En curso'}</Badge>
                <span className="text-sm font-semibold text-muted">{ORDER_TYPE_LABEL[order.order_type] ?? order.order_type}</span>
              </div>
              {step >= 0 && (
                <ol aria-label="Progreso del pedido" className="mt-5 grid grid-cols-4 gap-1.5">
                  {STATUS_FLOW.map((status, index) => (
                    <li
                      key={status}
                      aria-current={index === step ? 'step' : undefined}
                      className="flex flex-col gap-2"
                    >
                      <span
                        className={`h-2 rounded-full transition-colors duration-500 ${index < step ? 'bg-brand-dark' : index === step ? 'animate-pulse bg-brand' : 'bg-cream-dim'}`}
                      />
                      <span className={`text-[11px] font-bold leading-tight ${index <= step ? 'text-ink' : 'text-muted'}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {order.address && (
                <p className="mt-5 rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed text-ink/85">
                  <span className="font-bold text-ink">Entrega en:</span> {order.address}
                </p>
              )}
              <ul className="mt-4 divide-y divide-ink/5">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-3 text-[15px]">
                    <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-brand-light px-2 font-display text-sm font-extrabold tabular-nums text-brand-dark">
                      {item.quantity}×
                    </span>
                    <p className="min-w-0 flex-1 font-semibold text-ink">{item.product_name}</p>
                    <span className="shrink-0 tabular-nums text-ink/75">{formatPrice(Number(item.unit_price) * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="flex animate-fade-up items-end justify-between gap-3 p-5 [animation-delay:160ms]">
              <span className="text-base font-bold text-ink">Total del pedido</span>
              <span className="font-display text-[32px] font-extrabold leading-none tracking-tight tabular-nums text-ink">
                {formatPrice(total)}
              </span>
            </Card>
          </>
        )}

        <Link
          to="/catalogo"
          className="mt-2 inline-flex h-14 w-full items-center justify-center rounded-full bg-brand-dark px-7 text-base font-bold text-white shadow-float transition hover:bg-brand-deep active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
        >
          Seguir comprando
        </Link>
      </div>
    </main>
  )
}
