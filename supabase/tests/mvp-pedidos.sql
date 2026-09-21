\set ON_ERROR_STOP on

-- Arnés local para el contrato de pedidos del MVP.
-- Este archivo se ejecuta únicamente dentro de la base desechable creada por
-- run-mvp-pedidos.sh. Usa \ir para validar los archivos reales del proyecto.

\echo 'Preparando primitivas mínimas de Supabase Auth...'

select 'create role anon nologin'
where not exists (select 1 from pg_catalog.pg_roles where rolname = 'anon')
\gexec

select 'create role authenticated nologin'
where not exists (select 1 from pg_catalog.pg_roles where rolname = 'authenticated')
\gexec

select 'create role service_role nologin bypassrls'
where not exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role')
\gexec

create schema auth;

create table auth.users (
  id uuid primary key
);

create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(pg_catalog.current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- Primitiva local del claim firmado de Supabase; nunca consulta user_metadata.
create function auth.jwt()
returns jsonb language sql stable
as $$
  select coalesce(nullif(pg_catalog.current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Los proyectos Supabase conceden acceso a las tablas de public y dejan que
-- RLS decida las filas visibles. Este bloque reproduce ese entorno mínimo.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges for role postgres in schema public
  grant all on tables to service_role;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to anon, authenticated;
alter default privileges for role postgres in schema public
  grant all on sequences to service_role;

\echo 'Instalando el esquema inicial...'
\ir ../schema.sql

do $$
begin
  if pg_catalog.to_regclass('public.orders') is null
     or pg_catalog.to_regclass('public.order_items') is null
     or pg_catalog.to_regclass('public.products') is null
     or pg_catalog.to_regclass('public.customers') is null then
    raise exception 'FALLO: el esquema inicial no creó todas las tablas requeridas.';
  end if;
end $$;

\echo 'Sembrando identidades, catálogo e históricos anteriores al MVP...'

insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-333333333333');

insert into public.customers (id, auth_user_id, name, phone, profile_completed) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Cliente Uno', '04120000001', true),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '22222222-2222-4222-8222-222222222222', 'Cliente Dos', '04120000002', true);

insert into public.categories (id, name, sort_order)
values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'Pruebas MVP', 99);

insert into public.products (
  id,
  category_id,
  name,
  price,
  stock,
  discount_type,
  discount_value,
  active
) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'Producto con descuento', 10.00, 20, 'porcentaje', 10.00, true),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'Producto regular', 5.00, 20, null, null, true),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'Producto inactivo', 7.00, 20, null, null, false);

insert into public.orders (id, customer_id, order_type, address, status) values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'retiro', null, 'confirmado'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'delivery', 'Dirección histórica', 'listo');

insert into public.order_items (
  order_id,
  product_id,
  product_name,
  quantity,
  unit_price
) values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'Producto regular', 1, 5.00),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'Producto regular', 2, 5.00);

\echo 'Aplicando la migración base...'
\ir ../updates/2026-09-19-mvp-pedidos-base.sql

do $$
begin
  if pg_catalog.to_regclass('public.delivery_sectors') is null then
    raise exception 'FALLO: la migración base no creó delivery_sectors.';
  end if;

  if (select pg_catalog.count(*) from public.delivery_sectors) <> 3 then
    raise exception 'FALLO: se esperaban exactamente tres sectores iniciales.';
  end if;

  if not exists (
    select 1 from public.delivery_sectors
    where name = 'La Pedregosa' and delivery_fee = 1.00 and active
  ) then
    raise exception 'FALLO: La Pedregosa debe existir con tarifa 1.00.';
  end if;

  if not exists (
    select 1 from public.delivery_sectors
    where name = 'Belenzate' and delivery_fee = 2.00 and active
  ) then
    raise exception 'FALLO: Belenzate debe existir con tarifa 2.00.';
  end if;

  if not exists (
    select 1 from public.delivery_sectors
    where name = 'Campo Claro' and delivery_fee = 3.00 and active
  ) then
    raise exception 'FALLO: Campo Claro debe existir con tarifa 3.00.';
  end if;

  if not exists (
    select 1 from public.orders
    where id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'
      and order_type = 'retiro'
      and status = 'confirmado'
      and order_number > 0
  ) then
    raise exception 'FALLO: el pedido histórico con retiro dejó de ser compatible.';
  end if;

  if not exists (
    select 1 from public.orders
    where id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2'
      and order_type = 'delivery'
      and status = 'listo'
      and order_number > 0
  ) then
    raise exception 'FALLO: el pedido histórico con estado listo dejó de ser compatible.';
  end if;
end $$;

\echo 'Aplicando la migración atómica...'
\ir ../updates/2026-09-19-mvp-pedidos-atomicos.sql

do $$
begin
  if pg_catalog.to_regprocedure('public.create_delivery_order(jsonb)') is null then
    raise exception 'FALLO: la migración atómica no creó create_delivery_order(jsonb).';
  end if;
end $$;

\echo 'Aplicando la migración de dirección o ubicación...'
\ir ../updates/2026-09-20-checkout-ubicacion.sql

\echo 'Aplicando la migración de teléfonos compartidos...'
\ir ../updates/2026-09-20-mvp-clientes-telefono-no-unico.sql

-- Conserva definiciones y ACL históricas para detectar cambios de autorización.
create temporary table historical_policies as
select * from pg_catalog.pg_policies where schemaname = 'public';
create temporary table historical_acl as
select oid, relacl from pg_catalog.pg_class where relnamespace = 'public'::regnamespace;
create temporary table historical_checkout as
select pg_catalog.pg_get_functiondef('public.create_delivery_order(jsonb)'::regprocedure) as definition,
       proacl from pg_catalog.pg_proc where oid = 'public.create_delivery_order(jsonb)'::regprocedure;

\echo 'Aplicando la base administrativa...'
\ir ../updates/2026-09-20-mvp-operadores-y-acceso.sql

do $$
declare
  v_table regclass;
  v_role text;
begin
  if (select count(*) from public.admin_operators) <> 3
     or (select array_agg(display_name order by display_name) from public.admin_operators)
        <> array['Alejandro', 'Jorge', 'Marianny'] then
    raise exception 'FALLO: faltan los tres operadores aprobados.';
  end if;
  if exists (select 1 from public.admin_operators where active or auth_user_id is not null or not must_change_pin)
     or exists (select 1 from private.admin_operator_credentials)
     or exists (select 1 from private.admin_login_attempts) then
    raise exception 'FALLO: la semilla debe quedar pendiente y sin credenciales ni intentos.';
  end if;
  if exists (
    select 1 from pg_catalog.pg_attribute
    where attrelid = 'public.admin_operators'::regclass and attname in ('pin', 'pin_hash') and not attisdropped
  ) then
    raise exception 'FALLO: las credenciales quedaron en public.';
  end if;
  foreach v_table in array array['public.admin_operators'::regclass,
    'private.admin_operator_credentials'::regclass, 'private.admin_login_attempts'::regclass] loop
    if not (select relrowsecurity from pg_catalog.pg_class where oid = v_table) then
      raise exception 'FALLO: falta RLS en %.', v_table;
    end if;
    foreach v_role in array array['anon', 'authenticated', 'service_role'] loop
      if pg_catalog.has_table_privilege(v_role, v_table, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
         or (v_table <> 'public.admin_operators'::regclass and pg_catalog.has_table_privilege(v_role, v_table, 'SELECT')) then
        raise exception 'FALLO: permisos excesivos en % para %.', v_table, v_role;
      end if;
    end loop;
    if exists (select 1 from pg_catalog.pg_class c,
        lateral pg_catalog.aclexplode(c.relacl) a where c.oid = v_table and a.grantee = 0) then
      raise exception 'FALLO: PUBLIC tiene acceso a %.', v_table;
    end if;
  end loop;
  if exists (select 1 from pg_catalog.pg_proc p,
      lateral pg_catalog.aclexplode(p.proacl) a
      where p.oid = 'private.is_active_admin()'::regprocedure and a.grantee = 0)
     or pg_catalog.has_function_privilege('anon', 'private.is_active_admin()', 'EXECUTE') then
    raise exception 'FALLO: auxiliar ejecutable por PUBLIC o anon.';
  end if;
  if not exists (select 1 from pg_catalog.pg_proc
      where oid = 'private.is_active_admin()'::regprocedure and prosecdef
        and provolatile = 's' and proconfig @> array['search_path=""']) then
    raise exception 'FALLO: configuración insegura del auxiliar.';
  end if;
  if exists (select * from historical_policies except select * from pg_catalog.pg_policies)
     or exists (select * from pg_catalog.pg_policies where tablename <> 'admin_operators'
       and schemaname = 'public' except select * from historical_policies)
     or exists (select 1 from historical_acl h join pg_catalog.pg_class c on c.oid = h.oid
       where c.relacl is distinct from h.relacl)
     or exists (select 1 from historical_checkout h, pg_catalog.pg_proc p
       where p.oid = 'public.create_delivery_order(jsonb)'::regprocedure
       and (p.proacl is distinct from h.proacl or pg_catalog.pg_get_functiondef(p.oid) <> h.definition)) then
    raise exception 'FALLO: cambió el checkout o la autorización histórica.';
  end if;
end $$;

\echo 'Comprobando autorización y aislamiento administrativo...'
-- Solo fixtures ya existentes en auth.users de esta base desechable.
-- El rollback impide dejar operadores activados al ejecutar el checkout histórico.
begin;
update public.admin_operators set auth_user_id = '11111111-1111-4111-8111-111111111111', active = true
where normalized_name = 'alejandro';
update public.admin_operators set auth_user_id = '22222222-2222-4222-8222-222222222222'
where normalized_name = 'marianny';

do $$
begin
  begin
    update public.admin_operators set active = true where normalized_name = 'jorge';
    raise exception 'FALLO: se activó un operador sin Auth.';
  exception when check_violation then null;
  end;
  begin
    update public.admin_operators set auth_user_id = '11111111-1111-4111-8111-111111111111'
    where normalized_name = 'jorge';
    raise exception 'FALLO: dos operadores comparten Auth.';
  exception when unique_violation then null;
  end;
  begin
    insert into private.admin_operator_credentials (operator_id, pin_hash)
    select id, 'credencial-plana-de-prueba' from public.admin_operators where normalized_name = 'alejandro';
    raise exception 'FALLO: se aceptó una credencial plana.';
  exception when check_violation then null;
  end;
  -- Datos sintéticos, ningún PIN real ni hash se imprime.
  insert into private.admin_operator_credentials (operator_id, pin_hash)
  select id, public.crypt(pg_catalog.gen_random_uuid()::text, public.gen_salt('bf', 12))
  from public.admin_operators where normalized_name = 'alejandro';
  insert into private.admin_login_attempts (normalized_name, success, internal_reason)
  values ('desconocido', false, 'invalid_credentials');
end $$;

set local role anon;
do $$
declare v_table text;
begin
  foreach v_table in array array['public.admin_operators', 'private.admin_operator_credentials', 'private.admin_login_attempts'] loop
    begin
      execute 'select * from ' || v_table;
      raise exception 'FALLO: anon pudo leer %.', v_table;
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;
reset role;

set local role authenticated;
do $$
declare
  v_claims jsonb;
  v_table text;
  v_changed bigint;
begin
  perform pg_catalog.set_config('request.jwt.claim.sub', '', true);
  perform pg_catalog.set_config('request.jwt.claims', '{"is_anonymous":false}', true);
  if private.is_active_admin() is distinct from false then
    raise exception 'FALLO: sesión sin UID autorizada.';
  end if;
  perform pg_catalog.set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  foreach v_claims in array array[
    '{"is_anonymous":true,"user_metadata":{"is_admin":true,"is_anonymous":false}}'::jsonb,
    '{}'::jsonb, '{"is_anonymous":null}'::jsonb, '{"is_anonymous":"false"}'::jsonb
  ] loop
    perform pg_catalog.set_config('request.jwt.claims', v_claims::text, true);
    if private.is_active_admin() is distinct from false or exists (select 1 from public.admin_operators) then
      raise exception 'FALLO: anónimo o claim ausente/inválido autorizó al operador asociado.';
    end if;
  end loop;
  perform pg_catalog.set_config('request.jwt.claims', '{"is_anonymous":false,"user_metadata":{"is_admin":true,"role":"admin"}}', true);
  perform pg_catalog.set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
  if private.is_active_admin() is distinct from false or exists (select 1 from public.admin_operators) then
    raise exception 'FALLO: usuario sin operador autorizado por user_metadata.';
  end if;
  perform pg_catalog.set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
  if private.is_active_admin() is distinct from false or exists (select 1 from public.admin_operators) then
    raise exception 'FALLO: operador inactivo autorizado.';
  end if;
  perform pg_catalog.set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  if private.is_active_admin() is distinct from true
     or (select count(*) from public.admin_operators) <> 1
     or not exists (select 1 from public.admin_operators where normalized_name = 'alejandro') then
    raise exception 'FALLO: operador activo no reconocido o ve fichas ajenas.';
  end if;
  foreach v_table in array array['private.admin_operator_credentials', 'private.admin_login_attempts'] loop
    begin
      execute 'select * from ' || v_table;
      raise exception 'FALLO: incluso el operador activo pudo leer %.', v_table;
    exception when insufficient_privilege then null;
    end;
  end loop;
  begin
    update public.admin_operators set active = true;
    raise exception 'FALLO: operador puede cambiar autorización.';
  exception when insufficient_privilege then null;
  end;
  update public.orders set status = 'entregado';
  get diagnostics v_changed = row_count;
  if v_changed <> 0 then
    raise exception 'FALLO: operador ganó permisos de modificación de pedidos.';
  end if;
end $$;
reset role;

-- Desactivar corta la pertenencia inmediatamente, con el mismo JWT.
update public.admin_operators set active = false where normalized_name = 'alejandro';
set local role authenticated;
do $$
begin
  if private.is_active_admin() is distinct from false or exists (select 1 from public.admin_operators) then
    raise exception 'FALLO: desactivar no revocó la pertenencia con el JWT vigente.';
  end if;
end $$;
reset role;

-- Prueba RLS independiente de ACL: grants temporales, nunca en la migración.
grant select on private.admin_operator_credentials, private.admin_login_attempts to authenticated;
set local role authenticated;
do $$
begin
  if exists (select 1 from private.admin_operator_credentials)
     or exists (select 1 from private.admin_login_attempts) then
    raise exception 'FALLO: RLS privada deja ver datos con un grant accidental.';
  end if;
end $$;
reset role;
rollback;

-- Instala y prueba el backend antes de ejecutar las regresiones del checkout.
\ir admin-login.sql
\ir admin-pin.sql

-- Conserva claims de una sesión anónima realista, sin alterar el checkout.
select pg_catalog.set_config('request.jwt.claims', '{"is_anonymous":true}', false);

\echo 'Comprobando teléfonos compartidos y un perfil por sesión...'

do $$
begin
  if exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.customers'::pg_catalog.regclass
      and conname = 'customers_phone_key'
  ) then
    raise exception 'FALLO: customers_phone_key todavía impide reutilizar un teléfono.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.customers'::pg_catalog.regclass
      and conname = 'customers_auth_user_id_key'
      and contype = 'u'
  ) then
    raise exception 'FALLO: se perdió la unicidad de customers.auth_user_id.';
  end if;

  insert into public.customers (auth_user_id, name, phone, profile_completed)
  values ('33333333-3333-4333-8333-333333333333', 'Cliente Tres', '04120000001', true);

  if (
    select pg_catalog.count(*)
    from public.customers
    where phone = '04120000001'
  ) <> 2 then
    raise exception 'FALLO: dos clientes distintos no pudieron compartir el mismo teléfono.';
  end if;

  begin
    insert into public.customers (auth_user_id, name, phone, profile_completed)
    values ('33333333-3333-4333-8333-333333333333', 'Perfil duplicado', '04120000999', true);
    raise exception 'FALLO: un mismo auth_user_id pudo crear dos perfiles.';
  exception
    when unique_violation then null;
  end;
end $$;

\echo 'Comprobando la regla dirección o Google Maps...'

set role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

do $$
declare
  v_before_orders bigint;
begin
  select pg_catalog.count(*) into v_before_orders from public.orders;

  perform * from public.create_delivery_order(
    pg_catalog.jsonb_build_object(
      'customer_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'name', 'Cliente Uno',
      'phone', '04120000001',
      'sector_id', (select id::text from public.delivery_sectors where name = 'La Pedregosa'),
      'address', null,
      'google_maps_url', 'https://maps.google.com/?q=8.598325,-71.144694',
      'items', pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object(
          'product_id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
          'quantity', 1
        )
      )
    )
  );

  if not exists (
    select 1 from public.orders
    where address is null
      and google_maps_url = 'https://maps.google.com/?q=8.598325,-71.144694'
  ) then
    raise exception 'FALLO: dirección null con Google Maps válido no creó el pedido.';
  end if;

  perform * from public.create_delivery_order(
    pg_catalog.jsonb_build_object(
      'customer_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'name', 'Cliente Uno',
      'phone', '04120000001',
      'sector_id', (select id::text from public.delivery_sectors where name = 'La Pedregosa'),
      'address', 'Calle con dirección solamente',
      'google_maps_url', null,
      'items', pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object(
          'product_id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
          'quantity', 1
        )
      )
    )
  );

  if not exists (
    select 1 from public.orders
    where address = 'Calle con dirección solamente'
      and google_maps_url is null
  ) then
    raise exception 'FALLO: dirección válida con Google Maps null no creó el pedido.';
  end if;

  begin
    perform * from public.create_delivery_order(
      pg_catalog.jsonb_build_object(
        'customer_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        'name', 'Cliente Uno',
        'phone', '04120000001',
        'sector_id', (select id::text from public.delivery_sectors where name = 'La Pedregosa'),
        'address', null,
        'google_maps_url', null,
        'items', pg_catalog.jsonb_build_array(
          pg_catalog.jsonb_build_object(
            'product_id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
            'quantity', 1
          )
        )
      )
    );
    raise exception 'FALLO: la RPC aceptó un pedido sin dirección ni ubicación.';
  exception
    when sqlstate '22023' then null;
  end;

  if (select pg_catalog.count(*) from public.orders) <> v_before_orders + 2 then
    raise exception 'FALLO: la regla de destino dejó una cantidad inesperada de pedidos.';
  end if;
end $$;

reset role;

\echo 'Comprobando creación válida, importes autoritativos y Google Maps...'

set role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

select *
from public.create_delivery_order(
  pg_catalog.jsonb_build_object(
    'customer_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'name', 'Cliente Uno',
    'phone', '04120000001',
    'sector_id', (
      select id::text from public.delivery_sectors where name = 'Belenzate'
    ),
    'address', 'Av. Andes 123',
    'instructions', 'Portón verde',
    'google_maps_url', 'https://maps.app.goo.gl/AbCdEf123',
    'items', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'product_id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
        'quantity', 2
      ),
      pg_catalog.jsonb_build_object(
        'product_id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
        'quantity', 1
      )
    )
  )
);

reset role;

do $$
declare
  v_order public.orders%rowtype;
begin
  select * into strict v_order
  from public.orders
  where address = 'Av. Andes 123';

  if v_order.order_type <> 'delivery' then
    raise exception 'FALLO: el pedido nuevo no es delivery.';
  end if;
  if v_order.status <> 'nuevo' then
    raise exception 'FALLO: el pedido nuevo no inició en estado nuevo.';
  end if;
  if ('AM-' || pg_catalog.lpad(v_order.order_number::text, 5, '0')) !~ '^AM-[0-9]{5,}$' then
    raise exception 'FALLO: el número visible del pedido no tiene formato AM válido.';
  end if;
  if v_order.subtotal <> 23.00 then
    raise exception 'FALLO: subtotal esperado 23.00, obtenido %.', v_order.subtotal;
  end if;
  if v_order.delivery_fee <> 2.00 then
    raise exception 'FALLO: delivery esperado 2.00, obtenido %.', v_order.delivery_fee;
  end if;
  if v_order.total <> 25.00 then
    raise exception 'FALLO: total esperado 25.00, obtenido %.', v_order.total;
  end if;
  if v_order.google_maps_url <> 'https://maps.app.goo.gl/AbCdEf123' then
    raise exception 'FALLO: no se conservó la URL válida de Google Maps.';
  end if;
  if (select pg_catalog.count(*) from public.order_items where order_id = v_order.id) <> 2 then
    raise exception 'FALLO: el pedido no creó exactamente sus dos ítems.';
  end if;
  if not exists (
    select 1 from public.order_items
    where order_id = v_order.id
      and product_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
      and product_name = 'Producto con descuento'
      and quantity = 2
      and unit_price = 9.00
      and line_total = 18.00
  ) then
    raise exception 'FALLO: el precio/descuento del primer producto no se calculó desde products.';
  end if;
  if not exists (
    select 1 from public.order_items
    where order_id = v_order.id
      and product_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
      and product_name = 'Producto regular'
      and quantity = 1
      and unit_price = 5.00
      and line_total = 5.00
  ) then
    raise exception 'FALLO: el segundo ítem no conserva los valores autoritativos.';
  end if;
end $$;

\echo 'Comprobando rechazo de campos manipulados...'

set role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

do $$
declare
  v_field text;
  v_before_orders bigint;
  v_payload jsonb;
begin
  select pg_catalog.count(*) into v_before_orders from public.orders;

  foreach v_field in array array['price', 'product_name', 'subtotal', 'delivery', 'total'] loop
    v_payload := pg_catalog.jsonb_build_object(
      'customer_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'name', 'Cliente Uno',
      'phone', '04120000001',
      'sector_id', (select id::text from public.delivery_sectors where name = 'La Pedregosa'),
      'address', 'Intento manipulado ' || v_field,
      'items', pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object(
          'product_id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
          'quantity', 1
        )
      )
    ) || pg_catalog.jsonb_build_object(v_field, 0);

    begin
      perform * from public.create_delivery_order(v_payload);
      raise exception 'FALLO: la RPC aceptó el campo manipulado %.', v_field;
    exception
      when sqlstate '22023' then null;
    end;
  end loop;

  if (select pg_catalog.count(*) from public.orders) <> v_before_orders then
    raise exception 'FALLO: un payload manipulado creó un pedido.';
  end if;
end $$;

reset role;

\echo 'Comprobando rollback por producto inexistente o inactivo...'

set role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

do $$
declare
  v_product_id text;
  v_before_orders bigint;
  v_before_items bigint;
  v_before_sequence bigint;
begin
  select pg_catalog.count(*) into v_before_orders from public.orders;
  select pg_catalog.count(*) into v_before_items from public.order_items;
  select last_value into v_before_sequence from public.orders_order_number_seq;

  foreach v_product_id in array array[
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3'
  ] loop
    begin
      perform * from public.create_delivery_order(
        pg_catalog.jsonb_build_object(
          'customer_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
          'name', 'Cliente Uno',
          'phone', '04120000001',
          'sector_id', (select id::text from public.delivery_sectors where name = 'La Pedregosa'),
          'address', 'No debe persistir',
          'items', pg_catalog.jsonb_build_array(
            pg_catalog.jsonb_build_object('product_id', v_product_id, 'quantity', 1)
          )
        )
      );
      raise exception 'FALLO: la RPC aceptó el producto inválido %.', v_product_id;
    exception
      when sqlstate '22023' then null;
    end;
  end loop;

  if (select pg_catalog.count(*) from public.orders) <> v_before_orders then
    raise exception 'FALLO: quedó un pedido parcial tras rechazar un producto.';
  end if;
  if (select pg_catalog.count(*) from public.order_items) <> v_before_items then
    raise exception 'FALLO: quedaron ítems parciales tras rechazar un producto.';
  end if;
  if (select last_value from public.orders_order_number_seq) <> v_before_sequence then
    raise exception 'FALLO: un producto rechazado consumió un número de pedido.';
  end if;
end $$;

reset role;

\echo 'Comprobando sector inactivo y URL inválida...'

select pg_catalog.set_config('test.inactive_sector_id', id::text, false)
from public.delivery_sectors
where name = 'Campo Claro';

update public.delivery_sectors set active = false where name = 'Campo Claro';

set role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

do $$
declare
  v_before_orders bigint;
begin
  select pg_catalog.count(*) into v_before_orders from public.orders;

  begin
    perform * from public.create_delivery_order(
      pg_catalog.jsonb_build_object(
        'customer_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        'name', 'Cliente Uno',
        'phone', '04120000001',
        'sector_id', pg_catalog.current_setting('test.inactive_sector_id'),
        'address', 'Sector inactivo',
        'items', pg_catalog.jsonb_build_array(
          pg_catalog.jsonb_build_object(
            'product_id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
            'quantity', 1
          )
        )
      )
    );
    raise exception 'FALLO: la RPC aceptó un sector inactivo.';
  exception
    when sqlstate '22023' then null;
  end;

  begin
    perform * from public.create_delivery_order(
      pg_catalog.jsonb_build_object(
        'customer_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        'name', 'Cliente Uno',
        'phone', '04120000001',
        'sector_id', (select id::text from public.delivery_sectors where name = 'La Pedregosa'),
        'address', 'URL inválida',
        'google_maps_url', 'javascript:alert(1)',
        'items', pg_catalog.jsonb_build_array(
          pg_catalog.jsonb_build_object(
            'product_id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
            'quantity', 1
          )
        )
      )
    );
    raise exception 'FALLO: la RPC aceptó una URL inválida de Google Maps.';
  exception
    when sqlstate '22023' then null;
  end;

  if (select pg_catalog.count(*) from public.orders) <> v_before_orders then
    raise exception 'FALLO: un sector o URL inválidos dejaron un pedido parcial.';
  end if;
end $$;

reset role;

\echo 'Comprobando propiedad, aislamiento RLS e inserts directos...'

set role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);

do $$
begin
  if exists (select 1 from public.orders where address = 'Av. Andes 123') then
    raise exception 'FALLO: una sesión pudo leer el pedido de otra sesión.';
  end if;

  begin
    perform * from public.create_delivery_order(
      pg_catalog.jsonb_build_object(
        'customer_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        'name', 'Cliente Uno',
        'phone', '04120000001',
        'sector_id', (select id::text from public.delivery_sectors where name = 'La Pedregosa'),
        'address', 'Cliente ajeno',
        'items', pg_catalog.jsonb_build_array(
          pg_catalog.jsonb_build_object(
            'product_id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
            'quantity', 1
          )
        )
      )
    );
    raise exception 'FALLO: una sesión creó un pedido con customer_id ajeno.';
  exception
    when sqlstate '42501' then null;
  end;

  begin
    insert into public.orders (customer_id, order_type, address, status)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'delivery', 'Inserción directa', 'nuevo');
    raise exception 'FALLO: authenticated conserva INSERT directo sobre orders.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price
    ) values (
      'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
      'Inserción directa',
      1,
      0.01
    );
    raise exception 'FALLO: authenticated conserva INSERT directo sobre order_items.';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;

do $$
begin
  if (select pg_catalog.count(*) from public.orders where address = 'Av. Andes 123') <> 1 then
    raise exception 'FALLO: el pedido válido desapareció durante las pruebas.';
  end if;
  if exists (select 1 from public.orders where address in ('Cliente ajeno', 'Inserción directa')) then
    raise exception 'FALLO: persistió un pedido que debía rechazarse.';
  end if;
end $$;

\echo 'OK: todas las pruebas SQL del MVP de pedidos pasaron.'
