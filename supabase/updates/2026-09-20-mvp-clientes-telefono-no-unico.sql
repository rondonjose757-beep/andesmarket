-- Permite que sesiones anónimas distintas usen el mismo teléfono de contacto.
-- Conserva una sola fila de customers por auth_user_id y no fusiona clientes.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if pg_catalog.to_regclass('public.customers') is null then
    raise exception 'Falta public.customers; aplica primero el esquema inicial.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_info
    join pg_catalog.pg_attribute as column_info
      on column_info.attrelid = constraint_info.conrelid
     and column_info.attnum = constraint_info.conkey[1]
    where constraint_info.conrelid = 'public.customers'::pg_catalog.regclass
      and constraint_info.conname = 'customers_phone_key'
      and constraint_info.contype = 'u'
      and pg_catalog.array_length(constraint_info.conkey, 1) = 1
      and column_info.attname = 'phone'
      and not column_info.attisdropped
  ) then
    raise exception 'No se encontró la constraint UNIQUE esperada customers_phone_key sobre public.customers.phone.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_info
    join pg_catalog.pg_attribute as column_info
      on column_info.attrelid = constraint_info.conrelid
     and column_info.attnum = constraint_info.conkey[1]
    where constraint_info.conrelid = 'public.customers'::pg_catalog.regclass
      and constraint_info.conname = 'customers_auth_user_id_key'
      and constraint_info.contype = 'u'
      and pg_catalog.array_length(constraint_info.conkey, 1) = 1
      and column_info.attname = 'auth_user_id'
      and not column_info.attisdropped
  ) then
    raise exception 'Falta la unicidad esperada de customers.auth_user_id; no se aplicará el cambio.';
  end if;
end $$;

alter table public.customers
  drop constraint customers_phone_key;

comment on column public.customers.phone is
  'Teléfono de contacto; puede repetirse entre clientes de sesiones anónimas distintas.';

commit;
