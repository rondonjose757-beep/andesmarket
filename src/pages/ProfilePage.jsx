import { useState } from 'react'
import { useAuth } from '../state/AuthProvider'
import { Button, Card, Field, Input } from '../shared/components/ui'
import { useToast } from '../shared/components/Toast'
import ProfileForm from '../components/ProfileForm'

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
      <div className="flex flex-col gap-5">
        <h1 className="text-2xl font-black text-ink">Tu perfil</h1>
        <Card className="p-5">
          <p className="mb-4 text-base text-ink/70">Aún no tienes un perfil guardado. Complétalo para agilizar tu próximo pedido.</p>
          <ProfileForm submitLabel="Guardar perfil" />
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-black text-ink">Tu perfil</h1>

      <Card className="p-5">
        {editing ? (
          <form onSubmit={handleSave} className="flex flex-col gap-4" noValidate>
            {error && (
              <div role="alert" className="rounded-lg border border-red-600/25 bg-red-600/5 px-3.5 py-2.5 text-sm font-medium text-red-600">
                {error}
              </div>
            )}
            <Field label="Tu nombre" htmlFor="perfil-name" required>
              <Input id="perfil-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Tu teléfono" htmlFor="perfil-phone" required>
              <Input id="perfil-phone" type="tel" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="lg" onClick={() => setEditing(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" size="lg" loading={saving}>
                Guardar
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-ink">{customer.name}</p>
              <p className="text-base text-ink/65">{customer.phone}</p>
            </div>
            <Button variant="secondary" onClick={startEditing}>
              Editar
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
