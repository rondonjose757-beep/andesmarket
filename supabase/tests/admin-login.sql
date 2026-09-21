-- Incluido por mvp-pedidos.sql, exclusivamente en PostgreSQL desechable.
\echo 'Aplicando login atómico y verificando contrato privado...'
\ir ../updates/2026-09-21-admin-login-atomico.sql

do $$
declare v_role text; v_function regprocedure;
begin
  foreach v_function in array array[
    'private.attempt_admin_login(text,text,text)'::regprocedure,
    'public.admin_login_attempt(text,text,text)'::regprocedure
  ] loop
    foreach v_role in array array['anon', 'authenticated'] loop
      if pg_catalog.has_function_privilege(v_role, v_function, 'EXECUTE') then
        raise exception 'FALLO: rol cliente puede ejecutar login.';
      end if;
    end loop;
    if not pg_catalog.has_function_privilege('service_role', v_function, 'EXECUTE') then
      raise exception 'FALLO: backend no puede ejecutar login.';
    end if;
    if exists (select 1 from pg_catalog.pg_proc p, lateral pg_catalog.aclexplode(p.proacl) a
      where p.oid = v_function and a.grantee = 0) then
      raise exception 'FALLO: PUBLIC puede ejecutar login.';
    end if;
  end loop;
  if not (select relrowsecurity from pg_catalog.pg_class where oid = 'private.admin_login_limits'::regclass)
     or pg_catalog.has_table_privilege('service_role', 'private.admin_operator_credentials', 'SELECT')
     or pg_catalog.has_table_privilege('service_role', 'private.admin_login_limits', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'FALLO: RLS o permisos mínimos incorrectos.';
  end if;
end $$;

set role authenticated;
do $$
begin
  begin
    perform * from private.attempt_admin_login('alejandro', '0000', repeat('a', 64));
    raise exception 'FALLO: authenticated llamó la función privada.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.admin_login_attempt('alejandro', '0000', repeat('a', 64));
    raise exception 'FALLO: authenticated llamó el puente.';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set role anon;
do $$
begin
  begin
    perform * from public.admin_login_attempt('alejandro', '0000', repeat('a', 64));
    raise exception 'FALLO: anon llamó el puente.';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

begin;
set local role service_role;
do $$
declare v_result record;
begin
  select * into v_result from public.admin_login_attempt('alejandro', '0000', repeat('a', 64));
  if v_result.outcome <> 'unavailable' or v_result.success or v_result.operator_id is not null then
    raise exception 'FALLO: base sin aprovisionar debe devolver error interno seguro.';
  end if;
end $$;
reset role;
rollback;

begin;
-- PIN solo sintético en memoria. No se imprime ni se guarda en scripts secretos.
do $$
begin
  perform set_config('test.admin_pin', (100000 + floor(random() * 900000))::int::text, true);
end $$;
update public.admin_operators set auth_user_id = '11111111-1111-4111-8111-111111111111', active = true
where normalized_name = 'alejandro';
update public.admin_operators set auth_user_id = '22222222-2222-4222-8222-222222222222'
where normalized_name = 'marianny';
insert into private.admin_operator_credentials (operator_id, pin_hash)
select id, public.crypt(current_setting('test.admin_pin'), public.gen_salt('bf', 12))
from public.admin_operators where normalized_name in ('alejandro', 'marianny');

set local role service_role;
do $$
declare v_result record; v_name text;
begin
  select * into v_result from public.admin_login_attempt('  ALEJANDRO  ', current_setting('test.admin_pin'), repeat('a', 64));
  if not v_result.success or v_result.outcome <> 'ok' or v_result.operator_id is null
     or v_result.auth_user_id <> '11111111-1111-4111-8111-111111111111'
     or not v_result.must_change_pin then
    raise exception 'FALLO: login válido o normalización incorrectos.';
  end if;
  foreach v_name in array array['alejandro', 'marianny', 'nadie'] loop
    select * into v_result from public.admin_login_attempt(v_name, '0000', repeat('b', 64));
    if v_result.success or v_result.outcome <> 'denied' or v_result.operator_id is not null
      or v_result.auth_user_id is not null or v_result.must_change_pin is not null then
      raise exception 'FALLO: fallo no genérico o datos filtrados.';
    end if;
  end loop;
  select * into v_result from public.admin_login_attempt('marianny', current_setting('test.admin_pin'), repeat('c', 64));
  if v_result.outcome <> 'denied' then raise exception 'FALLO: operador inactivo inició sesión.'; end if;
end $$;
reset role;
do $$
begin
  if (select last_login_at from public.admin_operators where normalized_name = 'alejandro') is null
    or (select last_login_at from public.admin_operators where normalized_name = 'marianny') is not null then
    raise exception 'FALLO: last_login_at no corresponde al éxito.';
  end if;
  if (select count(*) from private.admin_login_attempts) <> 5
    or (select count(*) from private.admin_login_attempts where success) <> 1
    or exists (select 1 from private.admin_login_attempts where network_hmac is null or octet_length(network_hmac) <> 32)
    or exists (select 1 from private.admin_login_attempts a
      where row_to_json(a)::text like '%' || current_setting('test.admin_pin') || '%') then
    raise exception 'FALLO: registro de intentos incorrecto o datos sensibles persistidos.';
  end if;
end $$;
set local role service_role;
do $$
declare v_result record; i int;
begin
  -- Ya existe un fallo de Alejandro. Cuatro más completan el límite, aunque
  -- el primer intento de la transacción haya validado correctamente el PIN.
  for i in 1..4 loop
    perform * from public.admin_login_attempt('alejandro', '0000', lpad(to_hex(50 + i), 64, '0'));
  end loop;
  select * into v_result from public.admin_login_attempt('alejandro', current_setting('test.admin_pin'), repeat('8', 64));
  if v_result.success or v_result.outcome <> 'rate_limited' or v_result.auth_user_id is not null then
    raise exception 'FALLO: PIN correcto permitió saltarse el bloqueo por nombre.';
  end if;
end $$;
reset role;
rollback;

begin;
-- Un operador aprovisionado mantiene disponible el sistema; las pruebas de
-- bloqueo usan nombres inexistentes para comprobar también antienumeración.
update public.admin_operators set auth_user_id = '11111111-1111-4111-8111-111111111111', active = true
where normalized_name = 'alejandro';
insert into private.admin_operator_credentials (operator_id, pin_hash)
select id, public.crypt(gen_random_uuid()::text, public.gen_salt('bf', 12))
from public.admin_operators where normalized_name = 'alejandro';
set local role service_role;
do $$
declare v_result record; i int;
begin
  for i in 1..5 loop
    select * into v_result from public.admin_login_attempt('objetivo', '0000', lpad(to_hex(i), 64, '0'));
    if v_result.outcome <> (case when i = 5 then 'rate_limited' else 'denied' end) then
      raise exception 'FALLO: límite por nombre con redes diferentes.';
    end if;
  end loop;
  select * into v_result from public.admin_login_attempt('objetivo', '0000', repeat('e', 64));
  if v_result.outcome <> 'rate_limited' then raise exception 'FALLO: sexto intento no bloqueado.'; end if;
  for i in 1..6 loop
    select * into v_result from public.admin_login_attempt('rotado' || chr(96 + i), '0000', repeat('f', 64));
    if v_result.outcome <> (case when i >= 5 then 'rate_limited' else 'denied' end) then
      raise exception 'FALLO: límite global por huella permite rotar nombres.';
    end if;
  end loop;
end $$;
reset role;

do $$
declare v_until timestamptz; v_result record;
begin
  select blocked_until into v_until from private.admin_login_limits where scope = 'name' and key = 'objetivo';
  perform * from private.attempt_admin_login('objetivo', '0000', repeat('e', 64));
  if v_until is distinct from (select blocked_until from private.admin_login_limits where scope = 'name' and key = 'objetivo') then
    raise exception 'FALLO: solicitud bloqueada prolongó el bloqueo.';
  end if;
  -- Avanza el estado de prueba, sin sleeps de 15 minutos ni reloj manipulable en producción.
  update private.admin_login_limits set blocked_until = now() - interval '1 second',
    failed_at = array[now() - interval '16 minutes'] where scope = 'name' and key = 'objetivo';
  select * into v_result from private.attempt_admin_login('objetivo', '0000', repeat('d', 64));
  if v_result.outcome <> 'denied' then raise exception 'FALLO: bloqueo no expira.'; end if;
  perform * from private.attempt_admin_login('nombre invalido 9999', '0000', '192.0.2.1');
  if exists (select 1 from private.admin_login_attempts a where row_to_json(a)::text like '%192.0.2.1%'
    or normalized_name = 'nombre invalido 9999') then
    raise exception 'FALLO: se guardó IP plana o entrada inválida.';
  end if;
end $$;
rollback;

\echo 'Comprobando concurrencia real con ocho conexiones PostgreSQL locales...'
-- dblink solo es dependencia del arnés; nunca se instala en las migraciones.
create extension dblink;
create temporary table concurrent_results (outcome text);
do $$
declare i int; v_conn text; v_query text;
begin
  if current_database() !~ '^andesmarket_.*test' then
    raise exception 'FALLO: concurrencia requiere una base local de pruebas AndesMarket.';
  end if;
  v_conn := format('host=%L port=%s dbname=%L user=postgres',
    split_part(current_setting('unix_socket_directories'), ',', 1),
    current_setting('port'), current_database());
  -- Sin identidades disponibles todos fallan, pero los mismos límites aplican.
  for i in 1..8 loop
    perform public.dblink_connect('login' || i, v_conn);
    perform public.dblink_exec('login' || i, 'set role service_role');
    v_query := format('select outcome from public.admin_login_attempt(%L, %L, %L)',
      'concurrente', '0000', lpad(to_hex(100 + i), 64, '0'));
    perform public.dblink_send_query('login' || i, v_query);
  end loop;
  for i in 1..8 loop
    insert into concurrent_results select * from public.dblink_get_result('login' || i) as r(outcome text);
    perform public.dblink_disconnect('login' || i);
  end loop;
  if (select count(*) from concurrent_results where outcome = 'unavailable') <> 4
    or (select count(*) from concurrent_results where outcome = 'rate_limited') <> 4
    or (select cardinality(failed_at) from private.admin_login_limits where scope = 'name' and key = 'concurrente') <> 5 then
    raise exception 'FALLO: ocho requests concurrentes sobrepasaron cinco fallos por nombre.';
  end if;
  delete from concurrent_results;
  for i in 1..8 loop
    perform public.dblink_connect('login' || i, v_conn);
    perform public.dblink_exec('login' || i, 'set role service_role');
    v_query := format('select outcome from public.admin_login_attempt(%L, %L, %L)',
      'concurrente' || chr(96 + i), '0000', repeat('9', 64));
    perform public.dblink_send_query('login' || i, v_query);
  end loop;
  for i in 1..8 loop
    insert into concurrent_results select * from public.dblink_get_result('login' || i) as r(outcome text);
    perform public.dblink_disconnect('login' || i);
  end loop;
  if (select count(*) from concurrent_results where outcome = 'unavailable') <> 4
    or (select count(*) from concurrent_results where outcome = 'rate_limited') <> 4 then
    raise exception 'FALLO: concurrencia con nombres rotados eludió el límite global de red.';
  end if;
end $$;
drop extension dblink;

do $$
begin
  if exists (select 1 from historical_checkout h, pg_catalog.pg_proc p
    where p.oid = 'public.create_delivery_order(jsonb)'::regprocedure
    and (p.proacl is distinct from h.proacl or pg_catalog.pg_get_functiondef(p.oid) <> h.definition))
    or exists (select * from historical_policies except select * from pg_catalog.pg_policies)
    or exists (select * from pg_catalog.pg_policies where schemaname = 'public'
      and tablename <> 'admin_operators' except select * from historical_policies) then
    raise exception 'FALLO: el login alteró la autorización o RPC pública histórica.';
  end if;
end $$;
\echo 'OK: login atómico, RLS y concurrencia local.'
