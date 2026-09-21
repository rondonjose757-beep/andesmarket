-- Aplicación manual después de admin-login-atomico. No activa operadores.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if pg_catalog.to_regprocedure('private.attempt_admin_login(text,text,text)') is null then
    raise exception 'Falta la migración de login administrativo.';
  end if;
end $$;

create table private.admin_pin_limits (
  operator_id uuid primary key references public.admin_operators(id) on delete restrict,
  failed_at timestamptz[] not null default '{}' check (cardinality(failed_at) <= 5),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);
create table private.admin_pin_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  operator_id uuid not null references public.admin_operators(id) on delete restrict,
  outcome text not null check (outcome in ('ok', 'denied', 'invalid_new_pin', 'rate_limited')),
  occurred_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days'),
  check (expires_at > occurred_at)
);
create index admin_pin_events_operator_time_idx on private.admin_pin_events(operator_id, occurred_at desc);
create index admin_pin_events_expiry_idx on private.admin_pin_events(expires_at);
alter table private.admin_pin_limits enable row level security;
alter table private.admin_pin_events enable row level security;
revoke all on private.admin_pin_limits, private.admin_pin_events from public, anon, authenticated, service_role;

create function private.is_operational_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null
    and coalesce(auth.jwt() -> 'is_anonymous' = 'false'::jsonb, false)
    and exists (
      select 1 from public.admin_operators o
      where o.auth_user_id = auth.uid() and o.active and not o.must_change_pin
    );
$$;
revoke all on function private.is_operational_admin() from public, anon, authenticated, service_role;
grant execute on function private.is_operational_admin() to authenticated;

create function private.change_admin_pin(current_pin text, new_pin text)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_operator public.admin_operators%rowtype;
  v_limit private.admin_pin_limits%rowtype;
  v_hash text;
  v_computed text;
  v_crypto text;
  v_now timestamptz;
  v_outcome text := 'denied';
begin
  if auth.uid() is null or not coalesce(auth.jwt() -> 'is_anonymous' = 'false'::jsonb, false) then
    return jsonb_build_object('success', false, 'outcome', 'denied');
  end if;
  -- Mismo orden relativo que login: operador antes de credencial.
  -- Tras esperar, PostgreSQL vuelve a comprobar la fila y se usa el hash vigente.
  select * into v_operator from public.admin_operators o
  where o.auth_user_id = auth.uid() for update;
  if v_operator.id is null or not v_operator.active then
    return jsonb_build_object('success', false, 'outcome', 'denied');
  end if;
  select c.pin_hash into v_hash from private.admin_operator_credentials c
  where c.operator_id = v_operator.id for update;
  insert into private.admin_pin_limits(operator_id) values(v_operator.id) on conflict do nothing;
  select * into strict v_limit from private.admin_pin_limits
  where operator_id = v_operator.id for update;
  v_now := pg_catalog.clock_timestamp();

  if v_limit.blocked_until > v_now then
    v_outcome := 'rate_limited';
  else
    select n.nspname into strict v_crypto from pg_catalog.pg_extension e
    join pg_catalog.pg_namespace n on n.oid = e.extnamespace where e.extname = 'pgcrypto';
    -- Acota bcrypt a entradas válidas, sin truncar ni convertir PIN a número.
    if current_pin is not null and length(current_pin) between 4 and 12
      and current_pin !~ '[^0-9]' and v_hash is not null then
      execute pg_catalog.format('select %I.crypt($1, $2)', v_crypto)
        into v_computed using current_pin, v_hash;
    end if;
    if v_computed is null or v_computed is distinct from v_hash then
      select coalesce(array_agg(t), '{}'::timestamptz[]) into v_limit.failed_at
      from unnest(v_limit.failed_at) t where t > v_now - interval '15 minutes';
      v_limit.failed_at := array_append(v_limit.failed_at, v_now);
      update private.admin_pin_limits set failed_at = v_limit.failed_at,
        blocked_until = case when cardinality(v_limit.failed_at) >= 5 then v_now + interval '15 minutes' end,
        updated_at = v_now where operator_id = v_operator.id;
      if cardinality(v_limit.failed_at) >= 5 then v_outcome := 'rate_limited'; end if;
    elsif new_pin is null or length(new_pin) <> 4 or new_pin ~ '[^0-9]'
      -- Valor prohibido de política, no credencial aprovisionada ni secreto.
      or new_pin = '2405' or new_pin = current_pin then
      v_outcome := 'invalid_new_pin';
    else
      execute pg_catalog.format('select %I.crypt($1, %I.gen_salt(''bf'', 12))', v_crypto, v_crypto)
        into v_computed using new_pin;
      update private.admin_operator_credentials set pin_hash = v_computed, pin_changed_at = v_now
      where operator_id = v_operator.id;
      update public.admin_operators set must_change_pin = false where id = v_operator.id;
      v_outcome := 'ok';
    end if;
  end if;
  -- No excepciones para rechazos esperados: conservan contador y auditoría al
  -- confirmar la RPC. No se guardan entradas, hashes, JWT, IP ni texto libre.
  insert into private.admin_pin_events(operator_id, outcome, occurred_at, expires_at)
  values(v_operator.id, v_outcome, v_now, v_now + interval '90 days');
  return jsonb_build_object('success', v_outcome = 'ok', 'outcome', v_outcome);
end;
$$;
revoke all on function private.change_admin_pin(text,text) from public, anon, authenticated, service_role;
grant execute on function private.change_admin_pin(text,text) to authenticated;

create function public.change_admin_pin(current_pin text, new_pin text)
returns jsonb language sql volatile security invoker set search_path = ''
as $$ select private.change_admin_pin(current_pin, new_pin); $$;
revoke all on function public.change_admin_pin(text,text) from public, anon, authenticated, service_role;
grant execute on function public.change_admin_pin(text,text) to authenticated;

comment on function private.is_operational_admin() is
  'Usar en futuras RPC/RLS operativas: pertenencia activa no anónima y PIN individual cambiado. No concede permisos por sí sola.';
comment on function private.change_admin_pin(text,text) is
  'Rotación autenticada atómica con cinco fallos/15 min y bloqueo 15 min independiente del login. No revoca sesiones Auth.';
notify pgrst, 'reload schema';
commit;
