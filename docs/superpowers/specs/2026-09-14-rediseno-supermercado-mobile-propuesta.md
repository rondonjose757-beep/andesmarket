# AndesMarket — Propuesta de rediseño del supermercado móvil

Fecha: 2026-09-14. Estado: dirección aprobada por el usuario e implementada el 2026-09-14.

## Objetivo

Acercar la experiencia de compra a la referencia PedidosYa solicitada: encontrar
productos por categoría y subcategoría, comparar sus precios y agregar varios
artículos con pocos pasos. Conservar el nombre y el verde de AndesMarket.
La prioridad inicial es Inicio, Catálogo, ficha de producto y acceso al carrito.

## Referencias y alcance del análisis

- https://www.pedidosya.com/: el sitio público consultado muestra un selector de países.
- https://play.google.com/store/apps/details?hl=es-US&id=com.pedidosya:
  la ficha oficial destaca exploración, filtros, promociones y seguimiento.
- Se inspeccionó el código local de Inicio, Catálogo, cabeceras, tarjetas,
  categorías, detalle, modal, carrito y carga del catálogo.

No se pudo inspeccionar el catálogo interactivo de PedidosYa: el navegador
de esta sesión no está habilitado y la web de Venezuela no se pudo recuperar.
Tampoco se ha verificado visualmente la app local en un navegador. Por ello,
las medidas y distribuciones siguientes son propuestas para AndesMarket,
no mediciones ni una reproducción exacta de PedidosYa.

## Hallazgos en el código actual

| Hallazgo | Consecuencia | Cambio propuesto |
| --- | --- | --- |
| ProductCard muestra un + decorativo dentro del botón de detalle | Agregar requiere abrir otra vista | Separar detalle y compra rápida |
| Inicio combina fichas horizontales y verticales | Cambia la lectura del precio y la interacción | Unificar anatomía y controles |
| Catálogo usa una sola columna en móvil | Menos productos visibles simultáneamente | Dos columnas, imagen arriba y precio destacado |
| CategoryChips descarta categorías sin foto | Una categoría con productos puede desaparecer de Inicio | Mostrar recurso alternativo y conservar el acceso |
| Header reserva 272 px y Home compensa con margen negativo | La composición depende de alturas rígidas; el mismo Header se usa en otras páginas | Cabecera compacta y promoción dentro del flujo normal |
| Catálogo borra los parámetros de búsqueda y categoría | Recargar o compartir pierde la selección | Mantener los filtros en la URL |
| useCatalog ordena categorías alfabéticamente | No utiliza sort_order para priorizar departamentos | Respetar el orden comercial |
| El esquema solo contiene categorías | No existen subcategorías reales para filtrar | Añadir una jerarquía explícita en una etapa de datos |
| Carrito flotante solo muestra cantidad | El total exige otra navegación | Barra inferior con cantidad, total y Ver carrito |

## Alternativas

1. **Recomendada: experiencia de supermercado cercana a la referencia con marca
   AndesMarket.** Fichas verticales, compra rápida, categorías en dos niveles,
   promociones compactas y carrito persistente. Cambia tanto presentación como
   interacción; necesita una etapa adicional para organizar los datos.
2. **Ajuste visual limitado.** Mejorar colores, espacios y fichas manteniendo el
   flujo actual. Menor alcance, pero conserva los pasos extra para comprar y no
   resuelve las subcategorías.
3. **Reproducción visual muy fiel.** Requiere capturas verificables del catálogo
   concreto de PedidosYa, porque puede variar entre países y versiones. Permite
   comparar con precisión, pero retrasa decisiones que ya podemos resolver.

## Diseño recomendado

### Inicio

Cabecera blanca compacta con AndesMarket y acceso al perfil. Buscador ancho con
el texto «Buscar en AndesMarket». Una promoción de altura contenida, seguida
de accesos visuales a departamentos y secciones horizontales de productos.
Mostrar «Ofertas» solo cuando existan descuentos válidos; para el resto usar
«Descubre nuestros productos». No presentar selecciones arbitrarias como
«Más vendidos» ni inventar tiempos de entrega, cobertura o ahorros.

### Catálogo y categorías

Buscador y navegación de categorías accesibles durante el desplazamiento.
Primera fila: departamentos. Segunda fila: subcategorías del departamento
seleccionado, con opción «Todo». Ejemplo ilustrativo: Bebidas → Agua, Jugos,
Refrescos. La clasificación final debe corresponder al inventario real.

Dos columnas desde 360 px, márgenes de 16 px y separación de 12 px. En pantallas
amplias aumentar columnas manteniendo fichas legibles. Nunca permitir
desbordamiento horizontal de la página; solo de los carruseles previstos.
Conservar búsqueda y selección en la URL. Cambiar de departamento limpia la
subcategoría anterior. Mostrar cuántos resultados hay y permitir limpiar filtros.

### Ficha de producto

Imagen cuadrada sobre blanco, sin recortar el envase; precio con mayor peso
visual; precio anterior tachado y descuento solo cuando corresponda. Nombre
con hasta dos líneas y nombre completo en el detalle. No inferir peso o volumen
si el catálogo no los aporta.

El botón + agrega una unidad y se transforma en un selector − / cantidad / +.
Reducir de uno a cero elimina el artículo. Tocar imagen o nombre abre el detalle.
Los botones de cantidad y de detalle son elementos independientes, sin botones
anidados. Todas las apariciones del producto reflejan la cantidad del carrito.
«Agotado» deshabilita agregar; una imagen fallida muestra un recurso alternativo.

### Detalle y carrito

Detalle como panel inferior en móvil y diálogo centrado en escritorio, con
imagen amplia, descripción, precio, cantidad y acción inferior visible.
Restaurar el foco al cerrar, contenerlo dentro del diálogo, bloquear el scroll
del fondo y permitir Escape. Respetar áreas seguras del teléfono.

Barra inferior cuando haya artículos: cantidad, «Ver carrito» y total. Reservar
espacio para no tapar productos. En el carrito conservar retiro/delivery y el
proceso existente de identificación y confirmación del pedido.

### Lenguaje visual

Fondos claros, superficies blancas, bordes suaves, sombras discretas y verde
de marca en acciones y selección. Mantener Plus Jakarta Sans. Precio de 18–20 px,
nombre de 13–14 px y títulos de sección de 20–22 px como punto de partida.
Controles táctiles de al menos 44 × 44 px, foco visible y contraste comprobado.
Usar tokens centralizados, incluidos los estados de error. Respetar la
preferencia de movimiento reducido.

## Etapas y dependencia de datos

1. Unificar fichas y compra rápida; compactar Inicio y cabeceras; mejorar catálogo,
   URL de filtros, detalle y barra del carrito con los datos disponibles.
2. Diseñar y aplicar el soporte real de subcategorías, actualizar schema.sql,
   consulta y políticas RLS necesarias; clasificar el inventario existente sin
   inventar asociaciones por palabras del nombre. La primera etapa no debe
   mostrar filtros de subcategorías vacíos ni ficticios.

La segunda etapa requiere inspeccionar los datos reales y definir un cambio
compatible con los productos existentes. Las categorías sin subcategorías deben
seguir funcionando. Este documento no constituye un diseño SQL listo para aplicar.

## Validación prevista

- Lint y compilación de producción.
- Navegación a 360, 390 y 430 px, y escritorio: sin controles tapados ni desbordes.
- Agregar desde Inicio y Catálogo, incrementar, eliminar y recargar el carrito.
- Buscar con y sin tildes, cambiar filtros, recargar y navegar atrás.
- Revisar nombres largos, precios con descuento, imagen ausente o rota,
  productos agotados, carga, error y ausencia de resultados.
- Comprobar teclado, foco del diálogo, áreas seguras y movimiento reducido.
- Validar retiro/delivery sin crear pedidos reales de prueba en producción.

## Decisión propuesta

Adoptar la alternativa 1 y comenzar por la experiencia de compra. La referencia
de PedidosYa orienta el trabajo, y AndesMarket conserva su identidad verde.
Dirección aprobada. Se implementaron la experiencia de compra y las subcategorías;
ver docs/rediseno-mobile-verificacion.md para los resultados y el alcance.
