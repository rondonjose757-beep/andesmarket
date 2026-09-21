# Backend de acceso administrativo — login y rotación de PIN

Implementado localmente el 21-09-2026. No desplegado. La aplicación de la migración
base del 20-09 fue confirmada por el propietario; esta fase no consulta el remoto.
No hay pantalla, cliente Auth administrativo, provider, ruta `/admin` ni cambios
en la tienda. La implementación requiere `pgcrypto` y la base de operadores previa.

## Contrato HTTP

`POST /functions/v1/admin-login`, con `Content-Type: application/json` (opcional
`charset=utf-8`). Cuerpo JSON con exactamente `nombre` y `pin`, ambos strings.
Nombre: recortado, convertido a minúsculas, 1–100 caracteres, letras españolas y
espacios simples entre palabras. PIN: 4–12 dígitos, sin recorte ni conversión a
número. El cuerpo completo admite hasta 1024 bytes, incluso sin Content-Length;
la lectura tiene un plazo de 5 segundos y no admite Content-Encoding.

Solo admite Origin `https://andesmarket.app` o `http://localhost:5173`.
`localhost:3000` no es necesario para Vite; su presencia en la plantilla de Auth
no justifica abrir CORS. Rechaza Origin ausente, `null` y otros orígenes. OPTIONS
se reserva al preflight de POST con content-type/apikey/authorization/x-client-info.
CORS no autentica y un cliente no navegador puede falsificar Origin: el control
real son el PIN, el vínculo Auth y los límites del servidor.

Respuesta 200, únicamente:

```json
{"token_hash":"<token de canje de un solo uso>","type":"email","must_change_pin":true}
```

`token_hash` es un token de canje **sensible**, no el hash bcrypt del PIN. Nunca
se debe guardar en logs, URL, analytics o almacenamiento persistente. La respuesta
no contiene email, `action_link`, `email_otp`, ficha de usuario, PIN, hash bcrypt,
service role ni refresh token. Todas las respuestas usan `Cache-Control: no-store`.

| HTTP | Situación | Cuerpo |
|---|---|---|
| 401 | Nombre inexistente, PIN incorrecto u operador inactivo | `{"error":"No se pudo iniciar sesión."}` |
| 429 | Quinto fallo o bloqueo vigente | Mismo cuerpo, `Retry-After: 900` |
| 503 | Configuración, provisión o servicio Auth no disponible | Mismo cuerpo, sin detalle interno |
| 400 / 408 / 413 / 415 | JSON/validación, lectura lenta, tamaño o tipo | `{"error":"Solicitud inválida."}` |
| 403 / 405 | Origin/preflight o método rechazado | Mensaje genérico de login |
| 204 | Preflight permitido | Sin cuerpo |

Una instalación sin ningún operador activo con vínculo y credencial devuelve
503 para **cualquier nombre**, hasta alcanzar el bloqueo. Así el error de falta
de aprovisionamiento no distingue identidades. Los fallos del SDK se descartan
sin devolver ni registrar el objeto de error.

## SQL y atomicidad

Migración manual: `supabase/updates/2026-09-21-admin-login-atomico.sql`.

- `private.admin_login_limits`: estado por nombre y huella, cinco fechas de
  fallos como máximo, `blocked_until`, `updated_at`. RLS activo y ningún permiso
  de tabla para anon/authenticated/service_role.
- `private.attempt_admin_login(text,text,text)`: definer, `search_path = ''`,
  ejecutable solo por service_role y el propietario. No exige UID porque es
  **preautenticación**: la ACL de ejecución es su frontera de confianza.
- `public.admin_login_attempt(text,text,text)`: puente RPC invoker, misma firma
  y ACL exclusiva de backend. Permite usar PostgREST sin exponer `private` ni
  añadir una contraseña de conexión PostgreSQL a la Edge Function.

Los argumentos son `p_normalized_name`, `p_pin`, `p_network_fingerprint` (HMAC
hexadecimal de 64 caracteres). El SQL vuelve a validar y normalizar. Resultado:
`success`, `operator_id`, `auth_user_id`, `must_change_pin`, `outcome`. Los ids y
el flag son nulos en fallos. `outcome` solo distingue `ok`, `denied`,
`rate_limited`, `unavailable` para traducir el estado HTTP; no devuelve motivos
internos ni datos de credenciales.

Se bloquea primero la fila de red y luego la de nombre, también si el nombre no
existe. Con los locks adquiridos se obtiene la hora y se comprueba el bloqueo.
Se consulta/bloquea operador y credencial, se verifica bcrypt coste 12 y se
registra el resultado en la misma transacción. Para un nombre sin hash se hace
una operación bcrypt equivalente con sal aleatoria, sin almacenar esa salida.
El esquema real de pgcrypto se resuelve desde `pg_extension`, no se presupone
que sea public. El PIN se pasa como parámetro ligado, nunca concatenado a SQL.

Cada dimensión permite cinco fallos en una ventana móvil de 15 minutos. El quinto
fallo inicia un bloqueo de 15 minutos completos y devuelve 429; los siguientes
se registran como `rate_limited` sin verificar el PIN ni prolongar el bloqueo.
El nombre se limita entre todas las redes y la red entre todos los nombres.
Un éxito no borra fallos anteriores. No hay contadores por instancia Edge.

`last_login_at` y el evento `success` significan **PIN validado**. No certifican
el posterior canje Auth: Postgres, generateLink y verifyOtp son transacciones
separadas. Si Auth falla después de validar el PIN, se devuelve 503; no se
reclasifica el evento ni se promete atomicidad distribuida. Una futura auditoría
de sesiones debe basarse en Auth, no inferirse de esta fecha.

Requests HTTP malformados se rechazan antes de intentar autenticar y no guardan
su cuerpo. Los intentos SQL inválidos guardan un nombre centinela y código
cerrado; nunca copian una IP o PIN inválido al registro.

## Huella de red y secretos

Variables del runtime, nunca VITE_ ni archivos del frontend:

| Nombre | Uso |
|---|---|
| `SUPABASE_URL` | URL del proyecto, suministrada por Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave backend predeterminada de Supabase; solo cliente servidor |
| `ADMIN_LOGIN_HMAC_SECRET` | 32 bytes criptográficamente aleatorios, codificados como 64 caracteres hex |
| `ADMIN_LOGIN_TRUSTED_PROXY` | Perfil `supabase-single-xff`, solo después de verificar el gateway |
| `DENO_DEPLOYMENT_ID` | Marcador automático del runtime hospedado, no proporcionado por el request |

Configurar secretos mediante el Dashboard de Edge Functions o el gestor de
secretos aprobado. No pegarlos en comandos guardados en historial, capturas,
documentación, `.env` de Vite ni respuestas de soporte. Generar la clave HMAC en
un gestor seguro. No rotarla durante una ventana de bloqueo sin una estrategia:
cambiarla divide los contadores de red antiguos y nuevos; el límite por nombre
permanece, pero la rotación necesita una ventana de mantenimiento o doble clave.

**Bloqueo de activación:** la documentación oficial confirma que Supabase llena
X-Forwarded-For, pero no ofrece un contrato de saneamiento suficiente para todos
los gateways. El perfil se deja sin configurar por defecto. Antes de activarlo,
el responsable debe comprobar/documentar que la ruta hospedada siempre elimina
o sobrescribe el valor enviado por el cliente con una única IP real y que no
existe una ruta directa que conserve cabeceras arbitrarias. También probar XFF
falso/duplicado y acceso por dominios alternativos en un entorno autorizado.
Si no se demuestra esa propiedad, no habilitar este perfil: hace falta un proxy
con identidad de origen autenticada y un adaptador revisado. No se ha hecho esa
verificación remota en esta tarea.

El código exige perfil confirmado y marcador de deployment, rechaza XFF ausente,
múltiple o inválido, no elige el primer elemento y no usa x-real-ip,
cf-connecting-ip ni dirección enviada en JSON. Canoniza IPv4/IPv6 (incluidas
IPv4 mapeadas en IPv6) y calcula HMAC-SHA256 con separación de dominio. Solo
el HMAC llega a PostgreSQL. En local directo, falla cerrado; las pruebas inyectan
configuración y cabeceras sintéticas sin debilitar el código de producción.

## Aprovisionamiento futuro (no ejecutado)

1. Definir con el propietario tres emails **reales y controlados**, uno por
   Alejandro, Marianny y Jorge, independientes de las sesiones invitadas. No
   usar emails ficticios, un email compartido ni el PIN como contraseña Auth.
2. Crear cada identidad desde Auth Dashboard o un proceso servidor controlado
   con `auth.admin.createUser({ email, password, email_confirm: true })`.
   `password` debe ser aleatoria y fuerte, recibida de un gestor seguro; usar
   `email_confirm: true` solo tras comprobar la propiedad del buzón. No colocar
   flags de autorización en `user_metadata`. No ejecutar createUser desde login.
3. Registrar el UUID devuelto y verificarlo con `auth.admin.getUserById(id)`:
   identidad existente, no anónima, email confirmado. La función de login no
   aprovisiona identidades automáticamente ni inventa UUIDs.
4. Con conexión administrativa segura y parámetros ligados, iniciar transacción,
   bloquear la ficha por `normalized_name`, comprobar que siga sin asociación y
   vincular el UUID real. Mantener `active = false` durante el aprovisionamiento.
5. Obtener el PIN temporal aprobado por un canal seguro. Calcular **en un proceso
   servidor controlado** un bcrypt de coste 12 con sal aleatoria individual por
   operador, y persistir solo el hash en `private.admin_operator_credentials`.
   Alternativamente, en una conexión PostgreSQL segura usar
   `<esquema_pgcrypto>.crypt($1, <esquema_pgcrypto>.gen_salt('bf', 12))` con parámetro
   ligado. No usar SQL con PIN literal, SQL Editor que conserve consultas,
   argumentos de shell, salida de consola o archivos de producción con el PIN.
   `operator_id` debe provenir de la ficha bloqueada; actualizar `pin_changed_at`.
6. Mantener `must_change_pin = true` hasta completar la RPC de rotación descrita
   debajo. La nueva migración está probada localmente, no aplicada al remoto por
   este trabajo. Las futuras RPC/RLS operativas deben exigir
   `private.is_operational_admin()`; una guarda React no basta. Actualmente un
   operador activo solo puede leer su ficha y cambiar su PIN, no operar pedidos.
   Los tres operadores permanecen inactivos; la activación es un paso operativo
   explícito posterior al aprovisionamiento y verificación del entorno.
7. Activar únicamente tras verificar identidad, hash, rotación y configuración.
   No cambiar credenciales, emails ni asociaciones durante emisión de links.
   `generateLink` puede crear una identidad si su email deja de existir entre
   comprobaciones; el código rechaza un id distinto, pero no elimina cuentas
   automáticamente. Esa carrera requiere coordinación operativa.

Antes de usar secretos reales, revisar la configuración de logs de plataforma,
PostgREST y PostgreSQL: ningún middleware debe registrar body/Authorization,
SQL con literales, bind parameters ni respuestas Auth. Desactivar captura de
parámetros de sentencias y errores para estas llamadas (`log_parameter_max_length`
y `log_parameter_max_length_on_error` en 0 donde corresponda), así como captura
de parámetros por auditoría. No cambiar globalmente la seguridad de la tienda.
La aplicación no usa console.log ni devuelve errores internos del SDK.

## Canje de sesión y siguientes pasos

El SDK está fijado a `npm:@supabase/supabase-js@2.112.4`, la versión instalada en
el proyecto. La Edge Function usa un cliente sin persistencia, auto-refresh ni
sesión del visitante. Consulta getUserById y luego genera
`auth.admin.generateLink({ type: 'magiclink', email })`. Comprueba el mismo UUID
en la respuesta y extrae únicamente `properties.hashed_token`. No envía email.

El futuro cliente administrativo, independiente del cliente público, hará:

```js
const { data, error } = await adminClient.auth.verifyOtp({
  token_hash: response.token_hash,
  type: 'email',
})
```

El canje devuelve `data.session` y `data.user`; Supabase aplica consumo/expiración
del OTP. La sesión Auth estándar sí contiene la identidad del propio operador,
incluido su email; no se promete ocultárselo dentro del JWT. Lo que este endpoint
evita es exponer el email interno en su respuesta de login. Nunca compartir
la clave de almacenamiento Auth con la sesión anónima.

Pendientes antes de publicar: verificar runtime Deno y flujo Auth real en un
entorno autorizado, gateway/IP confiable, aprovisionamiento, aplicar/probar la rotación de PIN,
duración/revocación de sesiones y OTP (no cambiar globalmente parámetros Auth
del proyecto sin evaluar la tienda), y política de recuperación. El acceso al
buzón/control de Auth también permite autenticación por mecanismos estándar;
proteger esas identidades y considerar MFA antes de ampliar permisos.

Programar la limpieza de intentos por `expires_at` (90 días) en una fase operativa.
Para límites, solo retirar filas con `updated_at` anterior a la retención y sin
bloqueo vigente, usando locks para no borrar filas usadas por un login. El
bloqueo global de cinco fallos puede afectar operadores que compartan red;
no es protección completa frente a denegación de servicio distribuida.

## Verificación local

### Rotación obligatoria (implementada solo localmente)

Aplicar manualmente `2026-09-21-admin-pin-obligatorio.sql` después de la migración
de login. No activa operadores, no modifica `is_active_admin()` y no concede
permisos de pedidos/dashboard. No requiere otra Edge Function ni secretos.

Contrato del futuro cliente administrativo independiente:

```js
const { data, error } = await adminClient.rpc('change_admin_pin', {
  current_pin: pinActual,
  new_pin: pinNuevo,
})
```

Exactamente dos argumentos text, sin id de operador ni flags. Usar POST sobre
HTTPS con el JWT del operador; nunca service_role ni el cliente público invitado.
El puente `public.change_admin_pin` es SECURITY INVOKER. La implementación
`private.change_admin_pin` es SECURITY DEFINER con search_path vacío; ambas
revocan ejecución de PUBLIC/anon/service_role y conceden a authenticated.
El rol authenticated no basta: UID, claim firmado booleano `is_anonymous=false`
y asociación activa se verifican dentro de la función privada, bajo lock.

Devuelve solo `{success: boolean, outcome: string}`. Outcomes: `ok`, `denied`,
`invalid_new_pin`, `rate_limited`. Los rechazos esperados son resultados de RPC,
no errores SQL ni estados HTTP 429: el futuro cliente debe revisar `data.success`
y `data.outcome`, además de `error`. No lanzar excepciones tras un rechazo dentro
de una transacción llamadora: hacerlo revertiría sus contadores. Los clientes
Data API no tienen una RPC de transacciones arbitrarias ni conexión SQL directa.

Verifica PIN actual (4–12 dígitos, por compatibilidad con login), exige nuevo PIN
de exactamente cuatro dígitos ASCII, distinto al actual y al temporal prohibido.
El literal de la lista de prohibición en SQL es una regla pública de validación,
no aprovisiona ni almacena una credencial; los fixtures de pruebas son sintéticos.
Bcrypt usa coste 12 y sal nueva, con el esquema de pgcrypto resuelto dinámicamente.

Bloquea operador, credencial y contador en ese orden. Verifica el hash vigente
después de esperar y actualiza hash, `pin_changed_at`, `must_change_pin=false`
y auditoría en una transacción. Dos cambios concurrentes con el mismo PIN anterior
solo permiten un éxito; el segundo verifica contra el hash nuevo y falla.

`private.admin_pin_limits` mantiene cinco fallos de PIN actual en ventana móvil
de 15 minutos por operador; el quinto devuelve `rate_limited` e inicia 15 minutos
de bloqueo. Durante el bloqueo no verifica PIN ni extiende el plazo. Los éxitos
no borran fallos. PIN nuevo inválido con PIN actual correcto no incrementa fallos.
El contador es independiente del login y no depende de IP ni instancias Edge.

`private.admin_pin_events` registra únicamente id, operator_id, outcome,
occurred_at y expires_at (90 días). Registra resultados para operadores activos;
rechazos por identidad ausente/inactiva/anónima no crean eventos. RLS activo en
ambas tablas, sin políticas permisivas ni acceso directo cliente/service_role.
No registra PIN, hashes, tokens o IP. La limpieza por expiración sigue pendiente.

`private.is_active_admin()` reconoce pertenencia y permite leer la ficha propia
aun con cambio pendiente. `private.is_operational_admin()` además exige
`must_change_pin=false`. Usar este último dentro de todas las futuras RPC/RLS
operativas; crearlo no concede autorización sobre otras tablas automáticamente.

La rotación no revoca JWT, refresh tokens ni tokens de canje emitidos. Una sesión
existente de la misma identidad podrá pasar el auxiliar operacional tras el cambio.
La estrategia de revocación y recuperación requiere una fase explícita antes de
ampliar permisos. Revisar logs de parámetros también en PostgREST/PostgreSQL.

`admin-pin.sql` prueba validaciones, permisos, pertenencia, rollback ante fallo
de auditoría, expiración y concurrencia real (dos cambios y ocho fallos). Todos
los operadores vuelven a quedar inactivos/sin vínculo al finalizar los fixtures.
Las unitarias Node verifican el contrato RPC con SDK/fetch simulado y restricciones
estructurales de la migración; no sustituyen las pruebas de comportamiento SQL.

`npm run test:unit` ejecuta las validaciones/handler en Node y prueba los contratos
generateLink/verifyOtp del SDK real con fetch simulado; no emite tokens reales.
`supabase/tests/mvp-pedidos.sql` incluye `admin-login.sql`, instala ambas fases,
prueba éxitos/fallos/RLS/bloqueo/expiración y dos tandas de ocho conexiones mediante
dblink. dblink se instala solo en la base desechable del arnés y usa el socket
local; no es dependencia de producción. Luego corre todas las regresiones del
checkout público. Deno y Auth real no se ejecutaron contra Supabase remoto.

## Fuentes oficiales revisadas

- [generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink)
- [verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp)
- [createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [getUserById](https://supabase.com/docs/reference/javascript/auth-admin-getuserbyid)
- [Seguridad de Edge Functions](https://supabase.com/docs/guides/functions/auth)
- [Secretos del runtime](https://supabase.com/docs/guides/functions/secrets)
- [Respuesta del equipo sobre X-Forwarded-For](https://github.com/orgs/supabase/discussions/7884)
- [Logs y parámetros de PostgreSQL 17](https://www.postgresql.org/docs/17/runtime-config-logging.html)
- [Bloqueos de filas PostgreSQL 17](https://www.postgresql.org/docs/17/explicit-locking.html)
- [pgcrypto: crypt y gen_salt](https://www.postgresql.org/docs/17/pgcrypto.html)
- [Seguridad y privilegios de funciones Supabase](https://supabase.com/docs/guides/database/functions)

Contratos contrastados además con `node_modules/@supabase/auth-js/src/lib/types.ts`,
`GoTrueAdminApi.ts`, `GoTrueClient.ts` y los transformadores de respuesta del SDK.
