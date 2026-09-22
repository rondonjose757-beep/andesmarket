import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { loginAdmin, validateLogin, validatePinChange, operatorAccess } from '../../src/lib/adminAccess.js'

test('admin: validación de login y cambio sin convertir PIN a número', () => {
  assert.equal(validateLogin(' Alejandro ', '0123'), '')
  for (const pin of ['123', '12345', 'abcd', '１２３４', '1234\n']) assert.ok(validateLogin('Alejandro', pin))
  assert.ok(validateLogin(' ', '0123'))
  assert.equal(validatePinChange('1357', '0246', '0246'), '')
  for (const pin of ['2405', '1357', 'abc1', '123', '12345']) assert.ok(validatePinChange('1357', pin, pin))
  assert.ok(validatePinChange('1357', '0246', '0247'))
})

test('admin: acceso depende de identidad y fila activa, nunca de metadata', () => {
  const user = { id: 'admin-1', is_anonymous: false }
  const row = { auth_user_id: 'admin-1', active: true, must_change_pin: true }
  assert.equal(operatorAccess(user, row), 'change-pin')
  assert.equal(operatorAccess(user, { ...row, must_change_pin: false }), 'ready')
  for (const invalid of [null, { ...row, active: false }, { ...row, auth_user_id: 'otro' }, { ...row, must_change_pin: null }]) {
    assert.equal(operatorAccess(user, invalid), 'denied')
  }
  assert.equal(operatorAccess({ ...user, is_anonymous: true, user_metadata: { admin: true } }, row), 'denied')
})

test('admin: POST exacto nombre/pin y canje inmediato del token, sin devolverlo', async () => {
  let verified = false
  const result = await loginAdmin({
    url: 'https://example.invalid', nombre: 'Alejandro', pin: '1357',
    fetcher: async (url, init) => {
      assert.equal(url, 'https://example.invalid/functions/v1/admin-login')
      assert.equal(init.method, 'POST')
      assert.deepEqual(JSON.parse(init.body), { nombre: 'Alejandro', pin: '1357' })
      return new Response(JSON.stringify({ token_hash: 'canje-sintetico', type: 'email', must_change_pin: true }))
    },
    client: { auth: { verifyOtp: async (input) => {
      assert.deepEqual(input, { token_hash: 'canje-sintetico', type: 'email' })
      verified = true
      return { data: { session: { user: { id: 'admin-1' } } }, error: null }
    } } },
  })
  assert.equal(verified, true)
  assert.deepEqual(result, { ok: true })
})

test('admin: no expone cuerpos de errores y diferencia bloqueo HTTP', async () => {
  for (const status of [401, 429, 503]) {
    const result = await loginAdmin({ url: 'https://example.invalid', nombre: 'Alejandro', pin: '1357',
      fetcher: async () => new Response('detalle privado', { status }), client: {} })
    assert.equal(result.ok, false)
    assert.equal(result.blocked, status === 429)
    assert.equal(JSON.stringify(result).includes('detalle privado'), false)
  }
})

test('admin: no recarga, no usa cliente público ni logs sensibles; almacenamiento exclusivo', () => {
  const root = new URL('../../src/', import.meta.url)
  const files = ['lib/adminAccess.js', 'lib/adminSupabaseClient.js', 'state/AdminAuthProvider.jsx',
    ...readdirSync(new URL('pages/admin/', root)).map((name) => `pages/admin/${name}`)]
  for (const file of files) {
    const code = readFileSync(new URL(file, root), 'utf8')
    assert.doesNotMatch(code, /window\.location\.reload|console\.(log|error|warn)|from ['"][^'"]*\/supabaseClient['"]|localStorage\.[a-zA-Z]/)
  }
  const client = readFileSync(new URL('lib/adminSupabaseClient.js', root), 'utf8')
  assert.match(client, /sb-andesmarket-admin-auth/)
  assert.match(client, /window\.sessionStorage/)
  assert.match(client, /signOut\(\{ scope: 'local' \}\)/)
  assert.match(client, /detectSessionInUrl: false/)
})
