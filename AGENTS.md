# AGENTS.md — AndesMarket

Guía de contexto para cualquier agente de IA (Codex, Claude Code, Cursor, Copilot…)
o persona que trabaje en este repo. Léela completa antes de hacer cambios.
Si cambias algo que contradiga este archivo, actualízalo en el mismo commit.

## Qué es

Tienda online (PWA) del minimarket **AndesMarket**, un solo local. El cliente
navega el catálogo, arma un carrito y hace un pedido con **retiro en tienda** o
**delivery**. No hay pagos en línea ni panel de administración: los productos y
el estado de los pedidos se gestionan desde el Table Editor de Supabase.

Toda la UI, textos, rutas y mensajes de commit están en **español**.

## Stack

- React 19 + Vite 8 (JavaScript/JSX, sin TypeScript)
- Tailwind CSS v4 (plugin `@tailwindcss/vite`, tokens en `src/index.css`)
- react-router-dom v7 (`BrowserRouter`)
- Supabase: Postgres + RLS + Auth anónima + Realtime (`@supabase/supabase-js`)
- `vite-plugin-pwa` (instalable, service worker con auto-update)
- Lint: `oxlint`. No hay tests automatizados todavía.

## Cómo está conectado todo

```
 Tu computadora ──git push──▶ GitHub ──build──▶ Vercel ──(navegador)──▶ Supabase
 (npm run dev)                 repo              hosting estático         DB + Auth + Realtime
```

| Servicio | Qué hace | Dónde |
|---|---|---|
| **GitHub** | Código fuente | `https://github.com/rondonjose757-beep/andesmarket` (rama `main`) |
| **Vercel** | Compila (`npm run build` → `dist/`) y sirve el sitio | Proyecto `andesmarket`. `vercel.json` reescribe todas las rutas a `index.html` para que React Router funcione al recargar |
| **Supabase** | Base de datos, login anónimo, actualizaciones en vivo | Proyecto ref `ywtusdrduxsxwjeghrpu`. Esquema en `supabase/schema.sql` |

- La app es 100 % frontend: **no hay backend propio ni funciones serverless**.
  El navegador habla directo con Supabase usando la anon key; la seguridad la
  imponen las políticas **RLS** de Postgres.
- Verificar en Vercel (Settings → Git) si el deploy es automático al hacer push a
  `main`. Si no está conectado, se despliega con la CLI: `vercel --prod`.

### Variables de entorno

| Variable | Uso |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave pública (anon) de Supabase |

- Local: en `.env` (plantilla en `.env.example`). Vercel: Settings → Environment Variables.
- Vite las incrusta en el build, así que **cambiarlas en Vercel requiere redeploy**.
- `src/lib/supabaseClient.js` lanza un error si faltan.
- **Nunca** subir `.env`, `.env.local`, `.vercel/` ni la `service_role` key.
  `.gitignore` ya los excluye; no lo debilites.

## Comandos

```bash
npm install
npm run dev       # servidor local (Vite). La PWA también se activa en dev
npm run build     # build de producción a dist/
npm run preview   # sirve dist/ localmente
npm run lint      # oxlint
```

## Estructura de `src/`

```
main.jsx                 Monta <App> dentro de BrowserRouter
App.jsx                  Providers (Auth → Toast → Cart) + rutas
index.css                Tokens de marca (@theme) y utilidades globales
layouts/AppLayout.jsx    Header + <Outlet> + FloatingCart (en /catalogo no usa Header)
pages/
  HomePage.jsx           "/"            Carrusel promo, chips de categoría, Destacados y secciones horizontales por categoría
  CatalogPage.jsx        "/catalogo"    Búsqueda + filtro por categoría (acepta ?categoria=<id>&q=<texto>)
  CartPage.jsx           "/carrito"     Carrito, elegir retiro/delivery, confirmar pedido
  OrdersPage.jsx         "/mis-pedidos" Historial de pedidos del cliente
  ProfilePage.jsx        "/perfil"      Ver/editar nombre, teléfono, dirección
  ConfirmationPage.jsx   "/pedido/:orderId" (fuera del layout) Detalle + estado en vivo por Realtime
components/              Piezas de UI de la tienda (ProductCard, CompactProductCard,
                         CategorySection, CategoryChips, CatalogHeader, SearchBar,
                         CartButton, FloatingCart, PromoCarousel, PromoBanner,
                         ProductDetailModal, CheckoutModal, ProfileForm, Header, InfoBanner)
shared/components/       Primitivas genéricas: ui.jsx (Button, Card, Badge, Field…), Modal, Toast
state/
  AuthProvider.jsx       Sesión anónima de Supabase + perfil `customers` (useAuth)
  CartProvider.jsx       Carrito en localStorage "andesmarket.cart.v1" (useCart)
hooks/useCatalog.js      Carga productos activos con su categoría
lib/
  supabaseClient.js      Cliente único de Supabase
  checkout.js            submitOrder(): inserta orders + order_items
  orderStatus.js         Estados de pedido y sus etiquetas
  format.js              Formato de precios y fechas
pwa/PwaInstall.jsx       Registra el service worker e inyecta meta tags iOS
assets/                  Imágenes importadas desde el código
```

Otros archivos: `vite.config.js` (plugins + manifest PWA, `theme_color` #52c979),
`index.html` (fuente Plus Jakarta Sans, theme-color), `public/icons/` (íconos PWA),
`docs/superpowers/specs/` (specs de diseño de funcionalidades).

## Base de datos (Supabase)

Definida en `supabase/schema.sql` (se pega en el SQL Editor; no hay migraciones).

- `categories` (name, sort_order)
- `products` (category_id, name, description, price, image_url, stock,
  discount_type `'porcentaje'|'monto'`, discount_value, active)
- `customers` (auth_user_id → auth.users, name, phone **único**, address, profile_completed)
- `orders` (customer_id, order_type `'retiro'|'delivery'`, address,
  status `'confirmado'|'preparando'|'listo'|'entregado'|'cancelado'`)
- `order_items` (order_id, product_id, product_name, quantity, unit_price) —
  nombre y precio se copian al momento del pedido

RLS: catálogo de lectura pública (solo `active = true`); cada sesión solo ve y crea
su propio `customers`, `orders` y `order_items`. Nadie puede actualizar pedidos
desde la app: el admin cambia `status` desde el dashboard (bypassa RLS).

Si cambias el esquema: actualiza `supabase/schema.sql`, aplica el SQL en Supabase
y ajusta las políticas RLS. Nunca desactives RLS para "arreglar" un error de permisos.

## Flujo principal

1. Al abrir la app, `AuthProvider` recupera la sesión o llama a
   `signInAnonymously()` (debe estar activado en Supabase → Auth → Providers).
   Luego busca el `customers` de ese usuario.
2. `useCatalog` trae productos activos; Home y Catálogo los muestran.
3. Agregar al carrito guarda en `CartProvider` (localStorage), no en la DB.
4. En `/carrito` se elige retiro o delivery. Si el cliente no tiene perfil,
   `CheckoutModal` pide nombre y teléfono (`saveProfile`).
5. `submitOrder()` inserta el pedido y sus ítems, vacía el carrito y navega a
   `/pedido/:id`.
6. `ConfirmationPage` escucha `UPDATE` en `orders` por Realtime y muestra el
   estado cuando el admin lo cambia. Requiere que la tabla `orders` esté en la
   publicación `supabase_realtime` (Database → Replication); `schema.sql` no lo hace.

## Convenciones

- **Colores**: usar solo los tokens de `src/index.css` (`brand`, `brand-dark`,
  `brand-light`, `accent`, `cream`, `ink`, `muted`…) vía clases Tailwind
  (`bg-brand`, `text-ink`). No hardcodear hex en componentes.
- Diseño mobile-first (es una PWA pensada para celular).
- Componentes funcionales, un componente por archivo, `export default`.
  Hooks/contextos con export nombrado (`useAuth`, `useCart`).
- Toda llamada a Supabase maneja `error` y muestra un mensaje en español al usuario.
- Reutilizar `shared/components/ui.jsx` antes de crear botones/tarjetas nuevas.
- Mensajes de commit en español, en imperativo ("Agrega…", "Ajusta…").

## Pendientes conocidos

- Logo real en `Header.jsx` e íconos definitivos en `public/icons/`.
- No hay panel de administración, pagos en línea, variantes de producto ni
  control de stock al confirmar pedidos.
- No hay tests automatizados.
