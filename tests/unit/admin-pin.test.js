import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const migration = new URL('../../supabase/updates/2026-09-21-admin-pin-obligatorio.sql', import.meta.url)

test('rotación: contrato RPC de dos parámetros sin sesión pública ni secretos servidor', async () => {
  const client = createClient('https://example.invalid', 'clave-publica-sintetica', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (url, init) => {
      assert.equal(new URL(url).pathname, '/rest/v1/rpc/change_admin_pin')
      assert.deepEqual(JSON.parse(init.body), { current_pin: '1357', new_pin: '8642' })
      return new Response(JSON.stringify({ success: true, outcome: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    } },
  })
  const { data, error } = await client.rpc('change_admin_pin', { current_pin: '1357', new_pin: '8642' })
  assert.equal(error, null)
  assert.deepEqual(data, { success: true, outcome: 'ok' })
})

test('rotación: migración aditiva sin permisos operativos ni activación de operadores', () => {
  const sql = readFileSync(migration, 'utf8')
  assert.match(sql, /create function private\.is_operational_admin\(\)/i)
  assert.match(sql, /create function public\.change_admin_pin\(current_pin text, new_pin text\)/i)
  assert.match(sql, /security invoker set search_path = ''/i)
  assert.doesNotMatch(sql, /(?:alter|update|grant[^;]*)\s+(?:on\s+)?public\.(?:orders|order_items)/i)
  assert.doesNotMatch(sql, /active\s*=\s*true/i)
  assert.doesNotMatch(sql, /create or replace function private\.is_active_admin/i)
})
