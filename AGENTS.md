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
- Google Fonts: Plus Jakarta Sans (texto) y Bricolage Grotesque (`font-display`: marca, títulos y precios)
- react-router-dom v7 (`BrowserRouter`)
- Supabase: Postgres + RLS + Auth anónima + Realtime (`@supabase/supabase-js`)
- `vite-plugin-pwa` (instalable, service worker con auto-update)
- Lint: `oxlint`. Pruebas de navegador: `@playwright/test` en `tests/e2e/`.

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
npm run test:e2e  # pruebas de navegador con datos aislados (primero: npx playwright install chromium)
```

## Estructura de `src/`

```
main.jsx                 Monta <App> dentro de BrowserRouter
App.jsx                  Providers (Auth → Toast → Cart) + rutas
index.css                Tokens de marca (@theme) y utilidades globales
layouts/AppLayout.jsx    Header verde (degradado de fondo; buscador y carrito fijos) + <Outlet> + FloatingCart (en /catalogo no usa Header)
pages/
  HomePage.jsx           "/"            Promociones, departamentos, ofertas reales y góndolas por departamento con compra directa
  CatalogPage.jsx        "/catalogo"    Búsqueda + categorías/subcategorías (URL: categoria, subcategoria, q, ofertas=1)
  CartPage.jsx           "/carrito"     Carrito, elegir retiro/delivery, confirmar pedido
  OrdersPage.jsx         "/mis-pedidos" Historial de pedidos del cliente
  ProfilePage.jsx        "/perfil"      Ver/editar nombre, teléfono, dirección
  ConfirmationPage.jsx   "/pedido/:orderId" (fuera del layout) Detalle + estado en vivo por Realtime
components/              Piezas de UI de la tienda (ProductCard, CompactProductCard,
                         CategorySection, CategoryChips, CatalogHeader, SearchBar,
                         CartButton, FloatingCart, PromoCarousel, PromoBanner,
                         ProductDetailModal, ProductImage, CatalogState, CheckoutModal, ProfileForm, Header, InfoBanner,
                         CatalogHero, ProductFan, AndesPattern)
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
  tones.js               Tono visual y frase de cada departamento (categoryLook, productTone)
pwa/PwaInstall.jsx       Registra el service worker e inyecta meta tags iOS
assets/                  Imágenes importadas desde el código
```

Otros archivos: `vite.config.js` (plugins + manifest PWA, `theme_color` #3a9a5c),
`index.html` (fuentes, theme-color #3a9a5c = inicio del degradado verde, `viewport-fit=cover`), `public/icons/` (íconos PWA),
`docs/superpowers/specs/` (specs de diseño de funcionalidades).

## Base de datos (Supabase)

Definida en `supabase/schema.sql` (instalación inicial en SQL Editor). Los cambios
incrementales revisados se guardan en `supabase/updates/`; no se usa un historial
de migraciones de la CLI. No volver a ejecutar el esquema inicial sobre la base existente.

- `categories` (name, sort_order)
- `subcategories` (category_id, name, sort_order): cada una pertenece a una categoría.
  Lectura pública con RLS; edición solo desde Table Editor. La FK compuesta
  garantiza que el producto y su subcategoría tengan la misma categoría.
- `products` (category_id, subcategory_id opcional, name, description, price, image_url, stock,
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
2. `useCatalog` trae productos activos con categoría y subcategoría; respeta
   `sort_order`. Home y Catálogo comparten las fichas verticales: + agrega una
   unidad y −/cantidad/+ modifica el carrito; imagen y nombre abren el detalle.
   El catálogo mantiene los filtros en la URL al recargar y navegar atrás.
3. Agregar al carrito guarda en `CartProvider` (localStorage), no en la DB.
4. En `/carrito` se elige retiro o delivery. Si el cliente no tiene perfil,
   `CheckoutModal` pide nombre y teléfono (`saveProfile`).
5. `submitOrder()` inserta el pedido y sus ítems, vacía el carrito y navega a
   `/pedido/:id`.
6. `ConfirmationPage` escucha `UPDATE` en `orders` por Realtime y muestra el
   estado cuando el admin lo cambia. Requiere que la tabla `orders` esté en la
   publicación `supabase_realtime` (Database → Replication); `schema.sql` no lo hace.

## Convenciones

- **Colores**: usar solo los tokens de `src/index.css` (`brand`, `brand-strong`, `brand-dark`,
  `brand-deep`, `brand-light`, `accent`, `cream`, `ink`, `muted`…) vía clases Tailwind
  (`bg-brand`, `text-ink`). No hardcodear hex en componentes. El texto blanco pequeño
  va sobre `brand-dark` o más oscuro: el menta `brand` no da contraste suficiente.
- **Góndolas**: cada departamento tiene un tono (`.tone-*` en `index.css`, elegido con
  `categoryLook()`/`productTone()` de `lib/tones.js`); dentro se usa `bg-(--tone-shelf)`,
  `bg-(--tone-media)` y `text-(--tone-deep)`. Forma de marca: esquina superior derecha muy
  redondeada con el producto sobresaliendo. Las fotos son PNG transparentes y
  `ProductImage` les añade sombra; no ponerlas sobre fondos blancos recuadrados.
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
- Ocho pruebas de navegador cubren catálogo, compra rápida, subcategorías, filtros,
  detalle accesible, errores, carrito y tamaños móviles. `playwright.config.js`
  usa Supabase ficticio y bloquea escrituras: no se crean pedidos reales.
- El 14-09-2026 se aplicó `supabase/updates/2026-09-14-subcategorias.sql`: 22
  subcategorías y 94 productos clasificados. Para nuevos productos, elegir una
  subcategoría de su misma categoría. Para cambiar la categoría, limpiar primero
  subcategory_id o actualizar ambas columnas juntas. Para borrar una subcategoría,
  desasignar primero sus productos; las FK impiden dejar asociaciones inválidas.
