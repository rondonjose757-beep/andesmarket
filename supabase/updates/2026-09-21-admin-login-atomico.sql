-- Aplicación manual después de 2026-09-20-mvp-operadores-y-acceso.sql.
-- No aprovisiona identidades, PIN ni secretos. No modifica el checkout.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if pg_catalog.to_regclass('private.admin_operator_credentials') is null
     or pg_catalog.to_regprocedure('private.is_active_admin()') is null
     or not exists (select 1 from pg_catalog.pg_extension where extname = 'pgcrypto') then
    raise exception 'Falta la base de operadores o pgcrypto.';
  end if;
end $$;

-- Estado pequeño y bloqueable por nombre y por red; los eventos conservan
-- la auditoría. No depende de contadores en memoria de una Edge Function.
create table private.admin_login_limits (
  scope text not null check (scope in ('network', 'name')),
  key text not null check (length(key) between 1 and 100),
  failed_at timestamptz[] not null default '{}'
    check (cardinality(failed_at) <= 5),
  blocked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (scope, key),
  check (scope <> 'network' or key ~ '^[0-9a-f]{64}$')
);
alter table private.admin_login_limits enable row level security;
revoke all on private.admin_login_limits from public, anon, authenticated, service_role;
create index admin_login_limits_updated_idx on private.admin_login_limits (updated_at);

create function private.attempt_admin_login(
  p_normalized_name text, p_pin text, p_network_fingerprint text
)
returns table (
  success boolean, operator_id uuid, auth_user_id uuid,
  must_change_pin boolean, outcome text
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_valid boolean;
  v_network bytea;
  v_now timestamptz;
  v_network_limit private.admin_login_limits%rowtype;
  v_name_limit private.admin_login_limits%rowtype;
  v_operator public.admin_operators%rowtype;
  v_hash text;
  v_computed_hash text;
  v_crypto_schema text;
  v_matches boolean;
  v_reason text := 'invalid_credentials';
begin
  -- Preautenticación: no hay auth.uid(). La frontera es EXECUTE exclusivo
  -- de service_role (y el propietario); no se autoriza mediante claims cliente.
  success := false;
  operator_id := null;
  auth_user_id := null;
  must_change_pin := null;
  outcome := 'denied';
  v_name := pg_catalog.lower(pg_catalog.btrim(p_normalized_name));
  v_valid := coalesce(length(v_name) between 1 and 100
    and v_name ~ '^[a-záéíóúüñ]+( [a-záéíóúüñ]+)*$'
    and p_pin ~ '^[0-9]{4,12}$', false);

  if not v_valid then
    -- No persiste el contenido de una solicitud inválida en un campo de texto.
    v_name := 'solicitud-invalida';
    v_reason := 'invalid_request';
  end if;
  if p_network_fingerprint is null or p_network_fingerprint !~ '^[0-9a-f]{64}$' then
    insert into private.admin_login_attempts (normalized_name, success, internal_reason)
    values ('solicitud-invalida', false, 'invalid_request');
    return next;
    return;
  end if;
  v_network := pg_catalog.decode(p_network_fingerprint, 'hex');

  -- Orden único de locks: red, nombre, operador, credencial. Dos requests que
  -- compartan cualquiera de los límites se serializan antes de comprobarlo.
  insert into private.admin_login_limits (scope, key)
  values ('network', p_network_fingerprint) on conflict do nothing;
  select * into v_network_limit from private.admin_login_limits
  where scope = 'network' and key = p_network_fingerprint for update;
  insert into private.admin_login_limits (scope, key)
  values ('name', v_name) on conflict do nothing;
  select * into v_name_limit from private.admin_login_limits
  where scope = 'name' and key = v_name for update;
  -- clock_timestamp después del lock: no usa la hora anterior a la espera.
  v_now := pg_catalog.clock_timestamp();

  if v_network_limit.blocked_until > v_now or v_name_limit.blocked_until > v_now then
    insert into private.admin_login_attempts (
      normalized_name, success, internal_reason, network_hmac, attempted_at, expires_at
    ) values (v_name, false, 'rate_limited', v_network, v_now, v_now + interval '90 days');
    outcome := 'rate_limited';
    return next;
    return;
  end if;

  if v_valid then
    select * into v_operator from public.admin_operators
    where normalized_name = v_name for update;
    select c.pin_hash into v_hash from private.admin_operator_credentials c
    where c.operator_id = v_operator.id for share;
    select n.nspname into strict v_crypto_schema
    from pg_catalog.pg_extension e join pg_catalog.pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pgcrypto';
    -- Usa el esquema real de pgcrypto (public o extensions). Parámetros ligados,
    -- nunca PIN interpolado en SQL. Coste bcrypt también para nombre inexistente.
    execute pg_catalog.format(
      'select %I.crypt($1, coalesce($2, %I.gen_salt(''bf'', 12)))',
      v_crypto_schema, v_crypto_schema
    ) into v_computed_hash using p_pin, v_hash;
    -- Comparar después evita que una comparación con NULL permita al
    -- optimizador omitir el trabajo bcrypt del nombre inexistente.
    v_matches := v_hash is not null and v_computed_hash = v_hash;

    if not exists (
      select 1 from public.admin_operators o
      join private.admin_operator_credentials c on c.operator_id = o.id
      where o.active and o.auth_user_id is not null
    ) then
      -- Falta aprovisionamiento global: misma respuesta para cualquier nombre.
      v_reason := 'auth_error';
      outcome := 'unavailable';
    elsif v_operator.id is null then
      v_reason := 'invalid_credentials';
    elsif not v_operator.active then
      v_reason := 'inactive_operator';
    elsif v_matches is not true then
      v_reason := 'invalid_credentials';
    elsif v_operator.auth_user_id is null then
      v_reason := 'unlinked_operator';
      outcome := 'unavailable';
    else
      success := true;
      outcome := 'ok';
      v_reason := 'success';
      operator_id := v_operator.id;
      auth_user_id := v_operator.auth_user_id;
      must_change_pin := v_operator.must_change_pin;
      update public.admin_operators set last_login_at = v_now where id = v_operator.id;
    end if;
  end if;

  if not success then
    -- Ventana móvil real. El quinto fallo inicia 15 minutos completos de bloqueo.
    select coalesce(array_agg(t), '{}'::timestamptz[]) into v_network_limit.failed_at
    from unnest(v_network_limit.failed_at) t where t > v_now - interval '15 minutes';
    select coalesce(array_agg(t), '{}'::timestamptz[]) into v_name_limit.failed_at
    from unnest(v_name_limit.failed_at) t where t > v_now - interval '15 minutes';
    v_network_limit.failed_at := array_append(v_network_limit.failed_at, v_now);
    v_name_limit.failed_at := array_append(v_name_limit.failed_at, v_now);
    update private.admin_login_limits set failed_at = v_network_limit.failed_at,
      blocked_until = case when cardinality(v_network_limit.failed_at) >= 5
        then v_now + interval '15 minutes' end, updated_at = v_now
    where scope = 'network' and key = p_network_fingerprint;
    update private.admin_login_limits set failed_at = v_name_limit.failed_at,
      blocked_until = case when cardinality(v_name_limit.failed_at) >= 5
        then v_now + interval '15 minutes' end, updated_at = v_now
    where scope = 'name' and key = v_name;
    if cardinality(v_network_limit.failed_at) >= 5 or cardinality(v_name_limit.failed_at) >= 5 then
      outcome := 'rate_limited';
    end if;
  end if;

  insert into private.admin_login_attempts (
    operator_id, normalized_name, success, internal_reason, network_hmac, attempted_at, expires_at
  ) values (v_operator.id, v_name, success, v_reason, v_network, v_now, v_now + interval '90 days');
  return next;
end;
$$;

revoke all on function private.attempt_admin_login(text, text, text) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.attempt_admin_login(text, text, text) to service_role;

-- PostgREST no puede llamar a private sin exponer ese esquema. Este puente
-- INVOKER no adquiere privilegios y solo es ejecutable por el backend.
create function public.admin_login_attempt(
  p_normalized_name text, p_pin text, p_network_fingerprint text
)
returns table (
  success boolean, operator_id uuid, auth_user_id uuid,
  must_change_pin boolean, outcome text
)
language sql volatile security invoker set search_path = ''
as $$
  select * from private.attempt_admin_login(p_normalized_name, p_pin, p_network_fingerprint);
$$;
revoke all on function public.admin_login_attempt(text, text, text) from public, anon, authenticated;
grant execute on function public.admin_login_attempt(text, text, text) to service_role;

comment on function private.attempt_admin_login(text, text, text) is
  'Preautenticación exclusiva servidor: cinco fallos/15 min por nombre y global por HMAC; bloqueo 15 min. Éxito significa PIN validado, no canje Auth completado.';
comment on table private.admin_login_limits is
  'Estado de límites con locks de fila. Un éxito no reinicia fallos; requests bloqueadas no prolongan bloqueo. Limpieza solo de filas inactivas y fuera de ventana.';
notify pgrst, 'reload schema';
commit;
