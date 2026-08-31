# AndesMarket

Tienda online del minimarket AndesMarket: catálogo, carrito y pedidos con
retiro en tienda o delivery. Base adaptada de la app cliente de
[Contenedores](../mall-contenedores), simplificada para un solo local (sin
multi-restaurante, sin mapa de mesas).

Stack: React 19 + Vite + Tailwind v4 + react-router + Supabase (Postgres +
Auth anónima + Realtime). Pensado para desplegar en Vercel.

## 1. Crear el proyecto de Supabase

1. Crea un proyecto nuevo en [supabase.com](https://supabase.com) (o reutiliza uno tuyo).
2. Ve a **SQL Editor** y pega el contenido completo de `supabase/schema.sql`. Ejecútalo.
   Esto crea las tablas (`categories`, `products`, `customers`, `orders`,
   `order_items`), las políticas de seguridad (RLS) y 4 categorías de ejemplo.
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

## Pendientes para tener marca propia

- **Logo y colores**: `src/index.css` tiene una paleta placeholder (verde
  `--color-brand` + naranja `--color-accent`). Cámbiala ahí cuando definas
  la identidad de marca — todo el resto de componentes usa esos tokens, no
  colores sueltos.
- **Ícono de PWA**: agrega `public/icons/icon-192.png`,
  `public/icons/icon-512.png` y `public/icons/apple-touch-icon.png` (192×192,
  512×512 y 180×180 respectivamente) para que la app sea instalable con tu
  ícono real.
- **Header**: `src/components/Header.jsx` usa texto "AndesMarket" — cámbialo
  por un `<img>` con tu logo cuando lo tengas.

## Qué no incluye esta base (a propósito)

Para mantenerlo simple al inicio, no hay: panel de administración (gestionas
productos/pedidos desde el Table Editor de Supabase), variantes/adicionales
por producto, pagos en línea, ni multi-sucursal. Se pueden agregar después
siguiendo el mismo patrón que `app-restaurante` en Contenedores (una segunda
app dentro del mismo proyecto, con su propio login).
