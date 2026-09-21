-- Fase inicial administrativa. Aplicación manual única, después de las
-- actualizaciones de pedidos, ubicación y clientes. No crea usuarios Auth.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if pg_catalog.to_regprocedure('auth.uid()') is null
     or pg_catalog.to_regprocedure('auth.jwt()') is null
     or pg_catalog.to_regprocedure('public.set_mvp_updated_at()') is null then
    raise exception 'Faltan las primitivas Auth o la migración base del MVP.';
  end if;
  if not exists (select 1 from pg_catalog.pg_extension where extname = 'pgcrypto') then
    raise exception 'Falta pgcrypto; revisar la instalación antes de continuar.';
  end if;
end $$;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
-- Solo resolución del auxiliar; no concede acceso a las tablas privadas.
grant usage on schema private to authenticated;

create table public.admin_operators (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete restrict,
  display_name text not null check (length(trim(display_name)) between 1 and 100),
  normalized_name text not null unique
    check (normalized_name = lower(trim(display_name))),
  active boolean not null default false,
  must_change_pin boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_operator_active_requires_auth check (not active or auth_user_id is not null)
);

create table private.admin_operator_credentials (
  operator_id uuid primary key references public.admin_operators(id) on delete restrict,
  -- Contrato inicial: bcrypt, coste 12. Nunca un PIN, ni hash rápido sin sal.
  pin_hash text not null check (pin_hash ~ '^\$2[aby]\$12\$[./A-Za-z0-9]{53}$'),
  pin_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.admin_login_attempts (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  operator_id uuid references public.admin_operators(id) on delete restrict,
  normalized_name text not null
    check (length(normalized_name) between 1 and 100 and normalized_name = lower(trim(normalized_name))),
  success boolean not null,
  -- Códigos cerrados: no admite mensajes de error, PIN, tokens ni IP en texto.
  internal_reason text not null check (internal_reason in (
    'success', 'invalid_credentials', 'inactive_operator', 'unlinked_operator',
    'rate_limited', 'invalid_request', 'auth_error'
  )),
  network_hmac bytea check (network_hmac is null or octet_length(network_hmac) = 32),
  attempted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days'),
  check (success = (internal_reason = 'success')),
  check (not success or operator_id is not null),
  check (expires_at > attempted_at)
);

create index admin_login_attempts_name_time_idx
  on private.admin_login_attempts (normalized_name, attempted_at desc);
create index admin_login_attempts_network_time_idx
  on private.admin_login_attempts (network_hmac, attempted_at desc)
  where network_hmac is not null;
create index admin_login_attempts_operator_time_idx
  on private.admin_login_attempts (operator_id, attempted_at desc)
  where operator_id is not null;
create index admin_login_attempts_expiry_idx on private.admin_login_attempts (expires_at);

create trigger admin_operators_set_updated_at
before update on public.admin_operators
for each row execute function public.set_mvp_updated_at();
create trigger admin_credentials_set_updated_at
before update on private.admin_operator_credentials
for each row execute function public.set_mvp_updated_at();

alter table public.admin_operators enable row level security;
alter table private.admin_operator_credentials enable row level security;
alter table private.admin_login_attempts enable row level security;

revoke all on public.admin_operators from public, anon, authenticated, service_role;
revoke all on private.admin_operator_credentials from public, anon, authenticated, service_role;
revoke all on private.admin_login_attempts from public, anon, authenticated, service_role;

create function private.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and coalesce(auth.jwt() -> 'is_anonymous' = 'false'::jsonb, false)
    and exists (
      select 1 from public.admin_operators as operator
      where operator.auth_user_id = auth.uid() and operator.active
    );
$$;

revoke all on function private.is_active_admin() from public, anon, authenticated, service_role;
grant execute on function private.is_active_admin() to authenticated;

-- El definer consulta pertenencia sin recursión de RLS. No recibe ids ni
-- nombres del cliente; devuelve solo la autorización de la sesión actual.
grant select on public.admin_operators to authenticated;
create policy "operadores activos leen su propia ficha"
  on public.admin_operators for select to authenticated
  using ((select private.is_active_admin()) and auth_user_id = (select auth.uid()));
-- Tablas privadas: ninguna política permisiva ni grants de datos en esta fase.
-- La integración servidor recibirá permisos acotados en su propia migración.

insert into public.admin_operators (display_name, normalized_name) values
  ('Alejandro', 'alejandro'), ('Marianny', 'marianny'), ('Jorge', 'jorge');

comment on table private.admin_operator_credentials is
  'Vacía inicialmente. Aprovisionar el PIN temporal fuera del SQL versionado; hash bcrypt con sal individual y cambio obligatorio.';
comment on column private.admin_login_attempts.network_hmac is
  'HMAC-SHA256 calculado por el servidor con secreto externo a la BD. Nunca IP plana ni hash simple de IP.';
comment on column private.admin_login_attempts.expires_at is
  'Retención inicial de 90 días; la limpieza y el bloqueo atómico se implementan con el login servidor.';
comment on function private.is_active_admin() is
  'Pertenencia activa con UID y claim firmado is_anonymous=false. No verifica PIN ni concede operaciones de pedidos.';

notify pgrst, 'reload schema';
commit;
