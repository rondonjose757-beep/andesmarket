import { isIP } from 'node:net'

export const ALLOWED_ORIGINS = new Set(['https://andesmarket.app', 'http://localhost:5173'])
export const MAX_BODY_BYTES = 1024
const LOGIN_ERROR = 'No se pudo iniciar sesión.'

class RequestError extends Error {
  constructor(status) {
    super('Solicitud inválida.')
    this.status = status
  }
}

export function validatePayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== 2
    || !Object.hasOwn(value, 'nombre') || !Object.hasOwn(value, 'pin')
    || typeof value.nombre !== 'string' || typeof value.pin !== 'string') {
    throw new RequestError(400)
  }
  const nombre = value.nombre.trim().toLowerCase()
  if (nombre.length < 1 || nombre.length > 100
    || !/^[a-záéíóúüñ]+( [a-záéíóúüñ]+)*$/u.test(nombre)
    || !/^[0-9]{4,12}$/.test(value.pin)) throw new RequestError(400)
  return { nombre, pin: value.pin }
}

export async function readPayload(request) {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') || '')) {
    throw new RequestError(415)
  }
  if (request.headers.has('content-encoding')) throw new RequestError(415)
  const length = request.headers.get('content-length')
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) {
    throw new RequestError(413)
  }
  if (!request.body) throw new RequestError(400)
  const reader = request.body.getReader()
  const bytes = new Uint8Array(MAX_BODY_BYTES)
  let total = 0
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      void reader.cancel().catch(() => {})
      reject(new RequestError(408))
    }, 5000)
  })
  try {
    while (true) {
      const { value, done } = await Promise.race([reader.read(), timeout])
      if (done) break
      total += value.byteLength
      if (total > MAX_BODY_BYTES) throw new RequestError(413)
      bytes.set(value, total - value.byteLength)
    }
    const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, total)))
    return validatePayload(payload)
  } catch (error) {
    void reader.cancel().catch(() => {})
    if (error instanceof RequestError) throw error
    throw new RequestError(400)
  } finally {
    clearTimeout(timer)
    reader.releaseLock()
  }
}

export function trustedNetworkAddress(headers, { trustedProxy, deploymentId }) {
  // La documentación pública confirma XFF, pero no garantiza su saneamiento
  // para todos los proxies. Requiere verificación operativa explícita del gateway
  // hospedado. No habilitar este perfil para tráfico directo/self-hosted.
  if (trustedProxy !== 'supabase-single-xff' || !deploymentId) throw new Error(LOGIN_ERROR)
  const ip = headers.get('x-forwarded-for')?.trim()
  // Nada de elegir el primer elemento de una cadena controlable por el cliente.
  // Sin fallbacks a x-real-ip, cf-connecting-ip ni campos del cuerpo.
  if (!ip || ip.includes(',') || ip.includes('%') || !isIP(ip)) throw new Error(LOGIN_ERROR)
  if (isIP(ip) === 4) return ip
  const canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1)
  const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(canonical)
  if (mapped) {
    const high = parseInt(mapped[1], 16)
    const low = parseInt(mapped[2], 16)
    return [high >> 8, high & 255, low >> 8, low & 255].join('.')
  }
  return canonical
}

export async function networkFingerprint(address, secret) {
  // 32 bytes aleatorios expresados como 64 caracteres hex, almacenados solo
  // como secreto del runtime; separar el dominio de otros posibles HMAC.
  if (typeof secret !== 'string' || !/^[0-9a-f]{64}$/i.test(secret)) throw new Error(LOGIN_ERROR)
  const keyBytes = Uint8Array.from(secret.match(/../g), (byte) => parseInt(byte, 16))
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`andesmarket:admin-login:v1:${address}`))
  return Array.from(new Uint8Array(signed), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Inyección de dependencias para pruebas sin red ni claves reales.
export function createAdminLoginHandler({ config, createBackend }) {
  return async function adminLogin(request) {
    const origin = request.headers.get('origin')
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
      'Vary': 'Origin',
      'X-Content-Type-Options': 'nosniff',
    }
    const respond = (status, body, extra = {}) => new Response(body === null ? null : JSON.stringify(body), {
      status, headers: { ...headers, ...extra },
    })
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return respond(403, { error: LOGIN_ERROR })
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Expose-Headers'] = 'Retry-After'
    if (request.method === 'OPTIONS') {
      const requestedHeaders = (request.headers.get('access-control-request-headers') || '')
        .toLowerCase().split(',').map((header) => header.trim()).filter(Boolean)
      if (request.headers.get('access-control-request-method') !== 'POST'
        || requestedHeaders.some((header) => !['content-type', 'apikey', 'authorization', 'x-client-info'].includes(header))) {
        return respond(403, { error: LOGIN_ERROR })
      }
      return respond(204, null, {
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
        'Access-Control-Max-Age': '600',
      })
    }
    if (request.method !== 'POST') return respond(405, { error: LOGIN_ERROR }, { Allow: 'POST, OPTIONS' })
    try {
      const payload = await readPayload(request)
      const environment = config()
      const address = trustedNetworkAddress(request.headers, environment)
      const fingerprint = await networkFingerprint(address, environment.hmacSecret)
      const backend = createBackend()
      // Nunca reenviar Authorization ni cookies del request al cliente privilegiado.
      const { data, error } = await backend.rpc('admin_login_attempt', {
        p_normalized_name: payload.nombre,
        p_pin: payload.pin,
        p_network_fingerprint: fingerprint,
      }).single()
      if (error || !data) return respond(503, { error: LOGIN_ERROR })
      if (data.outcome === 'rate_limited') return respond(429, { error: LOGIN_ERROR }, { 'Retry-After': '900' })
      if (data.outcome === 'unavailable') return respond(503, { error: LOGIN_ERROR })
      if (data.success !== true || data.outcome !== 'ok') return respond(401, { error: LOGIN_ERROR })
      if (!data.auth_user_id || !data.operator_id || typeof data.must_change_pin !== 'boolean') {
        return respond(503, { error: LOGIN_ERROR })
      }

      const { data: identity, error: identityError } = await backend.auth.admin.getUserById(data.auth_user_id)
      const user = identity?.user
      if (identityError || !user || user.id !== data.auth_user_id || user.is_anonymous !== false
        || !user.email || !user.email_confirmed_at) return respond(503, { error: LOGIN_ERROR })

      const { data: link, error: linkError } = await backend.auth.admin.generateLink({
        type: 'magiclink', email: user.email,
      })
      // generateLink puede crear usuarios si el email no existe. Comprobar la
      // identidad antes y después impide entregar un token para otra cuenta.
      if (linkError || link?.user?.id !== data.auth_user_id
        || link?.properties?.verification_type !== 'magiclink'
        || typeof link?.properties?.hashed_token !== 'string'
        || link.properties.hashed_token.length < 32) return respond(503, { error: LOGIN_ERROR })
      return respond(200, {
        token_hash: link.properties.hashed_token,
        type: 'email',
        must_change_pin: data.must_change_pin,
      })
    } catch (error) {
      if (error instanceof RequestError) return respond(error.status, { error: error.message })
      // No incluir mensajes de SDK, objetos de error, cuerpos ni secretos en logs.
      return respond(503, { error: LOGIN_ERROR })
    }
  }
}
