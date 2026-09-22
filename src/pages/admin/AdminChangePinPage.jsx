import { useState } from 'react'
import { Button, Field, Input } from '../../shared/components/ui'
import { useAdminAuth } from '../../state/AdminAuthContext'
import { validatePinChange } from '../../lib/adminAccess'
import AdminHeading from '../../components/admin/AdminHeading'

export default function AdminChangePinPage() {
  const { changePin, logout, operator, busy } = useAdminAuth()
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const current = String(fields.get('current_pin') || '')
    const next = String(fields.get('new_pin') || '')
    const invalid = validatePinChange(current, next, String(fields.get('confirmation') || ''))
    setError(invalid)
    if (invalid) return
    form.reset()
    const result = await changePin(current, next)
    setError(result)
  }
  return <section className="space-y-7">
    <div className="space-y-3">
      <p className="text-sm font-bold text-brand-dark">Hola, {operator.display_name}</p>
      <AdminHeading>Cambia tu PIN</AdminHeading>
      <p className="leading-relaxed text-muted">Antes de continuar, elige un PIN personal de cuatro dígitos, distinto al actual y al temporal.</p>
    </div>
    <form onSubmit={submit} noValidate className="space-y-5" aria-busy={busy} aria-describedby="admin-cambio-error">
      {[['current_pin', 'PIN actual'], ['new_pin', 'Nuevo PIN'], ['confirmation', 'Confirmación del nuevo PIN']].map(([name, label]) =>
        <Field key={name} label={label} htmlFor={`admin-${name}`} required>
          <Input id={`admin-${name}`} name={name} type="password" inputMode="numeric" autoComplete="off" maxLength={4} required disabled={busy} />
        </Field>)}
      <p id="admin-cambio-error" role="alert" className="text-sm font-semibold text-danger">{error}</p>
      <Button type="submit" loading={busy} className="w-full">Guardar nuevo PIN</Button>
    </form>
    <Button variant="ghost" onClick={logout} disabled={busy} className="w-full">Cerrar sesión administrativa</Button>
  </section>
}
