# Rediseño móvil — implementación y verificación

14 de septiembre de 2026. Dirección aprobada en la propuesta de diseño.

## Cambios

- Inicio con cabecera compacta, promoción dentro del flujo de página y departamentos.
- Ficha vertical compartida por Inicio y Catálogo, dos columnas en móvil, precio
  destacado, descuentos válidos, imagen con estado de carga y alternativa ante error.
- Compra directa y selector de cantidades sincronizados con el carrito existente.
- Categorías, subcategorías y ofertas combinables con búsqueda sin tildes. La URL
  conserva los filtros y soporta recarga y Atrás. Cambiar categoría y escribir
  inmediatamente conserva ambos cambios.
- Panel de producto inferior en móvil, diálogo centrado en escritorio, acciones
  visibles, bloqueo de scroll, foco contenido, restauración de foco y Escape.
- Barra inferior con cantidad y total. El carrito conserva retiro y delivery.
- Estados de carga, error recuperable y ausencia de resultados; movimiento reducido.

## Base de datos

Aplicado sobre AndesMarket, proyecto `ywtusdrduxsxwjeghrpu`:
`supabase/updates/2026-09-14-subcategorias.sql`.

Se agregaron 22 subcategorías y se clasificaron explícitamente los 94 productos
activos inspeccionados. Las categorías existentes se conservaron. El esquema
inicial se actualizó en `supabase/schema.sql`; no debe ejecutarse de nuevo sobre
la base existente. El archivo de actualización es de aplicación única.

La relación compuesta impide que un producto tenga una subcategoría de otro
departamento. Subcategorías tiene RLS y SELECT para anon/authenticated; se
comprobó que anon no puede INSERT/TRUNCATE y authenticated no puede UPDATE.
Los cambios de clasificación se administran desde Table Editor.

El asesor de seguridad mostró avisos sobre políticas de acceso anónimo y
configuración de autenticación ya existente. No se cambiaron esas políticas;
el catálogo es público y la app usa sesiones anónimas por diseño.

Para revertir solo la interfaz se puede restaurar el código anterior conservando
las nuevas tablas: los cambios de datos son aditivos. Para retirar el esquema,
respaldar primero la clasificación, retirar la FK, el CHECK, el índice y la columna
subcategory_id de products, y después la tabla subcategories. No se ejecutó reversión.

## Verificación

`npm run lint` y `npm run build`. Oxlint mantiene cuatro avisos preexistentes:
exports de contextos en AuthProvider, CartProvider y Toast, y un setState en un
efecto de OrdersPage. Ninguno pertenece a la lógica nueva del catálogo.

Se añadieron ocho pruebas reproducibles de navegador en `tests/e2e/catalogo.spec.js`:
compra rápida, sincronización entre vistas, agotados, persistencia, filtros y Atrás,
subcategorías, foco del detalle, tamaños 360/390/430/1280 px, imágenes fallidas,
movimiento reducido, error con reintentos, vacío y selección de retiro/delivery.

Preparación: `npm install`, `npx playwright install chromium`.
Ejecución: `npm run test:e2e`.
El servidor de pruebas usa el puerto 5178 y credenciales ficticias. Intercepta
Supabase y bloquea escrituras. Si Chromium ya está instalado fuera de la ruta
estándar, se puede pasar `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

También se verificó la lectura del catálogo público real: 94 productos con
subcategoría; Bebidas → Jugos y néctares devuelve 5 productos y conserva el
filtro al recargar. Se bloquearon creación de sesiones y pedidos durante esta
comprobación de lectura.

## Datos y alcance

Los 94 productos reales tienen precio 0. Se conservaron esos valores; los precios
se deben completar antes de vender. Las imágenes de Supabase Storage tardaron en
cargar durante la revisión; la UI ahora indica carga y ofrece alternativa ante
error. Se revisó la composición con imágenes controladas y se comprobó la lectura
real, pero no se afirma que todas las imágenes externas carguen rápidamente.

La interfaz queda en el repositorio y el servidor local; no se hizo push ni deploy
público. El cambio de subcategorías sí está aplicado en Supabase. No se crearon
pedidos de prueba en producción ni se modificaron precios, stock o clientes.
