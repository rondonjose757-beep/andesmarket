# Secciones horizontales por categoría en el Home + arreglo de navegación de categorías

## Contexto

AndesMarket es una PWA de minimarket (React + Vite + Tailwind + Supabase). Hoy la
`HomePage` muestra: el `Header` (buscador + carrito), `PromoCarousel` (banners de
ofertas/delivery/retiro), `CategoryChips` (fila de accesos rápidos con foto por
categoría) y una única sección "Destacados" con los productos en una lista vertical
de filas (`ProductCard`).

El usuario quiere, inspirado en la sección "Comprar" de la app Cashea (ver
referencia visual), que el catálogo se explore también en secciones horizontales
tipo carrusel — una franja por categoría, con scroll horizontal y tarjetas
recortadas al borde para insinuar que hay más productos, más un enlace
"Explorar" que lleva al catálogo filtrado por esa categoría.

Además, hoy la navegación al filtrar por categoría está rota:
- No hay forma fácil de volver a la pantalla principal desde `/catalogo` (solo
  scrolleando hasta arriba y tocando el logo, cuando es visible).
- Los chips de filtro dentro de `/catalogo` son botones de solo texto (sin foto),
  a diferencia de los chips con imagen que ya existen en el Home.
- Al filtrar por una categoría, la página sigue agrupando por categoría y
  muestra un `<h2>` con el nombre de la categoría, duplicando la información
  del chip ya seleccionado — se ve roto/redundante.

Se evaluó primero un modelo de "colecciones curadas" (tablas nuevas en Supabase
para secciones temáticas tipo "Chucherías", "Descuentos de la semana") pero el
usuario pidió mantenerlo simple: **las secciones horizontales del Home son,
directamente, las categorías que ya existen** (`categories` / `products.category_id`).
No se agrega ningún esquema nuevo a Supabase.

## Alcance

**Incluido:**
1. Nuevo componente de tarjeta compacta para carrusel horizontal
   (`CompactProductCard`).
2. Nuevo componente de sección horizontal por categoría (`CategorySection`),
   reutilizable, con título + "Explorar →" + fila de tarjetas con scroll
   horizontal y snap.
3. `HomePage`: debajo de "Destacados" (que se deja tal cual, sin tocar), una
   `CategorySection` por cada categoría con al menos un producto, en el orden
   de `categories.sort_order`. Categorías sin productos (ej. "Snacks" hoy) no
   se renderizan.
4. `CatalogPage`: rediseño de la cabecera de la página —
   - Botón/flecha "volver" que navega a Home, siempre visible.
   - Chips de categoría con imagen (mismo patrón visual que `CategoryChips`
     del Home) en vez de botones de solo texto, con estado activo marcado.
   - Cuando hay una categoría activa: título dinámico con el nombre de la
     categoría, grilla plana de productos (sin heading de categoría repetido),
     y un chip "Quitar filtro" para volver a la vista completa agrupada sin
     salir de la página.
   - Se mantiene el comportamiento actual de búsqueda por texto (`q`) tal cual
     (ya funciona correctamente tras el fix anterior de este mismo proyecto).

**Explícitamente fuera de alcance:**
- Tablas nuevas en Supabase, colecciones curadas, o cualquier dato que no
  exista ya en `categories`/`products`.
- Cambios a `CategoryChips` del Home (se deja exactamente como está).
- Cambios a la sección "Destacados" del Home (se deja exactamente como está).
- Descuentos de ejemplo o cualquier escritura de datos en Supabase.

## Diseño

### 1. `CompactProductCard`

Nuevo componente en `src/components/CompactProductCard.jsx`, hermano de
`ProductCard.jsx` pero en formato vertical compacto para caber varias por
pantalla en scroll horizontal (referencia visual: tarjeta de Cashea — imagen
arriba, texto abajo).

- Ancho fijo (`w-[152px]` aprox., a definir en implementación para que se vean
  ~2.2 tarjetas por pantalla en móvil, dejando la última recortada).
- Imagen cuadrada arriba (`aspect-square`), incluyendo el mismo tratamiento que
  `ProductCard`: badge de descuento (`-X%`) si `discount_type`/`discount_value`
  están activos, overlay "Agotado" si `stock <= 0`, placeholder de imagen si no
  hay `image_url`.
- Debajo: nombre (`line-clamp-2`, tamaño reducido) y precio (con precio tachado
  si hay descuento), reutilizando `computeDiscountedPrice`/`formatPrice` de
  `src/lib/format.js`.
- Sin botón "+" de agregar rápido (a diferencia de `ProductCard`): tocar la
  tarjeta llama a `onSelect(product)` para abrir `ProductDetailModal`, igual
  que las demás tarjetas de producto de la app — el agregar al carrito se hace
  desde ahí.
- Props: `{ product, onSelect }`.

### 2. `CategorySection`

Nuevo componente en `src/components/CategorySection.jsx`.

- Props: `{ title, to, products, onSelect }`.
- Si `products.length === 0`, retorna `null` (no se renderiza nada).
- Header: `title` a la izquierda (mismo estilo `text-lg font-black text-ink`
  que "Destacados" hoy), enlace `Explorar →` a la derecha (`to`, mismo estilo
  que "Ver todo →" existente).
- Fila con scroll horizontal (`overflow-x-auto`, `snap-x`, `scrollbar-hide`,
  mismo patrón que `PromoCarousel`/`CategoryChips`), mostrando hasta 10
  productos como `CompactProductCard`.
- No pagina ni hace scroll infinito: son los primeros 10 productos de la
  categoría en el orden que ya trae `useCatalog` (por nombre); ver el resto es
  lo que resuelve "Explorar".

### 3. `HomePage`

- Se agrega, después de la sección "Destacados" (sin modificarla) y antes del
  cierre del contenedor principal, un bloque que recorre `categories` (ya
  ordenadas por `sort_order` vía `useCatalog`) y por cada una renderiza:

  ```jsx
  <CategorySection
    key={category.id}
    title={category.name}
    to={`/catalogo?categoria=${category.id}`}
    products={products.filter((p) => p.category?.id === category.id).slice(0, 10)}
    onSelect={setSelectedProduct}
  />
  ```

- `CategoryChips` (fila de accesos rápidos con foto) se deja exactamente como
  está, en su posición actual.

### 4. `CatalogPage` — cabecera y filtrado

Reestructura del render de `CatalogPage.jsx` (la lógica de datos —
`useCatalog`, `useSearchParams`, filtrado por `q`/`categoria` — se mantiene,
solo cambia cómo se muestra):

- **Fila superior nueva**: botón de volver (ícono flecha izquierda, `Link
  to="/"`) + título dinámico:
  - Sin filtro de categoría activo (`activeCategoryId === 'all'`) y sin
    búsqueda: título "Catálogo".
  - Con categoría activa: título = nombre de esa categoría.
  - Con búsqueda activa (`q`): título `Resultados para "<query>"` (independiente
    de si hay categoría activa a la vez — la búsqueda por texto ya filtra
    sobre todas las categorías, como hoy).
- **Chips de categoría con imagen**: se extrae la lógica de armar "chip con
  foto de un producto de esa categoría" que hoy vive en `CategoryChips.jsx`
  a un helper compartido (o se duplica el patrón, a decidir en el plan de
  implementación) para usarla también aquí. Chip "Todas" usa un ícono
  genérico (no foto de producto) en vez de una imagen. El chip activo se marca
  con anillo verde (`ring-2 ring-brand`).
- **Resultado**:
  - Si `activeCategoryId === 'all'`: se mantiene el listado agrupado por
    categoría con heading `<h2>` por grupo (comportamiento actual, es el que
    tiene sentido para "ver todo").
  - Si hay una categoría específica activa: grilla plana de esa categoría
    (sin heading `<h2>` repetido — el título de la página ya lo dice).
  - En ambos casos, si además hay `q`, se filtra por texto como ya funciona
    hoy.
- **Chip "Quitar filtro"**: visible solo cuando `activeCategoryId !== 'all'`
  o hay `q` activo; al tocarlo resetea `activeCategoryId` a `'all'` y `query`
  a `''` sin navegar (se mantiene en `/catalogo`).

### Diagrama de flujo de navegación

```
Home
 ├─ CategoryChips (sin cambios) ──┐
 ├─ Destacados (sin cambios)      │
 └─ CategorySection × N           │
     ├─ tocar producto → ProductDetailModal (igual que hoy)
     └─ "Explorar" ───────────────┼──→ /catalogo?categoria=<id>
                                  │
                                  ▼
                         CatalogPage
                    [← Volver]  [Título dinámico]
                    [chips con imagen, uno activo]
                    [grilla plana o agrupada]
                    [Quitar filtro] (si aplica)
                         │
                         └─ [← Volver] → Home
```

## Fuera de alcance / decisiones explícitas

- No se crean tablas nuevas en Supabase ni se escriben datos.
- No se generan descuentos de ejemplo.
- El componente `ProductCard.jsx` (usado en la grilla de `/catalogo` y en
  "Destacados") no cambia.
- Categorías sin productos no aparecen como sección en el Home (no se muestra
  un estado vacío).
