\echo 'Verificando rotación de PIN y autorización operacional...'
\ir ../updates/2026-09-21-admin-pin-obligatorio.sql

begin;
update public.admin_operators set auth_user_id = '11111111-1111-4111-8111-111111111111', active = true
where normalized_name = 'alejandro';
insert into private.admin_operator_credentials(operator_id, pin_hash, pin_changed_at)
select id, public.crypt('1357', public.gen_salt('bf', 12)), now() - interval '1 day'
from public.admin_operators where normalized_name = 'alejandro';
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"is_anonymous":false}', true);
do $$
declare r jsonb; p text;
begin
  if not private.is_active_admin() or private.is_operational_admin() then
    raise exception 'FALLO: pertenencia y acceso operacional no separados';
  end if;
  foreach p in array array['abcd','123','12345',' 1234','1234 ', E'1234\n','１２３４', '2405', '1357', null] loop
    r := public.change_admin_pin('1357', p);
    if r->>'outcome' <> 'invalid_new_pin' then raise exception 'FALLO: validación nuevo PIN'; end if;
  end loop;
  r := public.change_admin_pin('9999', '8642');
  if r->>'outcome' <> 'denied' then raise exception 'FALLO: PIN actual incorrecto'; end if;
  r := public.change_admin_pin('1357', '8642');
  if r <> '{"success":true,"outcome":"ok"}'::jsonb or not private.is_operational_admin() then
    raise exception 'FALLO: cambio válido u operacional';
  end if;
  r := public.change_admin_pin('1357', '9753');
  if r->>'outcome' <> 'denied' then raise exception 'FALLO: PIN anterior aún válido'; end if;
end $$;
reset role;
do $$
begin
  if not exists (select 1 from private.admin_operator_credentials c join public.admin_operators o on o.id=c.operator_id
    where o.normalized_name='alejandro' and not o.must_change_pin
    and c.pin_changed_at > now() - interval '1 minute'
    and c.pin_hash = public.crypt('8642', c.pin_hash)
    and c.pin_hash ~ '^\$2[aby]\$12\$') then raise exception 'FALLO: persistencia atómica'; end if;
  if (select count(*) from private.admin_pin_events where outcome='ok') <> 1 then
    raise exception 'FALLO: auditoría de cambio'; end if;
end $$;
rollback;

-- ACL/RLS y denegación de sesiones sin pertenencia, incluso con metadata falsa.
do $$
declare role_name text; table_name text;
begin
  foreach role_name in array array['anon','authenticated','service_role'] loop
    foreach table_name in array array['admin_pin_events','admin_pin_limits'] loop
      if has_table_privilege(role_name, 'private.' || table_name, 'SELECT,INSERT,UPDATE,DELETE')
        or not (select relrowsecurity from pg_class where oid=('private.' || table_name)::regclass) then
        raise exception 'FALLO: acceso directo o RLS desactivado';
      end if;
    end loop;
    if has_function_privilege(role_name, 'public.change_admin_pin(text,text)', 'EXECUTE') <> (role_name='authenticated')
      or has_function_privilege(role_name, 'private.change_admin_pin(text,text)', 'EXECUTE') <> (role_name='authenticated') then
      raise exception 'FALLO: ACL de rotación';
    end if;
  end loop;
end $$;
begin;
update public.admin_operators set auth_user_id='11111111-1111-4111-8111-111111111111'
where normalized_name='alejandro';
set local role authenticated;
do $$
declare claims text;
begin
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
  foreach claims in array array['{"is_anonymous":false}', '{"is_anonymous":true}', '{}',
    '{"is_anonymous":"false"}', '{"user_metadata":{"is_admin":true,"is_anonymous":false}}'] loop
    perform set_config('request.jwt.claims',claims,true);
    if public.change_admin_pin('1357','8642')->>'outcome' <> 'denied'
      or private.is_operational_admin() then raise exception 'FALLO: inactivo/claims'; end if;
  end loop;
  perform set_config('request.jwt.claims','{"is_anonymous":false}',true);
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
  if public.change_admin_pin('1357','8642')->>'outcome' <> 'denied' then raise exception 'FALLO: usuario normal'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  if public.change_admin_pin('1357','8642')->>'outcome' <> 'denied' then raise exception 'FALLO: UID ausente'; end if;
end $$;
reset role;
update public.admin_operators set active=true where normalized_name='alejandro';
set local role authenticated;
do $$
begin
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
  perform set_config('request.jwt.claims','{"is_anonymous":true}',true);
  if public.change_admin_pin('1357','8642')->>'outcome' <> 'denied'
    or private.is_active_admin() or private.is_operational_admin() then raise exception 'FALLO: operador anónimo'; end if;
end $$;
reset role;
rollback;

-- Concurrencia real: conexiones locales exclusivamente, fixtures sintéticos.
create extension dblink;
update public.admin_operators set auth_user_id='11111111-1111-4111-8111-111111111111', active=true
where normalized_name='alejandro';
insert into private.admin_operator_credentials(operator_id,pin_hash)
select id, public.crypt('1357',public.gen_salt('bf',12)) from public.admin_operators where normalized_name='alejandro';
create temporary table pin_concurrent_results(result jsonb);
do $$
declare i int; conn text;
begin
  if current_database() !~ '^andesmarket_.*test' then raise exception 'Solo base local de pruebas'; end if;
  conn := format('host=%L port=%s dbname=%L user=postgres',
    split_part(current_setting('unix_socket_directories'),',',1),current_setting('port'),current_database());
  -- Barrera real: ambas solicitudes esperan al mismo operador hasta acabar este DO.
  perform 1 from public.admin_operators where normalized_name='alejandro' for update;
  for i in 1..2 loop
    perform public.dblink_connect('pin'||i,conn);
    perform public.dblink_exec('pin'||i, 'set role authenticated');
    perform public.dblink_exec('pin'||i, 'set request.jwt.claim.sub = ''11111111-1111-4111-8111-111111111111''');
    perform public.dblink_exec('pin'||i, 'set request.jwt.claims = ''{"is_anonymous":false}''');
    perform public.dblink_send_query('pin'||i,format('select public.change_admin_pin(%L,%L)',
      '1357',case when i=1 then '8642' else '9753' end));
  end loop;
end $$;
do $$
declare i int;
begin
  for i in 1..2 loop
    insert into pin_concurrent_results select * from public.dblink_get_result('pin'||i) as r(result jsonb);
    perform public.dblink_disconnect('pin'||i);
  end loop;
  if (select count(*) from pin_concurrent_results where result->>'outcome'='ok') <> 1
    or (select count(*) from pin_concurrent_results where result->>'outcome'='denied') <> 1
    or (select count(*) from private.admin_pin_events where outcome='ok') <> 1 then
    raise exception 'FALLO: dos cambios con el PIN anterior sobrescribieron datos'; end if;
  if not exists (select 1 from private.admin_operator_credentials c join public.admin_operators o on o.id=c.operator_id
    where o.normalized_name='alejandro' and not o.must_change_pin
    and (c.pin_hash=public.crypt('8642',c.pin_hash) or c.pin_hash=public.crypt('9753',c.pin_hash))) then
    raise exception 'FALLO: credencial concurrente inválida'; end if;
end $$;

-- Reinicio de fixtures, nunca contadores de producción.
delete from private.admin_pin_limits;
delete from pin_concurrent_results;
do $$
declare i int; conn text;
begin
  conn := format('host=%L port=%s dbname=%L user=postgres',
    split_part(current_setting('unix_socket_directories'),',',1),current_setting('port'),current_database());
  perform 1 from public.admin_operators where normalized_name='alejandro' for update;
  for i in 1..8 loop
    perform public.dblink_connect('pin'||i,conn);
    perform public.dblink_exec('pin'||i, 'set role authenticated');
    perform public.dblink_exec('pin'||i, 'set request.jwt.claim.sub = ''11111111-1111-4111-8111-111111111111''');
    perform public.dblink_exec('pin'||i, 'set request.jwt.claims = ''{"is_anonymous":false}''');
    perform public.dblink_send_query('pin'||i,'select public.change_admin_pin(''0000'',''2468'')');
  end loop;
end $$;
do $$
declare i int; until_time timestamptz; valid_pin text; r jsonb;
begin
  for i in 1..8 loop
    insert into pin_concurrent_results select * from public.dblink_get_result('pin'||i) as r(result jsonb);
    perform public.dblink_disconnect('pin'||i);
  end loop;
  if (select count(*) from pin_concurrent_results where result->>'outcome'='denied') <> 4
    or (select count(*) from pin_concurrent_results where result->>'outcome'='rate_limited') <> 4 then
    raise exception 'FALLO: límite concurrente'; end if;
  select case when pin_hash=public.crypt('8642',pin_hash) then '8642' else '9753' end
  into valid_pin from private.admin_operator_credentials;
  select blocked_until into until_time from private.admin_pin_limits;
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
  perform set_config('request.jwt.claims','{"is_anonymous":false}',true);
  r := private.change_admin_pin(valid_pin,'2468');
  if r->>'outcome' <> 'rate_limited' or until_time is distinct from (select blocked_until from private.admin_pin_limits) then
    raise exception 'FALLO: bloqueo con PIN válido o extensión de plazo'; end if;
  update private.admin_pin_limits set blocked_until=now()-interval '1 second', failed_at=array[now()-interval '16 minutes'];
  r := private.change_admin_pin(valid_pin,'2468');
  if r->>'outcome' <> 'ok' then raise exception 'FALLO: expiración de bloqueo'; end if;
  if exists (select 1 from information_schema.columns where table_schema='private' and table_name='admin_pin_events'
    and column_name not in ('id','operator_id','outcome','occurred_at','expires_at')) then
    raise exception 'FALLO: auditoría contiene campos no permitidos'; end if;
end $$;
drop extension dblink;
-- Una avería de auditoría debe revertir también hash, fecha y flag.
begin;
create function private.test_reject_pin_event() returns trigger language plpgsql as $$
begin raise exception using errcode='P0002', message='Fallo sintético de auditoría'; end;
$$;
create trigger test_reject_pin_event before insert on private.admin_pin_events
for each row execute function private.test_reject_pin_event();
do $$
declare before_hash text; before_date timestamptz;
begin
  update public.admin_operators set must_change_pin=true where normalized_name='alejandro';
  select pin_hash,pin_changed_at into before_hash,before_date from private.admin_operator_credentials;
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
  perform set_config('request.jwt.claims','{"is_anonymous":false}',true);
  begin
    perform private.change_admin_pin('2468','9753');
    raise exception 'FALLO: no se simuló fallo de auditoría';
  exception when no_data_found then null;
  end;
  if before_hash is distinct from (select pin_hash from private.admin_operator_credentials)
    or before_date is distinct from (select pin_changed_at from private.admin_operator_credentials)
    or not (select must_change_pin from public.admin_operators where normalized_name='alejandro') then
    raise exception 'FALLO: rotación parcial ante error de auditoría'; end if;
end $$;
rollback;
delete from private.admin_pin_events;
delete from private.admin_pin_limits;
delete from private.admin_operator_credentials;
update public.admin_operators set active=false, auth_user_id=null, must_change_pin=true where normalized_name='alejandro';
do $$
begin
  if exists(select 1 from public.admin_operators where active or auth_user_id is not null or not must_change_pin) then
    raise exception 'FALLO: fixtures activaron operadores permanentemente'; end if;
  if exists (select 1 from historical_checkout h, pg_catalog.pg_proc p
    where p.oid='public.create_delivery_order(jsonb)'::regprocedure
    and (p.proacl is distinct from h.proacl or pg_catalog.pg_get_functiondef(p.oid) <> h.definition))
    or exists(select * from historical_policies except select * from pg_catalog.pg_policies) then
    raise exception 'FALLO: rotación modificó checkout'; end if;
end $$;
\echo 'OK: rotación, permisos, límites y concurrencia.'
