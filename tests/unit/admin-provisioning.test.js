import test from 'node:test'
import assert from 'node:assert/strict'
import {
  EXPECTED_OPERATORS,
  buildProvisionSql,
  quoteIdentifier,
  validateDatabaseUrl,
  validateIds,
  validateInputs,
} from '../../scripts/provision-admin-operators.mjs'

test('aprovisionamiento: exige TLS y no acepta contraseña en la URL', () => {
  assert.equal(validateDatabaseUrl('postgresql://db.example/postgres?sslmode=require'), 'postgresql://db.example/postgres?sslmode=require')
  assert.throws(() => validateDatabaseUrl('postgresql://user:secret@db.example/postgres?sslmode=require'))
  assert.throws(() => validateDatabaseUrl('postgresql://db.example/postgres'))
})

test('aprovisionamiento: valida tres UUID y PIN oculto sin persistir valores', () => {
  const ids = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003']
  assert.deepEqual(validateIds(ids), ids)
  assert.deepEqual(validateInputs(ids, '9'.repeat(4), '9'.repeat(4)).ids, ids)
  assert.throws(() => validateInputs([ids[0], ids[0], ids[2]], '9'.repeat(4), '9'.repeat(4)), /distinto/)
  assert.throws(() => validateInputs(ids, '9'.repeat(3), '9'.repeat(3)))
  assert.throws(() => validateInputs(ids, '9'.repeat(4), '8'.repeat(4)))
  assert.throws(() => validateInputs(['no-es-uuid', ...ids.slice(1)], '9'.repeat(4), '9'.repeat(4)))
})

test('aprovisionamiento: UUID distintos se asocian al nombre y correo exactos', () => {
  const sql = buildProvisionSql('extensions')
  for (const { name, email } of EXPECTED_OPERATORS) {
    assert.match(sql, new RegExp(`'${name}'.*'${email}'`, 's'))
  }
  assert.match(sql, /join auth\.users u on u\.id = requested\.auth_user_id/)
  assert.match(sql, /lower\(u\.email\) = requested\.expected_email/)
  assert.match(sql, /u\.is_anonymous = false/)
  assert.match(sql, /u\.email_confirmed_at is not null/)
  assert.doesNotMatch(sql, /o\.id = requested\.auth_user_id/)
})

test('aprovisionamiento: SQL usa bind parameters, bcrypt 12 y conserva estado inactivo', () => {
  const sql = buildProvisionSql('extensions')
  assert.match(sql, /\\bind/g)
  assert.match(sql, /crypt\(i\.temporary_pin, "extensions"\.gen_salt\('bf', 12\)\)/)
  assert.match(sql, /active = false, must_change_pin = true/)
  assert.doesNotMatch(sql, /pin_hash\s*:=|INSERT.*'9{4}'/i)
  assert.equal(quoteIdentifier('extensions'), '"extensions"')
  assert.throws(() => quoteIdentifier('extensions;drop schema public'))
})

test('aprovisionamiento: --check no escribe y cualquier desajuste revierte la transacción', () => {
  const ids = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003']
  const checkSql = buildProvisionSql('extensions', ids, { validateOnly: true })
  const writeSql = buildProvisionSql('extensions', [...ids, '9'.repeat(4)])
  assert.match(checkSql, /\\quit 0/)
  assert.doesNotMatch(checkSql, /with input|commit;/)
  assert.doesNotMatch(checkSql, /update public\.admin_operators|insert into private\.admin_operator_credentials/)
  assert.ok(writeSql.indexOf('select 1 / 0') < writeSql.indexOf('update public.admin_operators'))
  assert.match(writeSql, /select count\(\*\) = 3 as write_ok/)
  assert.match(writeSql, /\\if :write_ok[\s\S]*?\\else[\s\S]*?select 1 \/ 0;/)
  assert.match(writeSql, /begin;[\s\S]*commit;/)
})
