-- Creación segura y atómica de pedidos delivery.
--
-- IMPORTANTE — orden de despliegue:
--   1. Aplicar primero 2026-09-19-mvp-pedidos-base.sql.
--   2. Construir y probar el frontend que llama create_delivery_order(jsonb),
--      sin publicarlo todavía.
--   3. Pausar temporalmente el checkout durante la publicación coordinada.
--   4. Aplicar esta migración y publicar el frontend ya preparado.
--   5. Verificar un pedido de prueba y reabrir el checkout.
--
-- Esta migración revoca los INSERT directos; el frontend anterior deja de
-- poder confirmar pedidos al aplicarla. La pausa evita una ventana en la que
-- alguna de las dos versiones del frontend quede incompatible con la base.
--
-- No aplicar esta migración de forma aislada mientras producción siga usando
-- los INSERT directos de src/lib/checkout.js.
--
-- La tabla public.order_events todavía no existe. El evento inicial de
-- auditoría se incorporará en la siguiente migración, junto con esa tabla;
-- no se crea aquí para mantener el alcance de esta fase.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if pg_catalog.to_regclass('public.orders') is null
     or pg_catalog.to_regclass('public.order_items') is null
     or pg_catalog.to_regclass('public.customers') is null
     or pg_catalog.to_regclass('public.products') is null
     or pg_catalog.to_regclass('public.delivery_sectors') is null then
    raise exception 'Falta una tabla requerida; aplica primero la migración base del MVP.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_attribute
    where attrelid = 'public.orders'::pg_catalog.regclass
      and attname = 'order_number'
      and not attisdropped
  ) then
    raise exception 'Falta orders.order_number; aplica primero la migración base del MVP.';
  end if;

end $$;

create function public.create_delivery_order(payload jsonb)
returns table (
  id uuid,
  order_number bigint,
  subtotal numeric,
  delivery_fee numeric,
  total numeric,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_customer_id uuid;
  v_customer_name text;
  v_customer_phone text;
  v_sector_id uuid;
  v_sector_name text;
  v_delivery_fee numeric(10, 2);
  v_address text;
  v_instructions text;
  v_google_maps_url text;
  v_items jsonb;
  v_item_count integer;
  v_product_count integer;
  v_inserted_count integer;
  v_order_id uuid;
  v_order_number bigint;
  v_subtotal numeric;
  v_total numeric;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Debes tener una sesión activa para crear el pedido.'
      using errcode = '42501';
  end if;

  if payload is null
     or pg_catalog.jsonb_typeof(payload) is distinct from 'object' then
    raise exception 'El pedido debe enviarse como un objeto JSON.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_object_keys(payload) as supplied(key)
    where supplied.key not in (
      'customer_id',
      'name',
      'phone',
      'sector_id',
      'address',
      'instructions',
      'google_maps_url',
      'items'
    )
  ) then
    raise exception 'El pedido contiene campos no permitidos. No envíes precios, subtotal, delivery ni total.'
      using errcode = '22023';
  end if;

  if not (
    payload ? 'customer_id'
    and payload ? 'name'
    and payload ? 'phone'
    and payload ? 'sector_id'
    and payload ? 'address'
    and payload ? 'items'
  ) then
    raise exception 'Faltan datos obligatorios del pedido.'
      using errcode = '22023';
  end if;

  if pg_catalog.jsonb_typeof(payload -> 'customer_id') is distinct from 'string'
     or pg_catalog.jsonb_typeof(payload -> 'name') is distinct from 'string'
     or pg_catalog.jsonb_typeof(payload -> 'phone') is distinct from 'string'
     or pg_catalog.jsonb_typeof(payload -> 'sector_id') is distinct from 'string'
     or pg_catalog.jsonb_typeof(payload -> 'address') is distinct from 'string'
     or (
       payload ? 'instructions'
       and payload -> 'instructions' <> 'null'::jsonb
       and pg_catalog.jsonb_typeof(payload -> 'instructions') is distinct from 'string'
     )
     or (
       payload ? 'google_maps_url'
       and payload -> 'google_maps_url' <> 'null'::jsonb
       and pg_catalog.jsonb_typeof(payload -> 'google_maps_url') is distinct from 'string'
     ) then
    raise exception 'Los identificadores y textos del pedido tienen tipos inválidos.'
      using errcode = '22023';
  end if;

  if (payload ->> 'customer_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or (payload ->> 'sector_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'customer_id o sector_id no tiene un formato UUID válido.'
      using errcode = '22023';
  end if;

  v_customer_id := (payload ->> 'customer_id')::uuid;
  v_sector_id := (payload ->> 'sector_id')::uuid;
  v_customer_name := pg_catalog.btrim(payload ->> 'name');
  v_customer_phone := pg_catalog.btrim(payload ->> 'phone');
  v_address := pg_catalog.btrim(payload ->> 'address');
  v_instructions := pg_catalog.btrim(payload ->> 'instructions');
  v_items := payload -> 'items';

  if v_instructions = '' then
    v_instructions := null;
  end if;

  if not (payload ? 'google_maps_url')
     or payload -> 'google_maps_url' = 'null'::jsonb then
    v_google_maps_url := null;
  else
    v_google_maps_url := pg_catalog.btrim(payload ->> 'google_maps_url');

    if v_google_maps_url = '' then
      raise exception 'El enlace de Google Maps no puede estar vacío.'
        using errcode = '22023';
    end if;
  end if;

  if pg_catalog.length(v_customer_name) not between 1 and 200 then
    raise exception 'El nombre debe tener entre 1 y 200 caracteres.'
      using errcode = '22023';
  end if;

  if pg_catalog.length(v_customer_phone) not between 1 and 50 then
    raise exception 'El teléfono debe tener entre 1 y 50 caracteres.'
      using errcode = '22023';
  end if;

  if pg_catalog.length(v_address) not between 1 and 500 then
    raise exception 'La dirección debe tener entre 1 y 500 caracteres.'
      using errcode = '22023';
  end if;

  if v_instructions is not null
     and pg_catalog.length(v_instructions) > 500 then
    raise exception 'Las indicaciones no pueden superar 500 caracteres.'
      using errcode = '22023';
  end if;

  if v_google_maps_url is not null
     and (
       pg_catalog.length(v_google_maps_url) > 2048
       or v_google_maps_url !~* '^https://(maps[.]app[.]goo[.]gl([/?#].*)?|goo[.]gl/maps([/?#].*)?|maps[.]google[.]com([/?#].*)?|google[.]com/maps([/?#].*)?|www[.]google[.]com/maps([/?#].*)?)$'
     ) then
    raise exception 'El enlace debe ser una URL HTTPS válida de Google Maps y no superar 2048 caracteres.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.customers as c
    where c.id = v_customer_id
      and c.auth_user_id = v_user_id
  ) then
    raise exception 'El cliente no pertenece a la sesión actual.'
      using errcode = '42501';
  end if;

  select s.name, s.delivery_fee
  into v_sector_name, v_delivery_fee
  from public.delivery_sectors as s
  where s.id = v_sector_id
    and s.active = true
  for key share of s;

  if not found then
    raise exception 'El sector no existe o no está activo.'
      using errcode = '22023';
  end if;

  if pg_catalog.jsonb_typeof(v_items) is distinct from 'array' then
    raise exception 'items debe ser una lista.'
      using errcode = '22023';
  end if;

  v_item_count := pg_catalog.jsonb_array_length(v_items);

  if v_item_count < 1 or v_item_count > 100 then
    raise exception 'El pedido debe contener entre 1 y 100 productos distintos.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(v_items) as requested(item)
    where pg_catalog.jsonb_typeof(requested.item) is distinct from 'object'
  ) then
    raise exception 'Cada elemento de items debe ser un objeto JSON.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(v_items) as requested(item)
    where exists (
         select 1
         from pg_catalog.jsonb_object_keys(requested.item) as item_key(key)
         where item_key.key not in ('product_id', 'quantity')
       )
       or not (requested.item ? 'product_id' and requested.item ? 'quantity')
       or pg_catalog.jsonb_typeof(requested.item -> 'product_id') is distinct from 'string'
       or pg_catalog.jsonb_typeof(requested.item -> 'quantity') is distinct from 'number'
       or (requested.item ->> 'product_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or (requested.item ->> 'quantity') !~ '^[1-9][0-9]*$'
  ) then
    raise exception 'Cada ítem debe contener únicamente product_id UUID y quantity entera positiva.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(v_items) as requested(item)
    where pg_catalog.length(requested.item ->> 'quantity') > 2
       or (requested.item ->> 'quantity')::integer > 99
  ) then
    raise exception 'La cantidad de cada producto debe estar entre 1 y 99.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(v_items) as requested(item)
    group by requested.item ->> 'product_id'
    having pg_catalog.count(*) > 1
  ) then
    raise exception 'El pedido contiene productos duplicados.'
      using errcode = '22023';
  end if;

  -- Bloquea las filas de catálogo durante el cálculo y la copia de snapshots,
  -- evitando que precio, descuento o actividad cambien a mitad del pedido.
  perform 1
  from public.products as p
  join pg_catalog.jsonb_array_elements(v_items) as requested(item)
    on p.id = (requested.item ->> 'product_id')::uuid
  for key share of p;

  select pg_catalog.count(*)::integer
  into v_product_count
  from public.products as p
  join pg_catalog.jsonb_array_elements(v_items) as requested(item)
    on p.id = (requested.item ->> 'product_id')::uuid
  where p.active = true;

  if v_product_count <> v_item_count then
    raise exception 'Uno o más productos no existen o no están activos.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.products as p
    join pg_catalog.jsonb_array_elements(v_items) as requested(item)
      on p.id = (requested.item ->> 'product_id')::uuid
    cross join lateral (
      select case
        when raw.raw_price < 0 then 0::numeric
        else pg_catalog.round(raw.raw_price, 2)
      end as effective_price
      from lateral (
        select case
          when p.discount_type = 'porcentaje' and p.discount_value is not null
            then p.price * (1 - p.discount_value / 100)
          when p.discount_type = 'monto' and p.discount_value is not null
            then p.price - p.discount_value
          else p.price
        end as raw_price
      ) as raw
    ) as calculated
    where calculated.effective_price > 99999999.99
       or pg_catalog.round(
         calculated.effective_price * (requested.item ->> 'quantity')::integer,
         2
       ) > 9999999999.99
  ) then
    raise exception 'El precio efectivo o total de una línea excede los límites admitidos.'
      using errcode = '22003';
  end if;

  insert into public.orders as new_order (
    customer_id,
    order_type,
    address,
    status,
    customer_name,
    customer_phone,
    sector_id,
    sector_name,
    delivery_fee,
    delivery_instructions,
    google_maps_url,
    payment_status,
    cash_handover_status,
    version,
    status_updated_at
  )
  values (
    v_customer_id,
    'delivery',
    v_address,
    'nuevo',
    v_customer_name,
    v_customer_phone,
    v_sector_id,
    v_sector_name,
    v_delivery_fee,
    v_instructions,
    v_google_maps_url,
    'pendiente',
    'no_aplica',
    1,
    pg_catalog.now()
  )
  returning new_order.id, new_order.order_number
  into v_order_id, v_order_number;

  insert into public.order_items (
    order_id,
    product_id,
    product_name,
    quantity,
    unit_price
  )
  select
    v_order_id,
    p.id,
    p.name,
    (requested.item ->> 'quantity')::integer,
    calculated.effective_price
  from pg_catalog.jsonb_array_elements(v_items) as requested(item)
  join public.products as p
    on p.id = (requested.item ->> 'product_id')::uuid
   and p.active = true
  cross join lateral (
    select case
      when raw.raw_price < 0 then 0::numeric
      else pg_catalog.round(raw.raw_price, 2)
    end as effective_price
    from lateral (
      select case
        when p.discount_type = 'porcentaje' and p.discount_value is not null
          then p.price * (1 - p.discount_value / 100)
        when p.discount_type = 'monto' and p.discount_value is not null
          then p.price - p.discount_value
        else p.price
      end as raw_price
    ) as raw
  ) as calculated;

  get diagnostics v_inserted_count = row_count;

  if v_inserted_count <> v_item_count then
    raise exception 'No se pudieron guardar todos los productos del pedido.';
  end if;

  select pg_catalog.sum(oi.line_total)
  into v_subtotal
  from public.order_items as oi
  where oi.order_id = v_order_id;

  if v_subtotal is null or v_subtotal > 9999999999.99 then
    raise exception 'El subtotal calculado excede los límites admitidos.'
      using errcode = '22003';
  end if;

  v_total := v_subtotal + v_delivery_fee;

  if v_total > 9999999999.99 then
    raise exception 'El total calculado excede los límites admitidos.'
      using errcode = '22003';
  end if;

  update public.orders as saved_order
  set
    subtotal = v_subtotal,
    total = v_total
  where saved_order.id = v_order_id;

  return query
  select
    v_order_id,
    v_order_number,
    v_subtotal,
    v_delivery_fee,
    v_total,
    'nuevo'::text;
end;
$$;

comment on function public.create_delivery_order(jsonb) is
  'Crea atómicamente un pedido delivery para el customer de auth.uid(); calcula precios e importes desde datos confiables.';

revoke all on function public.create_delivery_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_delivery_order(jsonb) to authenticated;

-- Las sesiones anónimas de Supabase Auth usan el rol authenticated. El rol
-- anon representa solicitudes sin sesión y no puede ejecutar la función.
-- La lectura RLS existente de pedidos propios permanece intacta.
revoke insert on table public.orders from anon, authenticated;
revoke insert on table public.order_items from anon, authenticated;
revoke usage on sequence public.orders_order_number_seq from anon, authenticated;

notify pgrst, 'reload schema';
commit;
