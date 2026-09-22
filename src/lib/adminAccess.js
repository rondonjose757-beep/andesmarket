export const ADMIN_LOGIN_ERROR = 'No se pudo iniciar sesión. Revisa tus datos e intenta de nuevo.'
export const ADMIN_BLOCKED = 'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.'
const fourDigits = (value) => typeof value === 'string' && value.length === 4 && /^[0-9]+$/.test(value)

export function validateLogin(nombre, pin) {
  if (!nombre.trim()) return 'Escribe tu nombre.'
  if (!fourDigits(pin)) return 'El PIN debe tener cuatro dígitos.'
  return ''
}

export function validatePinChange(current, next, confirmation) {
  if (!fourDigits(current)) return 'El PIN actual debe tener cuatro dígitos.'
  if (!fourDigits(next)) return 'El nuevo PIN debe tener cuatro dígitos.'
  if (next === '2405' || next === current) return 'Elige un PIN distinto al actual y al PIN temporal.'
  if (next !== confirmation) return 'La confirmación no coincide con el nuevo PIN.'
  return ''
}

export function operatorAccess(user, operator) {
  if (!user?.id || user.is_anonymous !== false || !operator
    || operator.auth_user_id !== user.id || operator.active !== true
    || typeof operator.must_change_pin !== 'boolean') return 'denied'
  return operator.must_change_pin ? 'change-pin' : 'ready'
}

export async function loginAdmin({ client, url, nombre, pin, fetcher = fetch }) {
  try {
    const response = await fetcher(`${url}/functions/v1/admin-login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim(), pin }),
      credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(20000),
    })
    if (!response.ok) return { ok: false, blocked: response.status === 429 }
    const payload = await response.json()
    if (typeof payload.token_hash !== 'string' || !payload.token_hash || payload.type !== 'email') {
      return { ok: false, blocked: false }
    }
    // Canje solo en memoria. No devolver el token ni guardar la respuesta en estado.
    const { data, error } = await client.auth.verifyOtp({ token_hash: payload.token_hash, type: 'email' })
    payload.token_hash = undefined
    return error || !data?.session ? { ok: false, blocked: false } : { ok: true }
  } catch {
    return { ok: false, blocked: false }
  }
}
