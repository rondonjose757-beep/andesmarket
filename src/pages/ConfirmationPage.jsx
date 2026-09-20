import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatDateTime, formatPrice } from '../lib/format'
import { Card } from '../shared/components/ui'
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
      setError(null)
      const [orderResult, itemsResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, customer_name, customer_phone, sector_name, delivery_fee, subtotal, total, delivery_instructions, google_maps_url, created_at, status, address')
          .eq('id', orderId)
          .single(),
        supabase
          .from('order_items')
          .select('id, product_name, quantity, unit_price, line_total')
          .eq('order_id', orderId)
          .order('created_at'),
      ])

      if (cancelled) return
      if (orderResult.error || itemsResult.error) {
        setError(orderResult.error?.message ?? itemsResult.error?.message)
      } else {
        setOrder(orderResult.data)
        setItems(itemsResult.data ?? [])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [orderId])

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
            ¡Recibimos tu pedido!
          </h1>
          <p className="relative mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-white/85">
            ¡Recibimos tu pedido! En breve nuestro equipo te contactará por WhatsApp para coordinar el pago. No realices ningún pago hasta recibir nuestra confirmación.
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
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-dark">Número de pedido</p>
                  <p className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink">
                    AM-{String(order.order_number).padStart(5, '0')}
                  </p>
                </div>
                <time dateTime={order.created_at} className="text-right text-sm font-semibold text-muted">
                  {formatDateTime(order.created_at)}
                </time>
              </div>

              <div className="mt-5 rounded-2xl bg-cream px-4 py-4 text-sm leading-relaxed text-ink/85">
                <p><span className="font-bold text-ink">Sector:</span> {order.sector_name}</p>
                <p className="mt-1"><span className="font-bold text-ink">Dirección:</span> {order.address}</p>
                {order.delivery_instructions && (
                  <p className="mt-1"><span className="font-bold text-ink">Indicaciones:</span> {order.delivery_instructions}</p>
                )}
                {order.google_maps_url && (
                  <a
                    href={order.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex font-bold text-brand-dark underline decoration-brand/40 underline-offset-4"
                  >
                    Abrir ubicación en Google Maps
                  </a>
                )}
              </div>

              <h2 className="mt-5 font-display text-lg font-extrabold text-ink">Productos</h2>
              <ul className="mt-4 divide-y divide-ink/5">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-3 text-[15px]">
                    <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-brand-light px-2 font-display text-sm font-extrabold tabular-nums text-brand-dark">
                      {item.quantity}×
                    </span>
                    <p className="min-w-0 flex-1 font-semibold text-ink">{item.product_name}</p>
                    <span className="shrink-0 tabular-nums text-ink/75">{formatPrice(Number(item.line_total))}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="animate-fade-up p-5 [animation-delay:160ms]">
              <div className="flex items-center justify-between text-sm text-muted">
                <span>Subtotal</span>
                <span className="font-semibold tabular-nums text-ink">{formatPrice(Number(order.subtotal))}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-muted">
                <span>Delivery</span>
                <span className="font-semibold tabular-nums text-ink">{formatPrice(Number(order.delivery_fee))}</span>
              </div>
              <div className="my-4 border-t-2 border-dashed border-ink/10" />
              <div className="flex items-end justify-between gap-3">
                <span className="text-base font-bold text-ink">Total del pedido</span>
                <span className="font-display text-[32px] font-extrabold leading-none tracking-tight tabular-nums text-ink">
                  {formatPrice(Number(order.total))}
                </span>
              </div>
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
