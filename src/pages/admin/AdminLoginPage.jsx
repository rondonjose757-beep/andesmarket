import { useState } from 'react'
import { Button, Field, Input } from '../../shared/components/ui'
import { useAdminAuth } from '../../state/AdminAuthContext'
import { validateLogin } from '../../lib/adminAccess'
import AdminHeading from '../../components/admin/AdminHeading'

export default function AdminLoginPage() {
  const { login, busy, message } = useAdminAuth()
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const nombre = String(fields.get('nombre') || '')
    const pin = String(fields.get('pin') || '')
    const invalid = validateLogin(nombre, pin)
    setError(invalid)
    if (invalid) return
    form.reset()
    await login(nombre, pin)
  }
  return <section className="space-y-7">
    <div className="space-y-3">
      <AdminHeading>Acceso administrativo</AdminHeading>
      <p className="text-base leading-relaxed text-muted">Ingresa con tu nombre y PIN para preparar tu espacio de trabajo.</p>
    </div>
    <form onSubmit={submit} noValidate className="space-y-5" aria-busy={busy} aria-describedby="admin-login-error">
      <Field label="Nombre" htmlFor="admin-nombre" required>
        <Input id="admin-nombre" name="nombre" autoComplete="username" maxLength={100} required disabled={busy} />
      </Field>
      <Field label="PIN" htmlFor="admin-pin" required hint="Cuatro dígitos. Tu PIN no se guarda en este formulario.">
        <Input id="admin-pin" name="pin" type="password" inputMode="numeric" autoComplete="off" maxLength={4} required disabled={busy} />
      </Field>
      <p id="admin-login-error" role="alert" className="text-sm font-semibold text-danger">{error || message}</p>
      <Button type="submit" loading={busy} className="w-full">Ingresar</Button>
    </form>
    <p className="border-t border-ink/10 pt-5 text-sm leading-relaxed text-muted">Este acceso es independiente de la tienda. Tu carrito permanece igual.</p>
  </section>
}
