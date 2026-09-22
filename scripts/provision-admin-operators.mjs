#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { stdin as input, stdout as output } from 'node:process'

export const DATABASE_ENV = 'ANDESMARKET_ADMIN_DATABASE_URL'
export const EXPECTED_OPERATORS = [
  { name: 'alejandro', email: 'rondon.jose.757@gmail.com' },
  { name: 'marianny', email: 'mariannymoran2405@gmail.com' },
  { name: 'jorge', email: 'aleteexplica@gmail.com' },
]
export const OPERATOR_NAMES = EXPECTED_OPERATORS.map(({ name }) => name)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateDatabaseUrl(raw) {
  if (typeof raw !== 'string' || !raw || !/^postgres(?:ql):\/\//i.test(raw)) {
    throw new Error(`${DATABASE_ENV} debe ser una URL PostgreSQL.`)
  }
  const url = new URL(raw)
  if (url.password) throw new Error('La URL no debe contener contraseña; se solicita de forma oculta.')
  if (url.searchParams.get('sslmode') !== 'require') {
    throw new Error('La URL debe exigir sslmode=require.')
  }
  return url.toString()
}

export function validateInputs(ids, pin, confirmation) {
  validateIds(ids)
  if (typeof pin !== 'string' || !/^[0-9]{4}$/.test(pin) || pin !== confirmation) {
    throw new Error('El PIN temporal debe tener cuatro dígitos y coincidir con su confirmación.')
  }
  return { ids: [...ids], pin }
}

export function validateIds(ids) {
  if (!Array.isArray(ids) || ids.length !== 3 || ids.some((id) => !UUID.test(id))) {
    throw new Error('Los tres UUID de Auth deben tener formato válido.')
  }
  if (new Set(ids.map((id) => id.toLowerCase())).size !== ids.length) {
    throw new Error('Cada operador debe tener un UUID de Auth distinto.')
  }
  return [...ids]
}

export function quoteIdentifier(identifier) {
  if (typeof identifier !== 'string' || !/^[a-z_][a-z0-9_]*$/i.test(identifier)) {
    throw new Error('Esquema criptográfico inesperado.')
  }
  return `"${identifier}"`
}

function psqlBindLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

export function buildProvisionSql(cryptoSchema, parameters = null, { validateOnly = false } = {}) {
  const crypto = quoteIdentifier(cryptoSchema)
  const guardParameters = parameters === null ? null : parameters.slice(0, 3)
  const guardBind = guardParameters === null ? '\\bind' : `\\bind ${guardParameters.map(psqlBindLiteral).join(' ')}`
  const bind = parameters === null ? '\\bind' : `\\bind ${parameters.map(psqlBindLiteral).join(' ')}`
  const writeBlock = validateOnly ? '\\quit 0' : String.raw`
with input(auth_user_id, normalized_name, expected_email, temporary_pin) as (
  values ($1::uuid, 'alejandro', 'rondon.jose.757@gmail.com', $4::text),
         ($2::uuid, 'marianny', 'mariannymoran2405@gmail.com', $4::text),
         ($3::uuid, 'jorge', 'aleteexplica@gmail.com', $4::text)
), hashes as materialized (
  select o.id, i.auth_user_id,
    ${crypto}.crypt(i.temporary_pin, ${crypto}.gen_salt('bf', 12)) as pin_hash
  from input i
  join public.admin_operators o on o.normalized_name = i.normalized_name
    and o.auth_user_id is null and o.active = false and o.must_change_pin = true
  join auth.users u on u.id = i.auth_user_id
    and lower(u.email) = i.expected_email
    and u.is_anonymous = false and u.email_confirmed_at is not null
  where not exists (select 1 from private.admin_operator_credentials c where c.operator_id = o.id)
), updated as (
  update public.admin_operators o
  set auth_user_id = h.auth_user_id, active = false, must_change_pin = true
  from hashes h where h.id = o.id
  returning o.id
), inserted as (
  insert into private.admin_operator_credentials (operator_id, pin_hash)
  select u.id, h.pin_hash from updated u join hashes h on h.id = u.id
  returning operator_id
)
select count(*) = 3 as write_ok from inserted
${bind}
\gset
\if :write_ok
\else
select 1 / 0;
\endif
commit;
`
  return String.raw`
\pset tuples_only on
\pset format unaligned
\o /dev/null
begin;
select (
  count(*) = 3
  and count(distinct validated.auth_user_id) = 3
  and coalesce(bool_and(validated.operator_auth_user_id is null
    and validated.active = false and validated.must_change_pin = true), false)
) as guard_ok
from (
  select requested.auth_user_id,
    o.auth_user_id as operator_auth_user_id, o.active, o.must_change_pin
  from (values
    ($1::uuid, 'alejandro', 'rondon.jose.757@gmail.com'),
    ($2::uuid, 'marianny', 'mariannymoran2405@gmail.com'),
    ($3::uuid, 'jorge', 'aleteexplica@gmail.com')
  ) as requested(auth_user_id, normalized_name, expected_email)
  join public.admin_operators o on o.normalized_name = requested.normalized_name
  join auth.users u on u.id = requested.auth_user_id
    and lower(u.email) = requested.expected_email
    and u.is_anonymous = false and u.email_confirmed_at is not null
  where o.auth_user_id is null
    and not exists (select 1 from private.admin_operator_credentials c where c.operator_id = o.id)
  for update of o, u
) as validated
${guardBind}
\gset
\if :guard_ok
\else
select 1 / 0;
\endif
${writeBlock}
\o
`
}

function readHidden(label) {
  if (!input.isTTY || !input.setRawMode) {
    throw new Error('La utilidad requiere una terminal interactiva para ocultar secretos.')
  }
  output.write(label)
  input.setRawMode(true)
  input.resume()
  return new Promise((resolve, reject) => {
    let value = ''
    const onData = (chunk) => {
      const text = chunk.toString('utf8')
      for (const char of text) {
        if (char === '\u0003') {
          cleanup()
          reject(new Error('Operación cancelada.'))
          return
        }
        if (char === '\r' || char === '\n') {
          cleanup()
          output.write('\n')
          resolve(value)
          return
        }
        if (char === '\u007f') value = value.slice(0, -1)
        else value += char
      }
    }
    const cleanup = () => {
      input.off('data', onData)
      input.setRawMode(false)
      input.pause()
    }
    input.on('data', onData)
  })
}

function runPsql(databaseUrl, password, script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('psql', [
      '--no-psqlrc', '--quiet', '--no-password', '--dbname', databaseUrl,
      '--set=ON_ERROR_STOP=1', '--set=VERBOSITY=terse', ...args,
    ], { env: { ...process.env, PGPASSWORD: password }, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', () => reject(new Error('No se pudo iniciar psql.')))
    child.on('close', (code) => {
      if (code === 0) resolve(stdout.trim())
      else reject(new Error('La operación no se completó; no se modificaron los operadores.'))
    })
    child.stdin.end(script)
  })
}

async function main() {
  if (process.argv.includes('--help')) {
    output.write(`Uso: ${process.argv[1]}\n\nSolicita UUID de Auth, contraseña de PostgreSQL y PIN temporal sin guardar valores.\nRequiere ${DATABASE_ENV} con sslmode=require.\n`)
    return
  }
  const databaseUrl = validateDatabaseUrl(process.env[DATABASE_ENV])
  const ids = []
  for (const name of OPERATOR_NAMES) ids.push(await readHidden(`UUID Auth de ${name} (oculto): `))
  validateIds(ids)
  const password = await readHidden('Contraseña PostgreSQL (oculta): ')
  const cryptoSchema = await runPsql(databaseUrl, password,
    "select n.nspname from pg_catalog.pg_extension e join pg_catalog.pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto';\n")
  if (process.argv.includes('--check')) {
    await runPsql(databaseUrl, password, buildProvisionSql(cryptoSchema, ids, { validateOnly: true }))
    output.write('Validación completada; no se escribió ninguna fila.\n')
    return
  }
  const pin = await readHidden('PIN temporal aprobado (oculto): ')
  const confirmation = await readHidden('Confirma el PIN temporal (oculto): ')
  validateInputs(ids, pin, confirmation)
  const sql = buildProvisionSql(cryptoSchema, [...ids, pin])
  await runPsql(databaseUrl, password, sql)
  output.write('Aprovisionamiento validado y aplicado. Los operadores siguen inactivos y con cambio de PIN obligatorio.\n')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    output.write(`${error.message}\n`)
    process.exitCode = 1
  })
}
