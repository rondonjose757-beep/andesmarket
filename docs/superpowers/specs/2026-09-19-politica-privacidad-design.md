# Política de privacidad de AndesMarket

## Objetivo

Publicar una política de privacidad breve, clara y coherente con el funcionamiento
actual de AndesMarket. La política debe estar disponible sin iniciar sesión y ser
fácil de encontrar desde cualquier página de la tienda.

## Alcance

- Crear la ruta pública `/privacidad` dentro del diseño general de la aplicación.
- Añadir un pie compacto con un enlace `Política de privacidad` en las páginas que
  usan `AppLayout`.
- Ocultar el carrito flotante en `/privacidad`, porque no forma parte de la tarea
  que realiza el visitante en esa página.
- Mantener la cabecera normal para permitir volver al inicio.
- No añadir formularios, consentimiento de cookies, analítica ni cambios en la
  base de datos.

## Contenido

La página explicará en lenguaje sencillo:

1. Quién es responsable del tratamiento: AndesMarket.
2. Qué datos usa la tienda: nombre, teléfono, dirección cuando corresponde,
   información de pedidos, identificador de sesión anónima y contenido del carrito
   guardado en el dispositivo.
3. Para qué se usan: crear el perfil, procesar y consultar pedidos, coordinar retiro
   o delivery y conservar el carrito.
4. Proveedores técnicos: Supabase para autenticación y almacenamiento de datos, y
   Vercel para alojar la aplicación.
5. Conservación y seguridad: los datos se mantienen mientras sean necesarios para
   gestionar pedidos y atender solicitudes, con acceso restringido mediante las
   políticas de seguridad de la base de datos.
6. Derechos y contacto: solicitar información, corrección o eliminación mediante
   el teléfono `0412-2636533` o el correo `rondon.jose.757@gmail.com`.
7. Fecha de última actualización: 19 de septiembre de 2026.

El texto no afirmará el uso de pagos en línea, publicidad, analítica, cookies de
seguimiento ni venta de datos, porque esas funciones no existen en la aplicación.

## Arquitectura y componentes

- `src/pages/PrivacyPage.jsx`: página semántica con título, introducción y secciones
  breves. Usará los tokens de color y las primitivas visuales existentes.
- `src/components/Footer.jsx`: pie reutilizable con el nombre de la tienda, el enlace
  a la política y el año actual.
- `src/App.jsx`: registrará `privacidad` como ruta hija de `AppLayout`.
- `src/layouts/AppLayout.jsx`: renderizará el pie y evitará mostrar `FloatingCart`
  cuando la ruta sea `/privacidad`.

No habrá llamadas a Supabase ni estado nuevo. La navegación se resolverá con
`Link` de React Router.

## Accesibilidad y presentación

- Usar un único `h1` y encabezados jerárquicos para cada sección.
- Mantener contraste suficiente mediante los tokens existentes.
- Mostrar teléfono y correo como enlaces `tel:` y `mailto:`.
- Conservar anchos de lectura cómodos y diseño mobile-first.
- Asegurar foco visible en el enlace del pie.

## Verificación

- Añadir una prueba de navegador que abra `/privacidad`, compruebe el título y los
  datos de contacto, y verifique que el enlace del pie permite llegar a la página.
- Ejecutar `npm run lint`, la prueba E2E afectada y `npm run build`.
- Comprobar que las rutas existentes y el carrito flotante mantienen su conducta.

## Criterios de aceptación

- La política es accesible directamente en `/privacidad` y desde el pie.
- Describe únicamente los datos y servicios que usa AndesMarket actualmente.
- El teléfono y el correo confirmados aparecen correctamente y son accionables.
- La página funciona en tamaños móviles sin que el carrito flotante tape el texto.
- El proyecto supera lint, build y la prueba de navegación añadida.
