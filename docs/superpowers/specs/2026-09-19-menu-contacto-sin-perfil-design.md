# Menú de contacto sin perfil visible

## Objetivo

Desactivar temporalmente toda referencia visible a perfiles de clientes e inicio de sesión, sin interrumpir el catálogo, el carrito ni la confirmación actual de pedidos. Sustituir esos accesos por canales directos de atención de AndesMarket.

## Alcance

- Retirar el acceso de perfil de la cabecera.
- Eliminar las rutas públicas de perfil e historial de pedidos.
- No presentar cuentas, sesiones ni perfiles como parte de la experiencia del cliente.
- Mantener la autenticación anónima de Supabase únicamente como detalle técnico interno, porque las políticas RLS actuales la requieren para confirmar pedidos.
- Mantener la captura de nombre y teléfono al confirmar una compra, presentada como datos necesarios para procesar ese pedido y no como creación de un perfil.
- Reemplazar el icono de perfil por un botón de menú hamburguesa.
- Sustituir la llamada a consultar pedidos al final de Inicio por una llamada a contactar un asesor mediante WhatsApp.

No se modifican el esquema de Supabase, las políticas RLS, el carrito, el catálogo, el detalle de productos ni la futura página administrativa de pedidos.

## Menú lateral

El botón hamburguesa abrirá un panel lateral desde la derecha, según la opción visual A aprobada. El panel contendrá:

1. Una explicación breve: AndesMarket es un minimarket local para comprar productos de uso diario con retiro en tienda o delivery.
2. Un enlace principal “Hablar por WhatsApp” al número `+58 412-2636533`, con un mensaje inicial breve de consulta.
3. Un enlace “Llamar al negocio” mediante `tel:+584122636533`.
4. Un enlace “Ver Instagram” dirigido a `https://www.instagram.com/andesmarket.app/`.

Los enlaces externos abrirán de forma segura en una pestaña nueva cuando corresponda. El panel usará únicamente los tokens visuales existentes en `src/index.css`.

## Interacción y accesibilidad

- El botón tendrá el nombre accesible “Abrir menú”.
- El panel se podrá cerrar con su botón, con la tecla Escape y al pulsar el fondo oscurecido.
- Al abrirse, el foco entrará en el panel; al cerrarse, volverá al botón hamburguesa.
- Mientras esté abierto, el foco permanecerá dentro del panel y el desplazamiento del documento quedará bloqueado.
- Los controles conservarán un área táctil mínima de 44 px y estados visibles de foco.
- La cabecera compacta que aparece al hacer scroll también ofrecerá acceso al mismo menú.

## Llamada a la acción en Inicio

La tarjeta “Tus compras, a mano” se reemplazará por una tarjeta de ayuda. Su mensaje será equivalente a:

- Título: “¿Necesitas ayuda para comprar?”
- Descripción: “Un asesor puede tomar tu pedido por WhatsApp.”
- Acción: abrir WhatsApp al número del negocio con un mensaje inicial que indique que el cliente necesita ayuda para hacer un pedido.

La tarjeta conservará la composición visual actual, los colores de marca y la adaptación móvil.

## Cambios de navegación

- Se retirarán las rutas `/perfil` y `/mis-pedidos` de `App.jsx`.
- No habrá enlaces visibles hacia esas rutas.
- Los archivos existentes relacionados con perfil e historial podrán conservarse temporalmente sin quedar expuestos, para evitar una eliminación destructiva innecesaria y facilitar una posible reactivación futura.
- La ruta de confirmación `/pedido/:orderId` continuará funcionando después de realizar un pedido.

## Tratamiento interno de datos

La sesión anónima seguirá creándose silenciosamente para cumplir con RLS. El formulario previo a confirmar el pedido seguirá almacenando los datos mínimos exigidos por el modelo actual, pero su texto hablará de “datos del pedido” y no de “perfil”. No se añadirá ninguna interfaz para consultar o editar esos datos.

## Pruebas y verificación

Se ampliarán las pruebas E2E para comprobar que:

- no existe acceso visible a perfil ni historial;
- el botón hamburguesa abre y cierra el panel;
- Escape y el fondo cierran el panel y restauran el foco;
- WhatsApp, llamada e Instagram tienen los destinos correctos;
- la tarjeta final de Inicio dirige a WhatsApp;
- el buscador, catálogo, carrito y cabeceras siguen funcionando.

Al terminar se ejecutarán `npm run test:e2e`, `npm run lint` y `npm run build`, y se verificará el resultado en navegador a tamaño móvil.
