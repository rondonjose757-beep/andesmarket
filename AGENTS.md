# AGENTS.md — AndesMarket

Guía de contexto para cualquier agente de IA (Codex, Claude Code, Cursor, Copilot…)
o persona que trabaje en este repo. Léela completa antes de hacer cambios.
Si cambias algo que contradiga este archivo, actualízalo en el mismo commit.

## Qué es

Tienda online (PWA) del minimarket **AndesMarket**, un solo local. El cliente
navega el catálogo, arma un carrito y hace un pedido exclusivamente por
**delivery**. No hay pagos en línea ni panel de administración todavía: los
productos y el estado de los pedidos se gestionan desde el Table Editor de
Supabase mientras se construye el dashboard del MVP.

Toda la UI, textos, rutas y mensajes de commit están en **español**.

## Stack

- React 19 + Vite 8 (JavaScript/JSX, sin TypeScript)
- Tailwind CSS v4 (plugin `@tailwindcss/vite`, tokens en `src/index.css`)
- Google Fonts: Plus Jakarta Sans (texto) y Bricolage Grotesque (`font-display`: marca, títulos y precios)
- react-router-dom v7 (`BrowserRouter`)
- Supabase: Postgres + RLS + Auth anónima (`@supabase/supabase-js`)
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
npm run test:unit # pruebas unitarias con node:test
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
  CatalogPage.jsx        "/catalogo"    Categorías/subcategorías; recibe búsquedas desde Inicio (URL: categoria, subcategoria, q, ofertas=1)
  CartPage.jsx           "/carrito"     Carrito, datos de delivery y confirmación del pedido
  OrdersPage.jsx                        Historial conservado sin ruta pública por el momento
  ProfilePage.jsx                       Perfil conservado sin ruta pública por el momento
  PrivacyPage.jsx        "/privacidad"  Política de privacidad y datos de contacto
  ConfirmationPage.jsx   "/pedido/:orderId" (fuera del layout) Recibo estático del pedido
components/              Piezas de UI de la tienda (BrandLogo, ProductCard, CompactProductCard,
                         CategorySection, CategoryChips, CatalogHeader, SearchBar,
                         CartButton, FloatingCart, PromoCarousel, PromoBanner,
  ProductDetailModal, ProductImage, CatalogState, CheckoutModal, ProfileForm, ContactMenu, Header, Footer, InfoBanner,
                         CatalogHero, ProductFan, AndesPattern)
shared/components/       Primitivas genéricas: ui.jsx (Button, Card, Badge, Field…), Modal, Toast
state/
  AuthProvider.jsx       Sesión anónima técnica de Supabase + datos internos `customers` (useAuth)
  CartProvider.jsx       Carrito en localStorage "andesmarket.cart.v1" (useCart)
hooks/
  useCatalog.js          Carga productos activos con su categoría
  useDeliverySectors.js  Carga sectores activos y sus tarifas
lib/
  supabaseClient.js      Cliente único de Supabase
  checkout.js            submitOrder(): llama la RPC atómica create_delivery_order
  orderStatus.js         Estados de pedido y sus etiquetas
  format.js              Formato de precios y fechas
  tones.js               Tono visual y frase de cada departamento (categoryLook, productTone)
  productImageUrl.js     Genera variantes 256/512 px mediante Supabase Image Transformations
pwa/PwaInstall.jsx       Registra el service worker e inyecta meta tags iOS
assets/                  Imágenes importadas desde el código
```

Otros archivos: `vite.config.js` (plugins + manifest PWA, `theme_color` #3a9a5c),
`index.html` (fuentes, theme-color #3a9a5c = inicio del degradado verde, `viewport-fit=cover`), `public/icons/` (íconos PWA),
`docs/superpowers/specs/` (specs de diseño de funcionalidades).

## Base de datos (Supabase)

La base histórica está definida en `supabase/schema.sql` (solo instalación
inicial). Los cambios incrementales revisados se guardan en `supabase/updates/`;
no se usa un historial de migraciones de la CLI. No volver a ejecutar el esquema
inicial sobre la base existente. Para reproducir el estado vigente, se instala el
esquema inicial y luego se aplican los archivos de `updates/` en orden.

- `categories` (name, sort_order)
- `subcategories` (category_id, name, sort_order): cada una pertenece a una categoría.
  Lectura pública con RLS; edición solo desde Table Editor. La FK compuesta
  garantiza que el producto y su subcategoría tengan la misma categoría.
- `products` (category_id, subcategory_id opcional, name, description, price, image_url, stock,
  discount_type `'porcentaje'|'monto'`, discount_value, active)
- `customers` (auth_user_id → auth.users, name, phone **único**, address, profile_completed)
- `delivery_sectors` (name, delivery_fee, active, sort_order)
- `orders`: conserva `retiro` y `listo` solo por compatibilidad histórica; los
  pedidos nuevos son delivery, comienzan en `nuevo` y guardan número visible,
  snapshots del cliente/sector, importes, pago y campos operativos.
- `order_items` (order_id, product_id, product_name, quantity, unit_price,
  line_total) — nombre y precio se copian al momento del pedido.

RLS: catálogo y sectores activos de lectura pública; cada sesión solo ve su
perfil, pedidos e ítems. Los inserts directos de pedidos e ítems están revocados:
`create_delivery_order(jsonb)` valida propiedad, productos y sector, recalcula
precios y crea el pedido completo en una transacción.

Si cambias el esquema vigente: añade un SQL incremental en `supabase/updates/`,
actualiza las pruebas de `supabase/tests/` y ajusta las políticas RLS. Nunca
desactives RLS para "arreglar" un error de permisos.

## Flujo principal

1. Al abrir la app, `AuthProvider` recupera la sesión o llama a
   `signInAnonymously()` (debe estar activado en Supabase → Auth → Providers).
   Luego busca el `customers` de ese usuario.
2. `useCatalog` trae productos activos con categoría y subcategoría; respeta
   `sort_order`. Home y Catálogo comparten las fichas verticales: + agrega una
   unidad y −/cantidad/+ modifica el carrito; imagen y nombre abren el detalle.
   El catálogo mantiene los filtros en la URL al recargar y navegar atrás.
3. Agregar al carrito guarda en `CartProvider` (localStorage), no en la DB.
4. En `/carrito` se eligen sector y dirección; indicaciones y enlace de Google
   Maps son opcionales. Si aún no hay datos del cliente, `CheckoutModal` pide
   nombre y teléfono (`saveProfile` internamente).
5. `submitOrder()` envía solo ids, cantidades y datos de entrega a
   `create_delivery_order(jsonb)`. La RPC relee precios y tarifas, calcula los
   importes y guarda pedido e ítems atómicamente.
6. Tras el éxito se vacía el carrito y se navega a `/pedido/:id`, que muestra un
   recibo estático con número `AM-xxxxx`. El estado operativo no se expone al
   cliente y esta pantalla no usa Realtime.

No hay interfaz pública de perfil ni historial de pedidos por el momento. La sesión
anónima permanece como detalle técnico necesario para aplicar RLS; el usuario no
inicia sesión ni administra una cuenta. La cabecera ofrece contacto por WhatsApp,
teléfono e Instagram mediante `ContactMenu`.

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
  `ProductImage` solicita variantes WebP de 256/512 px mediante `/storage/v1/render/image/`
  y vuelve al archivo original si la transformación falla.
- Diseño mobile-first (es una PWA pensada para celular).
- Componentes funcionales, un componente por archivo, `export default`.
  Hooks/contextos con export nombrado (`useAuth`, `useCart`).
- Toda llamada a Supabase maneja `error` y muestra un mensaje en español al usuario.
- Reutilizar `shared/components/ui.jsx` antes de crear botones/tarjetas nuevas.
- Mensajes de commit en español, en imperativo ("Agrega…", "Ajusta…").

## Pendientes conocidos

- Logo aprobado (carrito con montaña) en `src/assets/andesmarket-logo.png`, compartido
  por `Header.jsx` y `CatalogHeader.jsx` mediante `BrandLogo.jsx`. Se muestra sobre
  fondo claro y se encuadran sus márgenes transparentes sin modificar la imagen.
  Siguen pendientes los íconos definitivos en `public/icons/`.
- No hay panel de administración, pagos en línea, variantes de producto ni
  control de stock al confirmar pedidos.
- Veinte pruebas de navegador, dos unitarias y el arnés SQL de
  `supabase/tests/` cubren catálogo, checkout delivery, creación atómica, RLS,
  recibo y regresiones visuales. Playwright usa Supabase ficticio y no crea
  pedidos reales; el arnés SQL usa PostgreSQL 17 desechable y nunca se conecta
  al proyecto remoto.
- El 14-09-2026 se aplicó `supabase/updates/2026-09-14-subcategorias.sql`: 22
  subcategorías y 94 productos clasificados. Para nuevos productos, elegir una
  subcategoría de su misma categoría. Para cambiar la categoría, limpiar primero
  subcategory_id o actualizar ambas columnas juntas. Para borrar una subcategoría,
  desasignar primero sus productos; las FK impiden dejar asociaciones inválidas.
