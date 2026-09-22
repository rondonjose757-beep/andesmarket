# Acceso administrativo — frontend inicial

Implementado localmente el 22-09-2026. Sin despliegue, aprovisionamiento ni llamadas
al proyecto remoto. No incluye consultas de pedidos, pagos, reportes o bodega.

## Rutas y sesiones

`App.jsx` incorpora una única entrada lazy `/admin/*`. `AdminRoutes` monta el
provider exclusivo y carga con `React.lazy` login, cambio de PIN y bienvenida.
Las rutas desconocidas pasan por la misma guarda; no hay enlaces públicos al admin.

El cliente administrativo usa la URL y clave pública existentes, **no service_role**.
Su almacenamiento es `sessionStorage`, clave `sb-andesmarket-admin-auth`, distinto
de `sb-andesmarket-auth` de la tienda. No hay fallback a localStorage. AuthProvider,
cliente público y CartProvider no se modifican y permanecen montados como antes.

Los cambios Auth se escuchan sin ejecutar consultas dentro del callback; se relee
la sesión almacenada en esta pestaña. Esto evita adoptar un evento de otra pestaña
del BroadcastChannel del SDK. Se valida con `getUser()` y SELECT de la ficha propia
bajo RLS; no se confía en metadata ni en el flag incluido en la respuesta del login.
Se revalida al recuperar foco. Fallos de verificación bloquean el contenido y ofrecen
reintento y cierre; no se reutiliza una ficha previa ante un error.

`sessionStorage` es accesible a JavaScript y no sustituye protección frente a XSS.
Al duplicar una pestaña, el navegador puede copiar su almacenamiento inicial;
no se promete aislamiento criptográfico entre pestañas del mismo origen.

## Login y cambio obligatorio

Formulario en español, PIN password de cuatro dígitos. Envía exactamente
`{nombre, pin}` a `/functions/v1/admin-login`, sin cookies ni JWT de la tienda.
El token de canje se usa inmediatamente con `adminClient.auth.verifyOtp` de tipo
email; no se incorpora al estado React, URL o almacenamiento. La sesión resultante
sí se guarda por el SDK en sessionStorage. Los formularios se limpian al enviar.
Los gestores de contraseñas del navegador pueden ignorar autocomplete=off; la app
no implementa persistencia de PIN. No hay console.log ni errores SDK expuestos.

Una sesión anónima o una ficha ausente/inactiva se elimina del cliente admin.
Si `must_change_pin=true`, solo se permite `/admin/cambiar-pin`; no se carga la
página de bienvenida. La RPC `change_admin_pin` recibe únicamente current_pin y
new_pin. La confirmación es local, nunca se envía. El formulario revisa tanto
`error` como `data.success` y `data.outcome`: un bloqueo SQL no es HTTP 429.

Tras éxito se relee la ficha; solo `must_change_pin=false` habilita `/admin`.
No hay recargas de window.location ni actualizaciones optimistas de autorización.
La guarda es UX, no seguridad de base de datos: todas las futuras operaciones
deben exigir `private.is_operational_admin()` en SQL/RLS.

Logout llama `signOut({scope:'local'})` exclusivamente en el cliente administrativo
y elimina solo sus claves sessionStorage. Si no puede revocar en servidor, limpia
igual esta pestaña; el JWT emitido puede seguir válido hasta caducar. No toca
localStorage, carrito ni sesión invitada. No se cierra la sesión al navegar a tienda.

## Build y PWA

Vite coloca cada chunk con módulos admin en `assets/admin/`. Workbox los excluye
del precaché. El SDK y las primitivas compartidas pueden estar en chunks comunes
porque ya pertenecen a la tienda; no se duplican. Las clases Tailwind usadas por
admin se incluyen en la hoja común, no los componentes completos en el entry JS.

Después de `npm run build`, ejecutar:

```sh
node --test tests/build/admin-bundle.test.js
```

Comprueba el grafo de imports inicial, entradas dinámicas, HTML y service worker
generados. El admin requiere conexión para cargar sus chunks por primera vez y
para verificar sesión. No hay caché de respuestas Auth ni datos administrativos.

## Verificación y conexión real pendiente

Unitarias de validación, pertenencia y contrato de canje con fetch simulado. E2E
con identidades sintéticas: aislamiento, errores, PIN pendiente, RPC, logout,
otra pestaña, teclado, responsive y carga diferida. Nunca usar estos fixtures
contra Supabase real ni registrar sesiones reales en trazas Playwright.

Pendientes para operación real: desplegar Edge Function, verificar gateway/HMAC,
aprovisionar operadores y activarlos explícitamente, revisar revocación/expiración
y logs de plataforma. Las migraciones se reportaron aplicadas por el propietario;
esta tarea no consulta el remoto. CORS solo permite https://andesmarket.app y
http://localhost:5173: previews Vercel y 127.0.0.1 no están permitidos. Las pruebas
usan el puerto 5178 con red simulada; no certifican el CORS real ni el gateway.

Fuentes: [verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp),
[signOut](https://supabase.com/docs/reference/javascript/auth-signout),
[eventos Auth](https://supabase.com/docs/reference/javascript/auth-onauthstatechange),
[precaché PWA](https://vite-pwa-org.netlify.app/guide/static-assets.html).
