-- Fundación de datos para el MVP operativo de AndesMarket.
--
-- Aplicar una sola vez sobre el proyecto existente, después de respaldar y
-- revisar los datos. Esta migración es aditiva: conserva pedidos históricos,
-- incluidos los de tipo `retiro` y los que tengan estado `listo`.
--
-- La futura RPC de creación atómica será la encargada de:
--   - aceptar únicamente pedidos nuevos con order_type = 'delivery';
--   - exigir sector, dirección, snapshots e importes completos;
--   - aceptar únicamente los estados nuevos del flujo operativo;
--   - calcular precios, subtotal, delivery y total en el servidor.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- ─── Prevalidaciones del esquema y los datos existentes ─────────────────

do $$
begin
  if to_regclass('public.orders') is null then
    raise exception 'No existe public.orders; aplica primero el esquema inicial de AndesMarket.';
  end if;

  if to_regclass('public.order_items') is null then
    raise exception 'No existe public.order_items; aplica primero el esquema inicial de AndesMarket.';
  end if;

  if to_regclass('public.customers') is null then
    raise exception 'No existe public.customers; aplica primero el esquema inicial de AndesMarket.';
  end if;

  if exists (
    select 1
    from public.orders
    where order_type is null
       or order_type not in ('retiro', 'delivery')
  ) then
    raise exception 'Existen pedidos con order_type incompatible; se esperaban solo retiro o delivery.';
  end if;

  if exists (
    select 1
    from public.orders
    where status is null
       or status not in (
         'nuevo',
         'confirmado',
         'preparando',
         'listo',
         'enviado',
         'entregado',
         'cancelado'
       )
  ) then
    raise exception 'Existen pedidos con un estado desconocido; revisa esos datos antes de aplicar la migración.';
  end if;

  if exists (
    select 1
    from public.orders o
    left join public.customers c on c.id = o.customer_id
    where c.id is null
       or c.name is null
       or c.phone is null
  ) then
    raise exception 'Existen pedidos sin un cliente válido, nombre o teléfono; no se pueden crear snapshots confiables.';
  end if;

  if exists (
    select 1
    from public.order_items
    where quantity is null
       or quantity <= 0
       or unit_price is null
       or unit_price < 0
       or round(unit_price * quantity, 2) > 9999999999.99
  ) then
    raise exception 'Existen ítems con cantidad, precio o total de línea incompatible con numeric(12,2); corrígelos antes de aplicar la migración.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_status_check'
      and contype = 'c'
  ) then
    raise exception 'No existe el constraint esperado orders_status_check; revisa el esquema real antes de ampliar los estados.';
  end if;
end $$;

-- ─── Sectores de delivery ───────────────────────────────────────────────

create table public.delivery_sectors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  delivery_fee numeric(10, 2) not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_sectors_name_not_blank
    check (length(trim(name)) between 1 and 100),
  constraint delivery_sectors_fee_nonnegative
    check (delivery_fee >= 0),
  constraint delivery_sectors_sort_order_nonnegative
    check (sort_order >= 0)
);

create unique index delivery_sectors_name_unique_idx
  on public.delivery_sectors (lower(trim(name)));

create index delivery_sectors_active_sort_idx
  on public.delivery_sectors (active, sort_order, name);

comment on table public.delivery_sectors is
  'Sectores habilitados para nuevos pedidos delivery y su tarifa vigente.';

alter table public.delivery_sectors enable row level security;

create policy "active delivery sectors are publicly readable"
  on public.delivery_sectors
  for select
  to anon, authenticated
  using (active = true);

revoke all on public.delivery_sectors from public, anon, authenticated;
grant select on public.delivery_sectors to anon, authenticated;
grant all on public.delivery_sectors to service_role;

insert into public.delivery_sectors (name, delivery_fee, sort_order)
values
  ('La Pedregosa', 1.00, 1),
  ('Belenzate', 2.00, 2),
  ('Campo Claro', 3.00, 3)
on conflict do nothing;

-- ─── Numeración y snapshots del pedido ─────────────────────────────────

create sequence public.orders_order_number_seq as bigint;

alter table public.orders
  add column order_number bigint,
  add column customer_name text,
  add column customer_phone text,
  add column sector_id uuid references public.delivery_sectors(id) on delete restrict,
  add column sector_name text,
  add column delivery_fee numeric(10, 2),
  add column delivery_instructions text,
  add column google_maps_url text,
  add column subtotal numeric(12, 2),
  add column total numeric(12, 2),
  add column payment_method text,
  add column payment_status text not null default 'pendiente',
  add column cash_handover_status text not null default 'no_aplica',
  add column version integer not null default 1,
  add column updated_at timestamptz not null default now(),
  add column status_updated_at timestamptz,
  add column status_updated_by uuid references auth.users(id) on delete set null,
  add column payment_updated_at timestamptz,
  add column payment_updated_by uuid references auth.users(id) on delete set null,
  add column delivered_at timestamptz,
  add column delivered_by uuid references auth.users(id) on delete set null,
  add column cancellation_reason text,
  add column cancellation_note text,
  add column cancelled_at timestamptz,
  add column cancelled_by uuid references auth.users(id) on delete set null,
  add column speedy_requested_at timestamptz,
  add column speedy_requested_by uuid references auth.users(id) on delete set null,
  add column cash_received_at timestamptz,
  add column cash_received_by uuid references auth.users(id) on delete set null,
  add column last_modified_by uuid references auth.users(id) on delete set null;

alter sequence public.orders_order_number_seq
  owned by public.orders.order_number;

grant usage on sequence public.orders_order_number_seq to authenticated, service_role;

alter table public.orders
  alter column order_number
  set default nextval('public.orders_order_number_seq'::regclass);

-- Los históricos reciben solo número visible y snapshots disponibles. No se
-- inventan sector, tarifa, importes, datos de pago ni fechas operativas.
update public.orders o
set
  order_number = nextval('public.orders_order_number_seq'::regclass),
  customer_name = c.name,
  customer_phone = c.phone,
  updated_at = coalesce(o.created_at, now())
from public.customers c
where c.id = o.customer_id;

alter table public.orders
  alter column order_number set not null,
  add constraint orders_order_number_unique unique (order_number),
  add constraint orders_order_number_positive check (order_number > 0),
  add constraint orders_customer_name_not_blank
    check (length(trim(customer_name)) between 1 and 200) not valid,
  add constraint orders_customer_phone_not_blank
    check (length(trim(customer_phone)) between 1 and 50) not valid,
  add constraint orders_sector_name_not_blank
    check (sector_name is null or length(trim(sector_name)) between 1 and 100),
  add constraint orders_delivery_fee_nonnegative
    check (delivery_fee is null or delivery_fee >= 0),
  add constraint orders_delivery_instructions_length
    check (delivery_instructions is null or length(delivery_instructions) <= 500),
  add constraint orders_google_maps_url_length
    check (google_maps_url is null or length(google_maps_url) <= 2048),
  add constraint orders_subtotal_nonnegative
    check (subtotal is null or subtotal >= 0),
  add constraint orders_total_nonnegative
    check (total is null or total >= 0),
  add constraint orders_total_matches_components
    check (
      total is null
      or subtotal is null
      or delivery_fee is null
      or total = subtotal + delivery_fee
    ),
  add constraint orders_payment_method_allowed
    check (payment_method is null or payment_method in ('pago_movil', 'binance', 'efectivo')),
  add constraint orders_payment_status_allowed
    check (payment_status in ('pendiente', 'confirmado', 'rechazado')),
  add constraint orders_cash_handover_status_allowed
    check (cash_handover_status in ('no_aplica', 'pendiente_speedy', 'recibido')),
  add constraint orders_cash_handover_matches_method
    check (
      (payment_method = 'efectivo' and cash_handover_status in ('pendiente_speedy', 'recibido'))
      or (payment_method is distinct from 'efectivo' and cash_handover_status = 'no_aplica')
    ),
  add constraint orders_version_positive check (version > 0),
  add constraint orders_cancellation_reason_allowed
    check (
      cancellation_reason is null
      or cancellation_reason in (
        'cliente_cancelo',
        'producto_no_disponible',
        'pago_no_confirmado',
        'problema_delivery',
        'otro'
      )
    ),
  add constraint orders_cancellation_note_length
    check (cancellation_note is null or length(cancellation_note) <= 500),
  add constraint orders_other_cancellation_has_note
    check (
      cancellation_reason <> 'otro'
      or length(trim(cancellation_note)) between 1 and 500
    );

-- Se amplía el check existente sin modificar los valores almacenados.
-- `retiro` sigue siendo válido para históricos; la futura RPC rechazará su
-- uso en pedidos nuevos. `listo` también se conserva como estado histórico.
alter table public.orders
  drop constraint orders_status_check,
  add constraint orders_status_check
    check (
      status in (
        'nuevo',
        'confirmado',
        'preparando',
        'listo',
        'enviado',
        'entregado',
        'cancelado'
      )
    ),
  alter column status set default 'nuevo';

comment on column public.orders.order_number is
  'Número secuencial mostrado como AM-xxxxx; el prefijo y padding se formatean al leer.';
comment on column public.orders.customer_name is
  'Snapshot del cliente. Puede ser nulo temporalmente para mantener compatible el frontend anterior a la RPC.';
comment on column public.orders.customer_phone is
  'Snapshot del cliente. Puede ser nulo temporalmente para mantener compatible el frontend anterior a la RPC.';
comment on column public.orders.order_type is
  'Conserva retiro en históricos. La futura RPC solo permitirá delivery para pedidos nuevos.';
comment on column public.orders.status is
  'Incluye listo por compatibilidad histórica; la futura RPC no lo asignará a pedidos nuevos.';
comment on column public.orders.address is
  'Dirección de entrega; puede ser nula únicamente en pedidos históricos.';

create index orders_status_created_at_idx
  on public.orders (status, created_at desc);

create index orders_delivered_at_idx
  on public.orders (delivered_at desc)
  where status = 'entregado';

create index orders_sector_id_idx
  on public.orders (sector_id)
  where sector_id is not null;

create index orders_customer_phone_idx
  on public.orders (customer_phone);

create index orders_payment_idx
  on public.orders (payment_method, payment_status);

create index orders_cash_pending_idx
  on public.orders (cash_handover_status, created_at desc)
  where payment_method = 'efectivo';

create index orders_speedy_requested_at_idx
  on public.orders (speedy_requested_at desc)
  where speedy_requested_at is not null;

-- ─── Ítems y totales de línea ──────────────────────────────────────────

alter table public.order_items
  add column line_total numeric(12, 2)
    generated always as (round(unit_price * quantity, 2)) stored;

alter table public.order_items
  add constraint order_items_line_total_nonnegative
    check (line_total >= 0);

create index order_items_order_id_idx
  on public.order_items (order_id);

create index order_items_product_id_idx
  on public.order_items (product_id)
  where product_id is not null;

-- ─── updated_at automático ─────────────────────────────────────────────

create function public.set_mvp_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_mvp_updated_at() from public, anon, authenticated;
grant execute on function public.set_mvp_updated_at() to service_role;

create trigger delivery_sectors_set_updated_at
before update on public.delivery_sectors
for each row execute function public.set_mvp_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_mvp_updated_at();

notify pgrst, 'reload schema';
commit;
