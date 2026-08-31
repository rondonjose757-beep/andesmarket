-- AndesMarket — esquema inicial de Supabase
-- Pega este archivo completo en el SQL Editor de tu proyecto Supabase y ejecútalo.

create extension if not exists "pgcrypto";

-- ─── Catálogo ────────────────────────────────────────────────────────────

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  stock int not null default 0,
  discount_type text check (discount_type in ('porcentaje', 'monto')),
  discount_value numeric(10, 2),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── Clientes (autenticación anónima) ───────────────────────────────────
-- Cada visitante recibe una sesión anónima de Supabase Auth (ver
-- src/state/AuthProvider.jsx) y completa este perfil antes de su primer pedido.

create table customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  phone text not null unique,
  address text,
  profile_completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── Pedidos ─────────────────────────────────────────────────────────────

create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  order_type text not null check (order_type in ('retiro', 'delivery')),
  address text,
  status text not null default 'confirmado'
    check (status in ('confirmado', 'preparando', 'listo', 'entregado', 'cancelado')),
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

-- ─── Row Level Security ──────────────────────────────────────────────────

alter table categories enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Catálogo: lectura pública (clientes anónimos incluidos).
create policy "categories are publicly readable" on categories
  for select using (true);

create policy "active products are publicly readable" on products
  for select using (active = true);

-- Clientes: cada sesión solo ve/edita su propio perfil.
create policy "customers can view own profile" on customers
  for select using (auth.uid() = auth_user_id);

create policy "customers can create own profile" on customers
  for insert with check (auth.uid() = auth_user_id);

create policy "customers can update own profile" on customers
  for update using (auth.uid() = auth_user_id);

-- Pedidos: cada sesión solo ve/crea pedidos de su propio perfil de cliente.
create policy "customers can view own orders" on orders
  for select using (
    customer_id in (select id from customers where auth_user_id = auth.uid())
  );

create policy "customers can create own orders" on orders
  for insert with check (
    customer_id in (select id from customers where auth_user_id = auth.uid())
  );

create policy "customers can view own order items" on order_items
  for select using (
    order_id in (
      select o.id from orders o
      join customers c on c.id = o.customer_id
      where c.auth_user_id = auth.uid()
    )
  );

create policy "customers can create own order items" on order_items
  for insert with check (
    order_id in (
      select o.id from orders o
      join customers c on c.id = o.customer_id
      where c.auth_user_id = auth.uid()
    )
  );

-- Nota: actualizar el status de un pedido (confirmado → preparando → listo →
-- entregado) o administrar productos/categorías se hace por ahora desde el
-- Table Editor de Supabase con tu usuario admin (bypassa RLS). Cuando
-- necesites un panel de administración, lo agregamos como una segunda app,
-- igual que "app-restaurante" en Contenedores.

-- ─── Datos de ejemplo (opcional, bórralos cuando cargues tu catálogo real) ─

insert into categories (name, sort_order) values
  ('Abarrotes', 1),
  ('Bebidas', 2),
  ('Lácteos', 3),
  ('Snacks', 4);
