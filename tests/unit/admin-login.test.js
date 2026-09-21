import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import {
  createAdminLoginHandler, networkFingerprint, readPayload, trustedNetworkAddress, validatePayload,
} from '../../supabase/functions/admin-login/handler.js'

const origin = 'https://andesmarket.app'
const configuration = {
  hmacSecret: 'ab'.repeat(32), trustedProxy: 'supabase-single-xff', deploymentId: 'prueba-aislada',
}
const validPayload = { nombre: 'Alejandro', pin: '0000' }
const userId = '11111111-1111-4111-8111-111111111111'
const identity = { id: userId, email: 'fixture@example.invalid', is_anonymous: false, email_confirmed_at: '2026-01-01' }
const attempt = { success: true, operator_id: 'operador-sintetico', auth_user_id: userId, must_change_pin: true, outcome: 'ok' }
function request(body = JSON.stringify(validPayload), extra = {}) {
  return new Request('https://example.invalid/functions/v1/admin-login', {
    method: 'POST', body,
    headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.1', ...extra },
  })
}
function fixture({ result = attempt, user = identity, linkUserId = userId, linkError = null } = {}) {
  const calls = []
  const backend = {
    rpc: (name, args) => {
      calls.push({ name, args })
      return { single: async () => ({ data: result, error: null }) }
    },
    auth: { admin: {
      getUserById: async (id) => {
        calls.push({ identity: id })
        return { data: { user }, error: null }
      },
      generateLink: async (args) => {
        calls.push({ link: args })
        return { data: {
          user: { ...identity, id: linkUserId },
          properties: { hashed_token: 'token-sintetico-'.repeat(4), verification_type: 'magiclink', email_otp: 'no-devolver', action_link: 'no-devolver' },
        }, error: linkError }
      },
    } },
  }
  return { calls, handler: createAdminLoginHandler({ config: () => configuration, createBackend: () => backend }) }
}

test('login: normaliza nombre y rechaza campos, tipos y tamaños inválidos', async () => {
  assert.deepEqual(validatePayload({ nombre: '  ALEJANDRO  ', pin: '0000' }), { nombre: 'alejandro', pin: '0000' })
  for (const body of [null, [], {}, { ...validPayload, role: 'admin' }, { ...validPayload, pin: 1234 },
    { ...validPayload, nombre: '1234' }, { ...validPayload, nombre: 'a'.repeat(101) },
    { ...validPayload, pin: '1'.repeat(73) }, { ...validPayload, pin: ' 0000' }]) {
    assert.throws(() => validatePayload(body))
  }
  for (const [req, status] of [
    [request('{'), 400], [request('x', { 'content-type': 'text/plain' }), 415],
    [request('x', { 'content-encoding': 'gzip' }), 415],
    [request(' '.repeat(1025)), 413],
    [request('{}', { 'content-length': '9999999' }), 413],
  ]) await assert.rejects(readPayload(req), (error) => error.status === status)
  const chunks = new ReadableStream({ start(controller) {
    controller.enqueue(new Uint8Array(700)); controller.enqueue(new Uint8Array(700)); controller.close()
  } })
  const streamed = new Request('http://example.invalid', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: chunks, duplex: 'half',
  })
  await assert.rejects(readPayload(streamed), (error) => error.status === 413)
})

test('login: CORS estricto, preflight limitado y solo POST', async () => {
  const { handler, calls } = fixture()
  for (const value of ['https://malicioso.invalid', 'null', 'http://localhost:3000', 'https://andesmarket.app.evil.invalid']) {
    const response = await handler(request(undefined, { origin: value }))
    assert.equal(response.status, 403)
    assert.equal(response.headers.get('access-control-allow-origin'), null)
  }
  const preflight = await handler(new Request('http://example.invalid', {
    method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' },
  }))
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin)
  const badPreflight = await handler(new Request('http://example.invalid', {
    method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'x-forwarded-for' },
  }))
  assert.equal(badPreflight.status, 403)
  const get = await handler(new Request('http://example.invalid', { headers: { origin } }))
  assert.equal(get.status, 405)
  assert.equal(calls.length, 0)
})

test('login: no confía en cabeceras arbitrarias ni cadenas ambiguas; HMAC canónico', async () => {
  for (const headers of [new Headers(), new Headers({ 'x-real-ip': '192.0.2.1' }),
    new Headers({ 'cf-connecting-ip': '192.0.2.1' }), new Headers({ 'x-forwarded-for': '192.0.2.1, 192.0.2.2' }),
    new Headers({ 'x-forwarded-for': 'no-es-ip' })]) {
    assert.throws(() => trustedNetworkAddress(headers, configuration))
  }
  const headers = new Headers({ 'x-forwarded-for': '192.0.2.1' })
  assert.throws(() => trustedNetworkAddress(headers, {}))
  assert.throws(() => trustedNetworkAddress(headers, { ...configuration, deploymentId: '' }))
  const a = trustedNetworkAddress(new Headers({ 'x-forwarded-for': '2001:0db8:0:0:0:0:0:1' }), configuration)
  const b = trustedNetworkAddress(new Headers({ 'x-forwarded-for': '2001:db8::1' }), configuration)
  assert.equal(a, b)
  assert.equal(trustedNetworkAddress(new Headers({ 'x-forwarded-for': '::ffff:192.0.2.1' }), configuration), '192.0.2.1')
  const fingerprint = await networkFingerprint(a, configuration.hmacSecret)
  assert.match(fingerprint, /^[a-f0-9]{64}$/)
  assert.equal(fingerprint, await networkFingerprint(b, configuration.hmacSecret))
  assert.notEqual(fingerprint, await networkFingerprint(b, 'cd'.repeat(32)))
  await assert.rejects(networkFingerprint(a, 'insuficiente'))
})

test('login: respuesta mínima, huella HMAC y generación solo para identidad asociada', async () => {
  const { handler, calls } = fixture()
  const response = await handler(request(undefined, { authorization: 'Bearer sesion-cliente-sintetica' }))
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.deepEqual(Object.keys(body).sort(), ['must_change_pin', 'token_hash', 'type'])
  assert.equal(body.type, 'email')
  assert.equal(body.must_change_pin, true)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(calls[2], { link: { type: 'magiclink', email: identity.email } })
  assert.match(calls[0].args.p_network_fingerprint, /^[a-f0-9]{64}$/)
  assert.equal(calls[0].name, 'admin_login_attempt')
  assert.equal(JSON.stringify(body).includes(identity.email), false)
})

test('login: errores genéricos, bloqueo 429 y fallos de aprovisionamiento seguros', async () => {
  for (const [outcome, status] of [['denied', 401], ['rate_limited', 429], ['unavailable', 503]]) {
    const { handler, calls } = fixture({ result: { success: false, outcome } })
    const response = await handler(request())
    assert.equal(response.status, status)
    assert.deepEqual(await response.json(), { error: 'No se pudo iniciar sesión.' })
    assert.equal(calls.length, 1)
    if (status === 429) assert.equal(response.headers.get('retry-after'), '900')
  }
  for (const user of [null, { ...identity, email: null }, { ...identity, is_anonymous: true }, { ...identity, email_confirmed_at: null }]) {
    const { handler, calls } = fixture({ user })
    assert.equal((await handler(request()).then((res) => res.status)), 503)
    assert.equal(calls.length, 2)
  }
  for (const options of [{ linkUserId: 'otra-identidad' }, { linkError: new Error('dato-que-no-debe-filtrarse') }]) {
    const { handler } = fixture(options)
    const response = await handler(request())
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), { error: 'No se pudo iniciar sesión.' })
  }
})

test('login: contrato real del SDK instalado generateLink y verifyOtp sin llamadas de red', async () => {
  const calls = []
  const token = 'token-de-canje-sintetico-'.repeat(3)
  const sdk = createClient('https://sdk-test.invalid', 'clave-sintetica-no-real', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const path = new URL(input).pathname
      const body = init.body ? JSON.parse(init.body) : null
      calls.push({ path, body })
      if (path.endsWith('/admin/generate_link')) {
        return Response.json({ ...identity, hashed_token: token, verification_type: 'magiclink', email_otp: 'sintetico' })
      }
      if (path.endsWith('/verify')) {
        return Response.json({ access_token: 'acceso-sintetico', refresh_token: 'refresco-sintetico',
          expires_in: 60, token_type: 'bearer', user: identity })
      }
      throw new Error('Endpoint inesperado: prueba sin red')
    } },
  })
  const generated = await sdk.auth.admin.generateLink({ type: 'magiclink', email: identity.email })
  assert.equal(generated.error, null)
  assert.equal(generated.data.properties.hashed_token, token)
  const verified = await sdk.auth.verifyOtp({ token_hash: generated.data.properties.hashed_token, type: 'email' })
  assert.equal(verified.error, null)
  assert.equal(verified.data.session.user.id, userId)
  assert.deepEqual(calls.map((call) => call.path), ['/auth/v1/admin/generate_link', '/auth/v1/verify'])
  assert.equal(calls[1].body.token_hash, token)
  assert.equal(calls[1].body.email, undefined)
})
