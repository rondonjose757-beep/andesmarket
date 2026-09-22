# Especificación del MVP operativo y dashboard de AndesMarket

## 1. Propósito del documento

Esta especificación define el contrato funcional, de datos, seguridad y verificación para convertir la PWA pública actual de AndesMarket en un MVP operativo exclusivamente de delivery y añadir un dashboard web privado para tres operadores.

El objetivo es que el pedido oficial nazca y permanezca en Supabase, pueda operarse con trazabilidad hasta su entrega o cancelación y produzca reportes confiables. WhatsApp sirve únicamente para comunicación; nunca crea, reconstruye ni modifica el pedido oficial.

La implementación debe conservar React 19, Vite, Tailwind, Supabase y el diseño visual actual. No se propone una aplicación móvil nativa, un backend propio general ni un segundo proyecto frontend.

## 2. Alcance del MVP

### Incluido

- Compra como invitado mediante la sesión anónima técnica existente de Supabase Auth.
- Checkout únicamente de delivery con nombre, teléfono, sector, dirección opcional, indicaciones y ubicación capturada como enlace de Google Maps. Se exige dirección o ubicación, al menos una.
- Cálculo confiable de subtotal, delivery y total en Supabase.
- Número visible de pedido con formato `AM-xxxxx`.
- Dashboard responsive privado en la misma aplicación para Alejandro, Marianny y Jorge.
- Operación de estados, pagos, modificaciones, cancelaciones, contacto por WhatsApp y solicitud manual de Speedy.
- Historial auditable de cambios.
- Reportes de pedidos entregados y registro manual de la tasa Bs/$.

### Fuera de alcance y expresamente desactivado

- Retiro en tienda.
- Tracking o estado en vivo visible para clientes, incluido Realtime en la confirmación pública.
- Pagos online, captura automática o conciliación con proveedores de pago.
- Inventario automático o reserva/descuento automático de existencias.
- Integración por API con Speedy.
- Registro obligatorio, contraseña o cuenta administrable para clientes.
- Aplicación móvil nativa.
- Funciones que no sean necesarias para este MVP.

## 3. Arquitectura actual y contradicciones detectadas

La aplicación actual es un frontend estático que habla directamente con Supabase usando la anon key. `AuthProvider` crea sesiones anónimas, `CartProvider` guarda el carrito en `localStorage`, `submitOrder()` inserta primero `orders` y luego `order_items`, y RLS limita la lectura al dueño de la sesión.

| Situación actual | Requisito del MVP | Resolución mínima |
|---|---|---|
| `CartPage` ofrece retiro y delivery; inicia en `retiro`. | Operación exclusivamente delivery. | Eliminar el selector y enviar siempre delivery. Rechazar cualquier otro tipo también en la base de datos. |
| `orders.status` usa `confirmado`, `preparando`, `listo`, `entregado`, `cancelado`. | Nuevo, Confirmado, Preparando, Enviado, Entregado y Cancelado. | Migrar el dominio de estados; `listo` no será estado persistido y el mensaje a Speedy expresará que estará listo en 10 minutos. |
| `ConfirmationPage` muestra progreso y escucha Realtime. | Tracking visible desactivado. | Convertirla en recibo estático de creación; no suscribirse a cambios ni mostrar el flujo interno. |
| `submitOrder()` hace dos escrituras y acepta nombres/precios del navegador. | Pedido atómico y precios confiables. | Reemplazarlo por una función SQL/RPC transaccional que recibe solo producto y cantidad, relee precios y calcula importes. |
| `orders` no guarda importes ni número visible. | Subtotal, delivery, total y `AM-xxxxx`. | Persistir snapshots calculados por la RPC y asignar número único en servidor. |
| La app se documenta como 100 % frontend. | PIN administrativo no expuesto, limitado y separado de clientes anónimos. | Añadir una única Supabase Edge Function de inicio administrativo. Es una excepción necesaria y acotada; no se introduce un backend general. |
| `customers.phone` es único globalmente. | Compra como invitado sin cuenta obligatoria. | Mantenerlo inicialmente por compatibilidad, pero revisar su impacto: una sesión anónima nueva no puede reutilizar el teléfono. La migración recomendada elimina la unicidad global y conserva índice no único normalizado. |
| README y AGENTS.md describen retiro, tracking y ausencia de dashboard. | El nuevo MVP cambia esas decisiones. | Actualizarlos durante la implementación, no en este paso de especificación. |

## 4. Rutas

### Rutas públicas existentes

| Ruta | Uso actual | Contrato del MVP |
|---|---|---|
| `/` | Inicio y compra rápida. | Se conserva. |
| `/catalogo` | Catálogo y filtros. | Se conserva. |
| `/carrito` | Carrito y checkout. | Se ajusta a delivery exclusivo. |
| `/privacidad` | Política de privacidad. | Se conserva y se revisa si los nuevos datos requieren aclaración. |
| `/pedido/:orderId` | Confirmación y tracking por UUID. | Se conserva como recibo estático protegido por RLS; muestra `order_number`, no tracking. El UUID no sustituye la autorización. |

`OrdersPage` y `ProfilePage` existen sin ruta pública y deben permanecer así.

### Ruta propuesta del dashboard

- `/admin`: entrada y shell privado del dashboard.
- Rutas hijas recomendadas para mantener navegación recargable: `/admin/pedidos`, `/admin/pedidos/:orderId`, `/admin/reportes` y `/admin/tasas`.
- Una guarda de ruta debe exigir una sesión no anónima activa y una fila habilitada en `admin_operators`. Ocultar enlaces no es una medida de seguridad; RLS debe negar los datos si se intenta abrir la URL directamente.
- La aplicación mantiene un único build y lenguaje visual. Las páginas administrativas se cargan con `lazy()` para no aumentar innecesariamente la carga inicial del cliente.

## 5. Flujo completo del cliente

1. La persona navega y arma el carrito como invitada. La sesión anónima sigue siendo un detalle técnico, no una cuenta que deba comprender o administrar.
2. En `/carrito` revisa productos y cantidades. No existe selector de retiro.
3. Informa nombre y teléfono. Si ya hay un perfil de la sesión, puede corregir esos datos para este pedido.
4. Selecciona uno de los sectores activos. El selector muestra solo los nombres; no expone tarifas en sus opciones. La tarifa se muestra únicamente en el resumen del pedido.
5. Puede escribir una dirección o pulsar el botón de ubicación. Solo tras ese gesto se llama a `navigator.geolocation.getCurrentPosition`; el navegador genera internamente un enlace HTTPS de Google Maps y no envía campos de coordenadas. Dirección e indicaciones son opcionales, pero dirección y ubicación no pueden faltar a la vez.
6. La pantalla muestra una estimación de subtotal, delivery y total. Esta estimación mejora la experiencia, pero no es autoridad de precios.
7. Al confirmar, el navegador envía a la RPC únicamente identidad del cliente, sector, dirección, indicaciones, enlace de Maps y pares `{product_id, quantity}`.
8. Supabase valida propiedad del cliente, sector y productos; recalcula precios, descuentos, subtotal, delivery y total; crea pedido e ítems en una sola transacción.
9. Solo después del éxito se vacía el carrito y se navega a `/pedido/:orderId`.
10. La confirmación muestra `AM-xxxxx`, los datos entregados, los ítems y los tres importes guardados. Informa que AndesMarket coordinará por WhatsApp, sin exponer el estado interno ni iniciar Realtime.
11. Un fallo conserva el carrito y muestra un mensaje en español. Si cambió un precio o un producto dejó de estar disponible, se informa y se permite revisar antes de reintentar.

## 6. Sectores y tarifas iniciales

| Sector | Tarifa de delivery (USD) | Orden |
|---|---:|---:|
| La Pedregosa | 1.00 | 1 |
| Belenzate | 2.00 | 2 |
| Campo Claro | 3.00 | 3 |

Las tarifas viven en `delivery_sectors`, no en JSX. Cada pedido guarda el id y snapshots del nombre y tarifa para que cambios futuros no alteren pedidos históricos. Solo sectores activos se aceptan al crear pedidos.
El checkout público no incluye estas tarifas en las opciones del selector; las usa para el desglose estimado después de elegir un sector.

## 7. Estados del pedido

Valores persistidos y etiquetas:

| Valor | Etiqueta | Significado |
|---|---|---|
| `nuevo` | Nuevo | Pedido recibido, pendiente de revisión. |
| `confirmado` | Confirmado | Datos y viabilidad revisados. |
| `preparando` | Preparando | Bodega arma la versión final. |
| `enviado` | Enviado | Pedido entregado a Speedy. |
| `entregado` | Entregado | Entrega completada; entra en reportes. |
| `cancelado` | Cancelado | Pedido cerrado sin entrega; no entra en ventas. |

Transiciones ordinarias: `nuevo → confirmado → preparando → enviado → entregado`. Se permite cancelar desde cualquier estado anterior a `entregado`. Reabrir, retroceder o editar un pedido entregado/cancelado queda prohibido en el MVP. Las transiciones deben ejecutarse mediante RPC y registrar actor, fecha y valores anterior/nuevo.

## 8. Métodos y estados de pago

Métodos persistidos: `pago_movil`, `binance` y `efectivo`. Sus etiquetas son Pago Móvil, Binance y Efectivo.

Estados generales de pago:

- `pendiente`: aún no confirmado.
- `confirmado`: operador verificó el pago o, para efectivo, se confirmó la modalidad acordada.
- `rechazado`: la validación manual falló.

El efectivo necesita además `cash_handover_status`:

- `no_aplica`: obligatorio para Pago Móvil y Binance.
- `pendiente_speedy`: efectivo pendiente de recibir de Speedy.
- `recibido`: efectivo recibido.

Reglas:

- Elegir Efectivo inicializa el estado de entrega de efectivo en `pendiente_speedy`; los otros métodos fuerzan `no_aplica`.
- Marcar `recibido` requiere fecha y operador responsable.
- El estado de pago no se infiere del estado del pedido.
- El dashboard muestra por separado pago y efectivo de Speedy.
- No se almacenan credenciales bancarias, capturas ni datos de pago sensibles en este MVP.

## 9. Acceso administrativo

### Estado implementado: base SQL, 20-09-2026

`2026-09-20-mvp-operadores-y-acceso.sql` es una actualización incremental manual
posterior a las de pedidos, ubicación y teléfonos. Fue probada en PostgreSQL 17
desechable; el propietario confirmó posteriormente su aplicación en Supabase.

Se crean tres fichas inactivas y sin `auth_user_id`, con `must_change_pin = true`.
No se crean cuentas Auth ni emails ficticios. Credenciales e intentos privados
quedan vacíos: el PIN temporal aprobado se aprovisionará por un canal seguro,
fuera del SQL versionado. En esta primera fase no se implementó login ni `/admin`.

`private.is_active_admin()` es estable, `SECURITY DEFINER`, con `search_path`
vacío, tablas calificadas y ejecución revocada de PUBLIC/anon. `authenticated`
solo recibe ejecución del auxiliar y uso del esquema para resolverlo. Exige
UID, claim firmado `is_anonymous` booleano falso y asociación activa en la base;
claims ausentes o de otro tipo deniegan acceso. No utiliza `user_metadata`.
Solo comprueba pertenencia, no valida el PIN ni su rotación.

La política `operadores activos leen su propia ficha` permite SELECT de la ficha
propia. RLS está activo en las tres tablas; las privadas no tienen políticas
permisivas ni permisos de datos para roles cliente o `service_role` en esta fase.
El propietario mantiene acceso para aprovisionamiento controlado. El login
servidor deberá añadir permisos/RPC mínimos sin exponer `private` en la Data API.
No hay permisos administrativos nuevos sobre pedidos, catálogo ni clientes.

Antes de habilitar acceso operativo: definir identidades Auth reales, emitir
sesiones con un mecanismo Auth soportado, aprovisionar hashes con sal individual,
imponer cambio individual del PIN temporal, implementar límites/bloqueos atómicos
y respuestas genéricas contra enumeración. Definir secreto externo y rotación
para HMAC-SHA256 de red, tratamiento de proxies confiables y limpieza programada
de intentos vencidos. La expiración inicial de 90 días no borra filas por sí sola
ni implementa rate limiting. No registrar PIN, tokens, sesiones ni IP plana.

### Fase 2 implementada localmente: backend, 21-09-2026

La migración `2026-09-21-admin-login-atomico.sql` añade estado privado de límites,
`private.attempt_admin_login` y el puente RPC invoker `public.admin_login_attempt`,
ambos ejecutables solo por `service_role` y el propietario. No expone `private`
en la Data API ni concede lectura directa de credenciales. La función es de
preautenticación: no requiere un UID previo; su acceso se restringe mediante ACL.

La Edge Function `supabase/functions/admin-login/index.ts` recibe exclusivamente
nombre y PIN, verifica límites/credencial en la RPC y genera un token de canje
Auth mediante `generateLink`. El futuro cliente usará `verifyOtp` con ese token.
Los límites son cinco fallos en ventana móvil de 15 minutos por nombre y por red
global, con bloqueo de 15 minutos desde el quinto. Locks de filas serializan
solicitudes concurrentes. La fecha de login certifica validación de PIN, no el
canje posterior, que es una transacción independiente.

El contrato completo y la guía segura de aprovisionamiento están en
[docs/admin-login-backend.md](docs/admin-login-backend.md). Solo validado localmente,
sin deploy, frontend, rutas ni cambios en checkout. Antes de habilitarlo faltan
identidades Auth, rotación individual y comprobar que el gateway sanea XFF; el
perfil confiable permanece desactivado por defecto. No basta recibir una cabecera
ni el flag `must_change_pin` para autorizar operaciones futuras. La limpieza de
registros por expiración tampoco queda programada en esta fase.

### Rotación de PIN implementada localmente

`2026-09-21-admin-pin-obligatorio.sql` añade `private.change_admin_pin(current_pin,
new_pin)` y un puente público SECURITY INVOKER con exactamente esos argumentos.
La función privada valida UID, sesión no anónima y operador activo, comprueba
bcrypt actual y exige cuatro dígitos nuevos, distintos del actual y del temporal
prohibido. Bloquea filas y actualiza hash coste 12, fecha, flag y auditoría en una
transacción. Cinco fallos/15 minutos bloquean 15 minutos por operador, en estado
privado separado del login. Tablas `admin_pin_limits` y `admin_pin_events` con RLS
y sin permisos de datos cliente. No activa operadores ni modifica la tienda.

`is_active_admin()` se conserva para pertenencia y cambio pendiente;
`private.is_operational_admin()` exige adicionalmente `must_change_pin=false`.
Todas las futuras operaciones deben usar el segundo auxiliar. Esta migración no
concede permisos de pedidos/dashboard ni revoca sesiones Auth existentes.
Pruebas locales verifican rechazos, rollback y cambios/fallos concurrentes.
Contrato, respuestas y riesgos en `docs/admin-login-backend.md`.

### Frontend inicial administrativo (local, 22-09-2026)

Implementadas las rutas `/admin/login`, `/admin/cambiar-pin` y `/admin` con una
entrada lazy y páginas diferidas. Provider y cliente separados: sessionStorage,
clave `sb-andesmarket-admin-auth`, canje inmediato del token sin persistirlo.
La ficha del operador validada bajo RLS determina pertenencia y cambio pendiente;
se relee tras la RPC antes de permitir bienvenida. No hay consultas de pedidos,
operaciones ni enlaces desde la tienda. Checkout, AuthProvider y carrito públicos
permanecen intactos. Chunks admin excluidos del precaché PWA. Pruebas con red
simulada; conexión real y despliegue pendientes. Ver `docs/admin-frontend.md`.

### Operadores iniciales

- Alejandro
- Marianny
- Jorge

Cada operador usará su nombre y, provisionalmente, el PIN temporal acordado fuera del repositorio. Debe obligarse un cambio individual antes de producción o en el primer acceso; compartir permanentemente el mismo PIN reduce la atribución real del historial.

### Solución mínima recomendada

Un PIN de cuatro dígitos tiene solo 10.000 combinaciones. Ni ofuscarlo ni guardar un hash en el frontend lo protege, porque el bundle y todas sus constantes son públicos. Supabase Auth tampoco ofrece directamente un inicio de sesión por nombre y PIN con bloqueo por operador. La solución mínima razonable dentro de Supabase es:

1. Crear un usuario no anónimo de Supabase Auth por operador, con identificador interno no mostrado y credencial aleatoria fuerte que el frontend nunca recibe.
2. Vincularlo por `auth_user_id` a `admin_operators`.
3. Guardar únicamente `pin_hash` con sal adaptativa y aleatoria (por ejemplo `crypt(..., gen_salt('bf'))` de `pgcrypto`) en una tabla sin permisos para `anon` ni `authenticated`.
4. Enviar nombre y PIN por HTTPS a una Supabase Edge Function `admin-login`.
5. La función normaliza el nombre, comprueba bloqueo e intentos con una operación atómica, verifica el hash del PIN y registra éxito o fallo. La comparación y el contador nunca se ejecutan en el navegador.
6. Tras éxito, la función usa `service_role` solo en su entorno secreto para producir un enlace/token de acceso de un solo uso del usuario Auth asociado. El cliente lo canjea con Supabase Auth y recibe una sesión normal, corta y revocable. La función nunca devuelve `service_role`, la credencial aleatoria ni el hash.
7. RLS autoriza el dashboard solo cuando `auth.uid()` corresponde a un `admin_operators.active = true` y la identidad no es anónima. Los clientes anónimos no pasan esa condición.
8. Limitar, como mínimo, a 5 fallos por operador y huella de red en 15 minutos, bloquear temporalmente 15 minutos, responder con un error genérico y registrar los intentos. Los límites exactos deben poder ajustarse sin redeploy del frontend.
9. La sesión administrativa será independiente de la sesión anónima pública, con cliente y clave de almacenamiento distintos. Se mantiene en `sessionStorage` cuando sea viable, expira por inactividad y ofrece cierre explícito. Entrar/salir del dashboard no reemplaza ni cierra la sesión invitada ni modifica `AuthProvider` o el checkout público.

La Edge Function constituye una nueva pieza server-side, pero es más pequeña y segura que inventar autenticación en React. Una alternativa aún más segura y sencilla técnicamente sería usar email/contraseña fuerte o magic link de Supabase Auth, pero no cumple la experiencia solicitada de nombre + PIN.

### Límites reconocidos

- Un PIN de cuatro dígitos sigue siendo una credencial débil ante filtración, observación o uso compartido; hashing y rate limiting reducen, no eliminan, el riesgo.
- El bloqueo basado en IP puede afectar redes compartidas y la IP puede cambiar; debe combinarse con operador, ventana temporal y auditoría.
- La sesión emitida es tan sensible como cualquier sesión administrativa; XSS y dispositivos compartidos siguen siendo riesgos.
- Si no se acepta una Edge Function o un mecanismo servidor equivalente, el acceso por PIN no cumple seguridad razonable y debe sustituirse por el login estándar de Supabase Auth. No es aceptable incluir el PIN temporal, su hash verificable o `service_role` en el bundle.

## 10. Dashboard operativo

### Bandeja

La vista principal prioriza pedidos no cerrados, con filtros por estado y búsqueda por número, nombre o teléfono. Cada fila/tarjeta muestra como mínimo:

- Número `AM-xxxxx` y fecha/hora.
- Estado del pedido.
- Nombre y teléfono.
- Sector.
- Total.
- Método y estado de pago.
- Estado de efectivo cuando aplique.
- Indicador de Speedy solicitado.
- Operador de la última acción.

### Detalle del pedido

Debe mostrar:

- Número, UUID interno, creación y última actualización.
- Estado actual y acciones de transición válidas.
- Cliente: nombre y teléfono snapshot del pedido.
- Sector, dirección, indicaciones y enlace de Google Maps validado como URL HTTPS de dominio permitido o mostrado como texto no ejecutable si no es válido.
- Lista final de productos: nombre snapshot, cantidad, precio unitario y total por línea.
- Subtotal, delivery y total.
- Método/estado de pago y estado del efectivo.
- Cancelación, si existe: motivo, observación, actor y fecha.
- Solicitud de Speedy: fecha y operador.
- Historial cronológico de modificaciones y cambios de estado.

## 11. Modificación de productos y cantidades

- Solo se puede modificar un pedido `nuevo`, `confirmado` o `preparando`.
- El operador puede aumentar/disminuir cantidades o eliminar una línea. Añadir un producto es permitido solo seleccionándolo del catálogo activo; el servidor toma su precio vigente.
- No se permiten cantidades menores que 1, líneas duplicadas del mismo producto ni un pedido sin ítems.
- Cada cambio se envía como el conjunto final deseado o con versión esperada a una RPC transaccional. La RPC bloquea el pedido, verifica `version` para evitar sobrescrituras concurrentes, reemplaza/actualiza líneas, recalcula subtotal y total y aumenta `version`.
- La tarifa de delivery del pedido permanece como snapshot; modificar ítems no reconsulta la tarifa.
- La UI presenta un resumen antes/después y exige confirmación.
- Un pedido `enviado`, `entregado` o `cancelado` es inmutable en el MVP.

## 12. Historial y auditoría

`order_events` es un registro append-only. Como mínimo registra:

- `order_id`, tipo de evento, fecha y `operator_id` cuando la acción es administrativa.
- Estado anterior/nuevo.
- Motivo u observación cuando corresponda.
- JSON `before_data` y `after_data` limitado a campos operativos y líneas afectadas.
- Versión resultante del pedido.

Eventos mínimos: creación, cambio de estado, modificación de ítems, cambio de pago, solicitud de Speedy, efectivo recibido y cancelación. Los clientes solo pueden ver el resultado de creación necesario para su recibo; no pueden leer la auditoría interna. Los operadores pueden leer eventos, pero no actualizarlos ni borrarlos. Las RPC escriben pedido y evento en la misma transacción.

## 13. Cancelación

Motivos cerrados:

- `cliente_cancelo`: Cliente canceló.
- `producto_no_disponible`: Producto no disponible.
- `pago_no_confirmado`: No se pudo confirmar el pago.
- `problema_delivery`: Problema con dirección/delivery.
- `otro`: Otro.

La observación libre es obligatoria cuando el motivo es `otro` y opcional para los demás. Debe tener longitud máxima definida (propuesta: 500 caracteres). Antes de confirmar, si `payment_status = confirmado` o existe cualquier registro operativo de pago/efectivo, la interfaz muestra una advertencia visible y exige una confirmación adicional. La advertencia no ejecuta reembolso ni conciliación; la cancelación conserva los datos y deja constancia del operador.

## 14. Acciones de WhatsApp y Speedy

### Contactar por WhatsApp

- Botón disponible en el detalle, usando provisionalmente `04122636533` normalizado para `wa.me` como `584122636533`.
- Abre un mensaje prellenado que identifica `AM-xxxxx` y al cliente, pero no crea ni modifica datos.
- El operador debe guardar cualquier cambio acordado mediante las acciones del dashboard; el chat no es fuente oficial.
- Nunca se envía un enlace que permita al cliente reconstruir precios, cantidades o total en la base.

### Solicitar Speedy

El botón usa provisionalmente el mismo número, `04122636533`, y genera un mensaje con:

```text
Pedido: AM-xxxxx
Nombre: {nombre}
Teléfono: {teléfono}
Sector: {sector}
Dirección: {dirección}
Google Maps: {enlace o "No indicado"}
Pedido listo para recoger en 10 minutos
```

Antes de abrir WhatsApp, una RPC `mark_speedy_requested` marca atómicamente `speedy_requested_at` y `speedy_requested_by`. Solo se permite para pedidos en un estado operativo válido (propuesta: `preparando`) y si la marca es nula. Si ya existe, no se abre un segundo mensaje como flujo normal y se muestra quién/cuándo lo solicitó. Esta marca impide duplicados desde la aplicación, aunque no puede probar que WhatsApp se haya enviado ni impedir un envío manual fuera del sistema. Si `window.open` falla después de marcar, el dashboard debe permitir copiar/reabrir el mismo mensaje mediante una acción explícita de reintento, sin crear una segunda marca.

## 15. Reportes

Filtros de fecha:

- Hoy.
- Ayer.
- Esta semana, definida de lunes a domingo en `America/Caracas`.
- Rango personalizado inclusivo por fechas locales, convertido de forma explícita a instantes UTC.

Indicadores:

- Productos: desglose por producto final vendido.
- Unidades: suma de cantidades finales.
- Pedidos: cantidad de pedidos.
- Ventas totales: suma de `total`.
- Delivery cobrado: suma de `delivery_fee`.
- Desglose por Pago Móvil, Binance y Efectivo.
- Efectivo pendiente de recibir de Speedy y efectivo recibido.

Reglas:

- Solo cuentan pedidos con `status = entregado`.
- El período usa `delivered_at`, no `created_at`.
- Se usa la versión final persistida de `order_items` y los totales finales del pedido.
- Pedidos cancelados o aún abiertos no afectan ventas.
- El desglose por método debe sumar las ventas entregadas; los estados de pago se presentan aparte para hacer visibles inconsistencias.
- El reporte se obtiene mediante una vista/RPC autorizada para administradores, no descargando todos los pedidos para sumar en React.

## 16. Tasa Bs/$

`exchange_rates` permite registrar manualmente una tasa positiva asociada a una fecha calendario de Venezuela:

- Una tasa vigente por fecha (`rate_date` única).
- Valor `usd_to_ves` decimal positivo, con precisión suficiente (propuesta `numeric(14,4)`).
- Fuente/observación opcional, actor, creación y actualización.
- Solo administradores pueden leer/escribir mediante RLS/RPC.

La tasa es informativa para la operación manual del MVP. No recalcula precios USD, pedidos históricos ni pagos automáticamente. Si más adelante se muestra equivalente en bolívares, el pedido deberá guardar el snapshot de tasa utilizado; eso no forma parte de este MVP salvo que se confirme como necesidad operativa.

## 17. Modelo de datos propuesto

### Tablas nuevas

#### `delivery_sectors`

- `id uuid primary key`, `name text not null`, `delivery_fee numeric(10,2) not null check >= 0`, `active boolean`, `sort_order int`, timestamps.
- `unique (lower(name))` mediante índice único de expresión.
- Lectura pública solo de activos; escritura solo administrativa.

#### `admin_operators`

- `public.admin_operators`: `id uuid primary key`, `auth_user_id uuid unique references auth.users` nullable, `display_name`, `normalized_name` único igual al nombre recortado y en minúsculas, `active`, `must_change_pin`, timestamps y `last_login_at`. No contiene hash. Activar exige vínculo Auth; una FK restrictiva conserva la asociación hasta desvinculación controlada.
- `private.admin_operator_credentials`: `operator_id` PK/FK restrictiva, `pin_hash` bcrypt coste 12, `pin_changed_at`, `created_at`, `updated_at`. Sin acceso frontend ni grants de datos servidor todavía. El trigger actualiza `updated_at`; el futuro cambio de PIN debe actualizar `pin_changed_at` y `must_change_pin` atómicamente.

#### `admin_login_attempts`

- `private.admin_login_attempts`: UUID, operador nullable con FK restrictiva, nombre normalizado, `success`, código cerrado `internal_reason`, `network_hmac` opcional de 32 bytes, `attempted_at`, `created_at` y `expires_at`.
- Índices por nombre/fecha, HMAC/fecha, operador/fecha y expiración. HMAC-SHA256 requiere secreto del servidor; no usar hash simple de una IP ni guardar IP plana. La aplicación no debe guardar PIN u otros secretos en el campo de nombre.
- Retención inicial de 90 días. La segunda fase usa `private.admin_login_limits` para el bloqueo atómico; la limpieza por expiración sigue pendiente. Las tablas no conceden acceso directo a los clientes ni a service_role.

#### `order_events`

- Campos descritos en la sección de auditoría.
- FK restrictiva al pedido y operador; índice `(order_id, created_at)` y `(event_type, created_at)`.
- Append-only: sin políticas de update/delete para roles cliente/admin.

#### `exchange_rates`

- Campos descritos en la sección de tasa.
- `unique(rate_date)`, check de tasa positiva e índice descendente por fecha.

### Columnas nuevas o ajustadas

#### `orders`

- `order_number bigint` respaldado por secuencia, único, no editable; se presenta como `AM-` + mínimo cinco dígitos. No imponer un máximo artificial al superar `99999`.
- `customer_name`, `customer_phone`: snapshots obligatorios.
- `sector_id` FK restrictiva y `sector_name`, `delivery_fee`: snapshots obligatorios.
- `delivery_address` y `google_maps_url` opcionales individualmente, con una regla que exige al menos uno; `delivery_instructions` opcional.
- `subtotal`, `total` con checks no negativos y `total = subtotal + delivery_fee`.
- `status` con el nuevo dominio y default `nuevo`.
- `payment_method` nullable hasta coordinación; check del dominio.
- `payment_status` default `pendiente`; check del dominio.
- `cash_handover_status` default `no_aplica` y check coherente con método.
- `cash_received_at`, `cash_received_by`.
- `cancellation_reason`, `cancellation_note`, `cancelled_at`, `cancelled_by`, con checks coherentes con `status`.
- `speedy_requested_at`, `speedy_requested_by`.
- `delivered_at`, `delivered_by`, `updated_at`, `version int not null default 1`.
- `order_type` se elimina después de migrar datos o queda temporalmente con check exclusivo `delivery`; el estado final deseado no admite `retiro`.
- Índices: `(status, created_at desc)`, `(delivered_at desc) where status='entregado'`, `(payment_method, payment_status)`, `(cash_handover_status) where payment_method='efectivo'`, `(customer_phone)`, y único por `order_number`.

#### `order_items`

- Mantener snapshots de `product_name` y `unit_price`.
- Añadir `line_total numeric(10,2)` calculado/validado como cantidad × precio, o garantizarlo en RPC y reportes.
- `unique(order_id, product_id)` cuando `product_id` no sea nulo; para productos eliminados del catálogo, la línea histórica conserva nombre/precio.
- Índices `(order_id)` y `(product_id)` para detalle/reportes.

#### `customers`

- Conservar vínculo único a `auth_user_id`.
- Quitar la unicidad global de `phone` para no convertir accidentalmente el teléfono en una cuenta obligatoria y permitir sesiones anónimas nuevas. Normalizar teléfono y añadir índice no único si se necesita búsqueda administrativa.

### Restricciones transversales

- Importes `numeric`, nunca coma flotante.
- Textos obligatorios validados con `length(trim(...)) > 0` y longitudes máximas razonables.
- URLs de Google Maps limitadas en longitud y validadas en servidor. Una lista estricta de hosts (`maps.google.com`, `www.google.com`, `maps.app.goo.gl`, según enlaces reales probados) evita esquemas peligrosos; la UI usa `rel="noopener noreferrer"`.
- FKs de auditoría y snapshots evitan que borrar catálogo u operadores destruya historia. Operadores se desactivan, no se borran.

## 18. RLS y autorización

### Clientes

- Catálogo y sectores activos: lectura pública según políticas actuales ajustadas.
- `customers`: cada sesión anónima solo lee/escribe su fila, como hoy.
- `orders` y `order_items`: solo lectura del pedido cuyo cliente pertenece a `auth.uid()`.
- Revocar inserciones directas en `orders` y `order_items`; crear pedidos únicamente mediante la RPC autorizada.
- La RPC comprueba `auth.uid()`, que la identidad sea anónima para el flujo cliente cuando corresponda y que `customer_id` pertenezca a esa identidad.
- Conocer un UUID o número `AM-xxxxx` no concede acceso.

### Administradores

- Función auxiliar estable `is_active_admin()` para pertenencia; operaciones futuras deben exigir `private.is_operational_admin()`, que además comprueba `must_change_pin=false`.
- Políticas de lectura administrativa en pedidos, ítems, eventos, sectores y tasas.
- Mutaciones operativas solo mediante RPCs específicas; evitar políticas generales de `update` sobre pedidos si permiten saltarse transiciones, auditoría o recálculo.
- Productos/categorías continúan gestionándose según la política operativa decidida; si el dashboard no los edita en este MVP, no ampliar permisos.
- Ninguna política usa datos enviados por el cliente para decidir que es administrador.

Todas las funciones `security definer` deben fijar `search_path`, calificar esquemas, revocar ejecución de `public` y conceder solo a los roles necesarios. Las funciones para usuarios con sesión validan `auth.uid()`; la preautenticación de login es la excepción explícita, ejecutable exclusivamente por backend. `service_role` nunca aparece en Vite, React, `.env` pública ni respuestas de red.

## 19. Creación atómica y validación de precios

Implementar una RPC transaccional, por ejemplo `create_delivery_order(payload jsonb)`, con este contrato:

1. Rechaza sesión ausente, cliente ajeno, ausencia simultánea de dirección y Maps, sector inactivo, lista vacía, ids repetidos, cantidades no enteras/positivas o un tamaño de carrito excesivo.
2. Extrae únicamente `product_id` y `quantity`; ignora/rechaza nombres, precios y totales enviados.
3. Consulta y bloquea/lee consistentemente todos los productos solicitados. Exige `active = true` y calcula el precio efectivo a partir de `price`, `discount_type` y `discount_value`, con reglas explícitas de redondeo a dos decimales.
4. Verifica que la cantidad de productos encontrados coincide con la solicitada. La falta de uno aborta todo.
5. Lee la tarifa desde `delivery_sectors`, toma snapshots y calcula subtotal y total con `numeric`.
6. Obtiene el siguiente número, inserta `orders`, inserta todos los ítems e inserta el evento de creación dentro de la misma transacción PostgreSQL.
7. Devuelve solo los campos del recibo permitidos por RLS.

Así se evitan explícitamente:

- **Pedidos sin ítems:** cualquier error provoca rollback de toda la función; además la única vía de creación es la RPC y esta rechaza arrays vacíos. Una restricción diferida/trigger de consistencia al commit puede reforzarlo si se implementa sin bloquear la inserción orden→ítems dentro de la misma transacción.
- **Precios manipulados:** el navegador no suministra el precio autoritativo; la función consulta `products` y aplica el descuento en servidor.
- **Totales manipulados:** subtotal, delivery y total se calculan y persisten en la misma transacción; los valores mostrados en React son solo estimaciones.
- **Pedidos ajenos:** la RPC vincula el pedido al `customers.auth_user_id = auth.uid()` y RLS aplica la misma relación en lecturas de pedido e ítems.

No debe utilizarse una Edge Function con `service_role` para crear pedidos de clientes si la RPC con RLS puede resolverlo; mantener el contexto `auth.uid()` reduce privilegios.

## 20. Migraciones incrementales

La base existente no debe recibir nuevamente `supabase/schema.sql`. Se requieren scripts revisables y repetibles en `supabase/updates/`, aplicados en orden y con respaldo previo:

1. `...-mvp-sectores-y-pedidos.sql`: tablas de sectores, semillas iniciales, secuencia/número, snapshots, importes, nuevos estados y migración de filas existentes. Definir cómo mapear `listo` (recomendado: `preparando`) y cómo tratar pedidos históricos `retiro` antes de imponer delivery exclusivo.
2. `...-mvp-pedidos-atomicos.sql`: revocación de inserts directos, RPC de creación, checks, índices y RLS del cliente.
3. `...-mvp-operadores-y-acceso.sql`: operadores, credenciales separadas, intentos, función de pertenencia y políticas administrativas. La creación de usuarios Auth y secretos de la Edge Function se ejecuta como paso operativo documentado, no con credenciales en SQL versionado.
4. `...-mvp-auditoria-operacion.sql`: eventos, RPCs de transición, modificación, pago, cancelación y Speedy.
5. `...-mvp-reportes-y-tasas.sql`: tasas, vistas/RPCs de reportes e índices finales.
6. Tras validar las migraciones, actualizar `supabase/schema.sql` para que una instalación nueva represente el estado final, sin usarlo sobre producción.

Cada migración debe incluir consultas de prevalidación o abortar con mensaje claro si los datos existentes contradicen una nueva restricción. La fecha/nombre exactos se eligen al implementar para reflejar el día real.

## 21. React: reutilización y ajustes

### Reutilizar

- `Button`, `IconButton`, `Card`, `Badge`, `Field`, `Input`, `Textarea` y `Select` de `shared/components/ui.jsx`.
- `Modal` y `Toast` para confirmaciones, errores y acciones sensibles.
- `BrandLogo`, `AndesPattern`, `ProductImage`, `Header`/patrones visuales y tokens de `src/index.css`.
- `CartProvider` para la experiencia previa al pedido, sin confiar en sus importes como fuente autoritativa.
- `formatPrice` y utilidades de formato, ampliadas solo si necesitan moneda/fecha administrativa.
- Carga diferida y `BrowserRouter` existentes.

### Ajustar

- `App.jsx`: rutas privadas lazy del dashboard y guarda administrativa.
- Sesión administrativa: crear cliente/contexto independiente, manejar errores y cierre/expiración sin modificar `AuthProvider.jsx` ni la sesión invitada pública.
- `CartPage.jsx`: delivery exclusivo, selector de sector sin tarifas, dirección opcional, geolocalización bajo demanda, indicaciones y desglose de importes.
- `CheckoutModal.jsx`/`ProfileForm.jsx`: nombre y teléfono dentro de un flujo coherente, sin convertirlo en registro obligatorio.
- `checkout.js`: consumir la RPC atómica y enviar solo ids/cantidades y datos de delivery.
- `ConfirmationPage.jsx`: recibo estático con `AM-xxxxx`; retirar Realtime y progreso interno.
- `orderStatus.js`: nuevo dominio interno y etiquetas; no compartir estados internos con la confirmación pública.
- Pruebas Playwright y mocks de Supabase: cubrir nuevas RPCs, rutas y autorización sin escrituras reales.

### Componentes nuevos mínimos

- `AdminRoute`/guarda y `AdminLayout`.
- `AdminLoginPage`, `AdminOrdersPage`, `AdminOrderDetailPage`, `AdminReportsPage`, `AdminRatesPage`.
- Piezas pequeñas reutilizables: filtros de pedidos, editor de líneas, historial, resumen de pago y diálogo de cancelación.

No se crea un sistema visual paralelo; se usan tokens, tipografías, radios, espaciado y estados accesibles existentes, con diseño mobile-first y adaptación a escritorio.

## 22. Criterios de aceptación por fase

### Fase 1: contrato seguro de pedidos

- Una llamada válida crea exactamente un pedido con uno o más ítems y evento inicial.
- Forzar un error en ítems deja cero filas nuevas de pedido.
- Alterar precio, nombre, subtotal, delivery o total en la solicitud no altera los valores calculados por Supabase.
- Producto inactivo/inexistente, cantidad inválida o sector inactivo abortan la operación completa.
- Dos sesiones anónimas no pueden leer pedidos entre sí, aunque conozcan UUID o número.
- No existe `service_role`, PIN ni hash verificable en el bundle.

### Fase 2: checkout público

- No aparece ni puede enviarse retiro en tienda.
- El selector muestra los tres nombres de sector sin precios; $1, $2 y $3 aparecen solo en el resumen según la selección.
- Nombre, teléfono y sector son obligatorios. Debe existir dirección escrita o ubicación capturada; indicaciones es opcional.
- La geolocalización se solicita solo al pulsar el botón, informa carga/error/éxito y permite cambiar o quitar la ubicación.
- Se muestran subtotal, delivery y total antes de confirmar, y el recibo muestra los valores autoritativos.
- La confirmación muestra `AM-xxxxx`, no muestra tracking y no abre suscripción Realtime.
- Un error no vacía el carrito.

### Fase 3: acceso y operación

- Solo Alejandro, Marianny y Jorge activos pueden obtener sesión admin por el flujo autorizado.
- Cinco intentos fallidos provocan el bloqueo temporal definido; éxito/fallo queda registrado sin guardar PIN plano.
- Una sesión anónima recibe denegación de RLS en todas las consultas/mutaciones administrativas.
- Cada transición, edición, pago, cancelación, Speedy y efectivo recibido queda atribuida.
- Ediciones recalculan totales, rechazan conflictos de versión y nunca dejan cero ítems.
- Cancelar exige motivo; `otro` exige observación y un pago registrado dispara advertencia adicional.
- Speedy solo puede marcarse una vez; el mensaje contiene todos los campos exigidos y la frase exacta.

### Fase 4: reportes y tasa

- Hoy, ayer, semana y rango respetan `America/Caracas` en cambios de día.
- Solo `entregado` y `delivered_at` alimentan indicadores.
- Productos/unidades/totales reflejan la última versión del pedido.
- Ventas, delivery y desglose por método concilian con pedidos de prueba conocidos.
- Efectivo pendiente y recibido aparecen separados.
- Solo administradores gestionan una tasa positiva única por fecha.

### Fase 5: verificación final

- Flujo completo probado en viewport móvil y escritorio.
- Pruebas unitarias de cálculos/normalización y E2E de cliente/admin verdes.
- Pruebas SQL de transacción, constraints y RLS verdes en un proyecto aislado.
- `npm run lint`, `npm run test:unit`, `npm run test:e2e` y `npm run build` terminan correctamente.
- Se prueba un pedido real controlado, solicitud de Speedy, entrega, reporte y cancelación con pago advertido.
- Variables/secretos y configuración de Edge Function están verificados en staging/producción sin registrarlos en Git.

## 23. Riesgos técnicos y operativos

| Riesgo | Impacto | Mitigación MVP |
|---|---|---|
| PIN de cuatro dígitos compartido o adivinado | Acceso administrativo indebido. | Hash server-side, límite/bloqueo, sesiones cortas, auditoría y cambio individual antes de producción. |
| XSS o dispositivo compartido | Robo de sesión admin. | Evitar HTML no confiable, `sessionStorage`, expiración, logout y CSP cuando sea posible. |
| RPC `security definer` mal configurada | Escalada o fuga entre clientes. | `search_path` fijo, permisos mínimos y pruebas negativas de RLS. |
| Migración de pedidos históricos con retiro/`listo` | Constraints imposibles o historia alterada. | Preauditoría, mapeo documentado y respaldo; no borrar filas. |
| Concurrencia entre operadores | Cambios perdidos o doble Speedy. | Bloqueo de fila, columna `version` e idempotencia atómica. |
| WhatsApp no confirma envío | Marca puede existir sin mensaje entregado. | Mostrar estado y permitir reabrir/copiar el mismo mensaje sin duplicar marca. |
| Tarifa/precio cambia durante checkout | Diferencia entre estimación y cobro. | Autoridad en RPC, snapshots y aviso claro antes/reintento. |
| Teléfono único actual | Cliente recurrente bloqueado tras perder sesión anónima. | Eliminar unicidad global y tratar teléfono como dato de contacto. |
| Reportes por zona horaria incorrecta | Totales diarios erróneos. | Basar rangos en `America/Caracas`, almacenar timestamps UTC y probar bordes. |
| Operador marca entregado sin pago confirmado | Reporte comercial ambiguo. | Advertencia/validación operativa y desglose visible de estado de pago; definir si se bloquea antes de producción. |
| Sin inventario automático | Venta de producto agotado. | Revisión y edición manual antes de confirmar/preparar; mantenerlo explícitamente fuera de alcance. |
| Dependencia de Edge Function | Caída impide login admin. | Supervisión básica, errores claros y procedimiento operativo de recuperación en Supabase Dashboard. |

## 24. Orden recomendado de implementación

1. Respaldar y auditar datos existentes: estados, retiros, teléfonos duplicables, pedidos sin ítems y descuentos.
2. Escribir y probar la migración de sectores, snapshots, importes, estados y numeración en un proyecto Supabase aislado.
3. Implementar la RPC atómica de creación, revocar inserts directos y probar manipulación, rollback y aislamiento RLS.
4. Adaptar checkout y confirmación pública; eliminar retiro y tracking visible.
5. Crear identidades Auth de operadores, tablas de credenciales/intentos, Edge Function de login y políticas administrativas.
6. Implementar shell/guarda del dashboard y bandeja/detalle de solo lectura.
7. Implementar RPCs operativas: estados, edición versionada, pagos, cancelación, Speedy y efectivo, todas con auditoría.
8. Construir las acciones del dashboard y verificar accesibilidad, mobile y concurrencia.
9. Implementar tasas y reportes server-side sobre pedidos entregados/versiones finales.
10. Actualizar esquema base, README y AGENTS.md para reflejar la arquitectura ya implementada.
11. Completar pruebas unitarias, SQL/RLS, E2E y manuales con datos aislados.
12. Configurar secretos/variables, desplegar primero a un entorno de prueba, ejecutar el punto de control operativo y luego publicar.

Las fases de UI no deben adelantarse al contrato de datos y autorización: una interfaz privada sin RLS, o un checkout que todavía acepta precios del navegador, no es un incremento publicable.

## 25. Comandos previstos de verificación

```bash
npm run lint
npm run test:unit
npm run test:e2e
npm run build
```

Las migraciones y pruebas SQL deben ejecutarse primero contra un proyecto Supabase de prueba o una base desechable. No se vuelve a ejecutar `supabase/schema.sql` sobre la base existente.

## 26. Preguntas bloqueantes antes de implementar

1. **Pedidos históricos:** ¿existen pedidos reales con `order_type = retiro` o `status = listo`, y cómo deben conservarse/reportarse? Se recomienda mantenerlos como historia y excluirlos del nuevo flujo, mapeando `listo` a `preparando` solo si el negocio confirma equivalencia.
2. **Estado entregado vs. pago:** ¿se debe impedir marcar `entregado` cuando `payment_status != confirmado`, o solo advertir? La especificación no debe imponer una regla contable no confirmada.
3. **PIN inicial:** aprobado como temporal; los tres operadores quedan inactivos y con cambio obligatorio. La rotación está implementada y probada localmente; falta aplicarla y verificarla en el entorno autorizado antes de habilitar operaciones administrativas.
4. **Cuenta Auth de operadores:** se necesitan identificadores internos controlados (normalmente emails no públicos) para crear las tres identidades de Supabase Auth; deben definirse fuera del repositorio.

Estas preguntas no impiden diseñar las migraciones en un entorno aislado, pero sí bloquean aplicar la migración a producción y habilitar el dashboard real.
