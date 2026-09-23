import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Field, Input, Textarea } from '../../shared/components/ui'
import AdminHeading from '../../components/admin/AdminHeading'
import AdminNavigation from '../../components/admin/AdminNavigation'
import { adminClient } from '../../lib/adminSupabaseClient'
import { getReportDateRange } from '../../lib/adminReports'

export default function AdminRatesPage() {
  const [rateDate, setRateDate] = useState(getReportDateRange('hoy').from)
  const [rate, setRate] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async (date = rateDate) => {
    setLoading(true); setError(''); setMessage('')
    const { data, error: requestError } = await adminClient.rpc('admin_get_exchange_rate', { p_rate_date: date })
    if (requestError) setError('No pudimos consultar la tasa. Intenta nuevamente.')
    else if (data?.[0]) { setRate(String(data[0].usd_to_ves)); setNote(data[0].note || ''); setMessage('Tasa registrada cargada.') }
    else { setRate(''); setNote(''); setMessage('No hay una tasa registrada para esta fecha.') }
    setLoading(false)
  }, [rateDate])

  useEffect(() => { void load() }, [load])

  async function save(event) {
    event.preventDefault(); setLoading(true); setError(''); setMessage('')
    const { data, error: requestError } = await adminClient.rpc('admin_save_exchange_rate', { p_rate_date: rateDate, p_usd_to_ves: Number(rate), p_note: note || null })
    const result = data?.[0]
    if (requestError || !result?.success) setError(result?.outcome === 'invalid_note' ? 'La observación no puede superar 500 caracteres.' : 'Escribe una tasa positiva válida.')
    else { setRate(String(result.usd_to_ves)); setNote(result.note || ''); setMessage('Tasa guardada para la fecha seleccionada.') }
    setLoading(false)
  }

  return <section className="space-y-7">
    <AdminNavigation />
    <div className="space-y-3"><p className="text-sm font-bold text-brand-dark">Bodega · Operación</p><AdminHeading>Tasa Bs/$</AdminHeading><p className="leading-relaxed text-muted">Registro informativo por fecha. No modifica precios, pedidos ni pagos históricos.</p></div>
    <Card className="space-y-5 p-6"><form onSubmit={save} className="space-y-5"><Field label="Fecha" htmlFor="rate-date"><Input id="rate-date" type="date" value={rateDate} onChange={(event) => { setRateDate(event.target.value); void load(event.target.value) }} required /></Field><Field label="Tasa Bs/$" htmlFor="rate-value"><Input id="rate-value" type="number" min="0.0001" step="0.0001" inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value)} placeholder="Ej. 123.4567" required /></Field><Field label="Observación" htmlFor="rate-note"><Textarea id="rate-note" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Fuente o contexto opcional" /></Field><Button type="submit" loading={loading}>Guardar tasa</Button></form>{message && <p role="status" className="text-sm font-semibold text-brand-dark">{message}</p>}{error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}</Card>
  </section>
}
