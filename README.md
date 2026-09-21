# AndesMarket

Tienda online del minimarket AndesMarket: catálogo, carrito y pedidos por
delivery. La persona compra como invitada, selecciona un sector y recibe un
recibo con número `AM-xxxxx`; Supabase calcula precios, tarifa y total de forma
atómica.

En el checkout, el selector muestra solo los nombres de los sectores; las
tarifas no se exponen en sus opciones y aparecen únicamente en el resumen de
importes. La persona puede escribir una dirección o capturar su ubicación con un
botón que solicita permiso al navegador y genera internamente un enlace de Google
Maps. Al menos una de esas dos formas de destino es obligatoria.

Cada sesión invitada conserva su propio perfil. El teléfono es un dato de
contacto y puede repetirse entre clientes distintos; nunca se reutiliza ni se
fusiona automáticamente un perfil por coincidencia de número.

Stack: React 19 + Vite + Tailwind v4 + react-router + Supabase (Postgres, RLS y
Auth anónima). Pensado para desplegar en Vercel.

## 1. Crear el proyecto de Supabase

1. Crea un proyecto nuevo en [supabase.com](https://supabase.com) (o reutiliza uno tuyo).
2. En una base nueva, ejecuta `supabase/schema.sql` y después los archivos de
   `supabase/updates/` pendientes por dependencia: base de pedidos, pedidos
   atómicos, ubicación, teléfonos compartidos y operadores/acceso. El esquema
   inicial ya incluye subcategorías; no repitas el script histórico del 14-09
   sobre una instalación nueva. Son actualizaciones manuales, sin historial CLI.
   En una base existente, no repitas el esquema inicial ni actualizaciones aplicadas.
3. En **Authentication → Providers**, activa **Anonymous sign-ins** (la app
   crea una sesión anónima por visitante para poder guardar su perfil y sus
   pedidos sin pedirle que se registre).
4. Ve a **Project Settings → API** y copia la **Project URL** y la **anon
   public key**.
5. Carga tus productos reales desde **Table Editor → products** (o por SQL):
   nombre, precio, categoría, imagen (puedes subir imágenes a **Storage** y
   pegar la URL pública), y `stock`.

## 2. Desarrollo local

```bash
npm install
cp .env.example .env
```

Completa `.env` con la URL y la anon key del paso anterior:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

```bash
npm run dev
```

## 3. Desplegar en Vercel

1. Sube este repo a GitHub (o conéctalo directo desde tu carpeta local con `vercel`).
2. En Vercel, importa el proyecto — detecta Vite automáticamente
   (`npm run build`, carpeta de salida `dist`).
3. En **Settings → Environment Variables**, agrega `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY` (las mismas del `.env`). Vite las incrusta en el
   build, así que tienen que estar en Vercel, no solo en tu máquina.
4. Conecta tu dominio (el que ya compraste) desde **Settings → Domains**.

`vercel.json` ya incluye el rewrite para que las rutas de React Router
(`/pedido/:id`, etc.) funcionen al recargar la página directamente.

## 4. Verificación

```bash
npm run lint
npm run test:unit
npm run test:e2e
npm run build
```

Las migraciones y la RPC de pedidos tienen un arnés PostgreSQL 17 aislado. No
usa las variables del proyecto ni se conecta a Supabase remoto:

```bash
docker pull postgres:17-alpine
sh supabase/tests/run-mvp-pedidos.sh
```

El arnés también instala la base administrativa y prueba operadores, permisos,
RLS y conservación del contrato público. Si Docker no está disponible, se puede
ejecutar `psql -v ON_ERROR_STOP=1 -f supabase/tests/mvp-pedidos.sql` sobre una
base **nueva y desechable** de PostgreSQL 17, especificando explícitamente socket,
usuario y base locales. El arnés simula Auth; no prueba emisión de sesiones reales.

## Base administrativa preparada (solo validada localmente)

`supabase/updates/2026-09-20-mvp-operadores-y-acceso.sql` crea las fichas de
Alejandro, Marianny y Jorge inactivas, sin vínculo Auth y con cambio de PIN
obligatorio. Las tablas privadas de credenciales e intentos quedan vacías.
El PIN temporal se aprovisionará fuera del repositorio mediante un canal seguro;
solo se admite hash bcrypt con sal individual y coste 12.

RLS permite únicamente leer la ficha propia a un operador activo con sesión no
anónima. Las credenciales e intentos no tienen acceso cliente, ni siquiera para
un operador. El auxiliar `private.is_active_admin()` comprueba pertenencia en
base de datos; no usa `user_metadata` y no abre permisos sobre pedidos.
La guía de [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)
fundamenta la combinación de permisos explícitos, RLS y comprobación del claim
firmado de sesión anónima.

No se ha aplicado esta migración al proyecto remoto. Todavía faltan cuentas Auth,
aprovisionamiento y cambio de PIN, Edge Function de login, límites atómicos de
intentos, secreto HMAC y limpieza por expiración (90 días iniciales). El login
futuro usará sesión administrativa independiente. No existen rutas `/admin` ni
componentes administrativos; `AuthProvider` y checkout permanecen intactos.

## Pendientes para tener marca propia

- **Ícono de PWA**: agrega `public/icons/icon-192.png`,
  `public/icons/icon-512.png` y `public/icons/apple-touch-icon.png` (192×192,
  512×512 y 180×180 respectivamente) para que la app sea instalable con tu
  ícono real.

## Qué no incluye esta base (a propósito)

Para mantenerlo simple al inicio, todavía no hay panel de administración
(productos y pedidos se gestionan desde el Table Editor de Supabase), pagos en
línea, inventario automático, variantes por producto ni multi-sucursal. El
dashboard privado está especificado en `ANDES_MARKET_ADMIN_SPEC.md` y se
implementará dentro del mismo frontend.
