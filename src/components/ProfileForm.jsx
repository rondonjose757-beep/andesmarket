import { useState } from 'react'
import { useAuth } from '../state/AuthProvider'
import { Button, Field, Input } from '../shared/components/ui'

export default function ProfileForm({ onSuccess, submitLabel = 'Continuar' }) {
  const { isLoading, saveProfile } = useAuth()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const customer = await saveProfile({ phone, name })
      onSuccess?.(customer)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error && (
        <div role="alert" className="rounded-lg border border-red-600/25 bg-red-600/5 px-3.5 py-2.5 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      <Field label="Tu nombre" htmlFor="profile-name" required>
        <Input
          id="profile-name"
          name="name"
          autoComplete="given-name"
          placeholder="Ej: María"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <Field label="Tu teléfono" htmlFor="profile-phone" required hint="Para avisarte del estado de tu pedido">
        <Input
          id="profile-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Ej: 04121234567"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </Field>

      <Button type="submit" size="lg" className="mt-1 w-full" loading={submitting || isLoading}>
        {isLoading ? 'Preparando tu sesión…' : submitting ? 'Guardando…' : submitLabel}
      </Button>
    </form>
  )
}
