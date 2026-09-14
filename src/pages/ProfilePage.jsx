import { useState } from 'react'
import { useAuth } from '../state/AuthProvider'
import { Button, Card, Field, Input } from '../shared/components/ui'
import { useToast } from '../shared/components/Toast'
import AndesPattern from '../components/AndesPattern'
import ProfileForm from '../components/ProfileForm'

function PageTitle() {
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-dark">Tu cuenta</p>
      <h1 className="mt-1 font-display text-[32px] font-extrabold leading-none tracking-[-0.035em] text-ink">Tu perfil</h1>
    </div>
  )
}

export default function ProfilePage() {
  const { customer, updateProfile } = useAuth()
  const notify = useToast()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(customer?.name ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function startEditing() {
    setName(customer.name)
    setPhone(customer.phone)
    setError('')
    setEditing(true)
  }

  async function handleSave(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await updateProfile({ name, phone })
      notify('Perfil actualizado.', 'success')
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!customer) {
    return (
      <div className="flex animate-fade-up flex-col gap-5">
        <PageTitle />
        <Card className="p-5">
          <p className="mb-5 text-[15px] leading-relaxed text-muted">
            Aún no tienes un perfil guardado. Complétalo para agilizar tu próximo pedido.
          </p>
          <ProfileForm submitLabel="Guardar perfil" />
        </Card>
      </div>
    )
  }

  return (
    <div className="flex animate-fade-up flex-col gap-5">
      <PageTitle />

      <div className="relative overflow-hidden rounded-[28px] rounded-tr-[72px] bg-brand-deep p-5 text-white shadow-float">
        <AndesPattern className="text-white/10" />
        <span aria-hidden="true" className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-brand/40 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] rounded-tr-[30px] bg-white font-display text-3xl font-extrabold text-brand-deep"
          >
            {customer.name?.trim().charAt(0).toUpperCase() || '·'}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-2xl font-extrabold leading-tight tracking-[-0.02em]">{customer.name}</p>
            <p className="mt-0.5 text-[15px] tabular-nums text-white/85">{customer.phone}</p>
          </div>
        </div>
        {!editing && (
          <Button variant="secondary" onClick={startEditing} className="relative mt-5 w-full !bg-white/15 !text-white !ring-white/25 hover:!bg-white/25">
            Editar
          </Button>
        )}
      </div>

      {editing && (
        <Card className="animate-fade-up p-5">
          <form onSubmit={handleSave} className="flex flex-col gap-4" noValidate>
            {error && (
              <div role="alert" className="rounded-2xl bg-danger-light px-4 py-3 text-sm font-semibold text-danger">
                {error}
              </div>
            )}
            <Field label="Tu nombre" htmlFor="perfil-name" required>
              <Input id="perfil-name" required value={name} onChange={(e) => setName(e.target.value)} className="bg-cream" />
            </Field>
            <Field label="Tu teléfono" htmlFor="perfil-phone" required>
              <Input
                id="perfil-phone"
                type="tel"
                inputMode="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-cream"
              />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" size="lg" onClick={() => setEditing(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" size="lg" loading={saving}>
                Guardar
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
