# Plan de implementación del MVP operativo

## Objetivo

Convertir la tienda pública existente en un flujo de compra exclusivamente a domicilio, seguro y persistente, y después añadir un panel administrativo responsive para operar pedidos, pagos, Speedy y reportes.

## Decisiones confirmadas

- El cliente compra como invitado; la sesión anónima se conserva solo como detalle técnico.
- El pedido oficial se crea en Supabase, no en WhatsApp.
- El precio, delivery y total se validan en una operación confiable de Supabase.
- La operación es exclusivamente delivery; se elimina retiro en tienda.
- Los sectores iniciales son La Pedregosa ($1), Belenzate ($2) y Campo Claro ($3); el selector público muestra solo sus nombres y reserva las tarifas para el resumen.
- La ubicación se captura bajo demanda mediante la geolocalización del navegador y se guarda como enlace de Google Maps, sin campos de coordenadas nuevos.
- La dirección escrita y la ubicación son alternativas: el pedido exige al menos una.
- El dashboard tendrá tres operadores: Alejandro, Marianny y Jorge.
- El acceso será por nombre y PIN de cuatro dígitos para mantener el MVP simple. El PIN no se expondrá en el bundle ni se guardará en texto plano; el sistema limitará intentos y registrará qué operador actuó.
- El número provisional de Andes Market y Speedy será 04122636533.
- Los métodos de pago son Pago Móvil, Binance y Efectivo. El trabajador confirmará manualmente el método y estado después de coordinar por WhatsApp.
- Los estados son Nuevo, Confirmado, Preparando, Enviado, Entregado y Cancelado.
- El tracking visible y el Realtime para clientes quedan desactivados del MVP.

## Orden de trabajo

### Fase 0: cerrar decisiones críticas

- [x] Confirmar delivery exclusivo frente a retiro en tienda.
- [x] Confirmar estados: nuevo, confirmado, preparando, enviado, entregado y cancelado.
- [x] Definir sectores, tarifas, número de Speedy y usuarios administrativos.
- [x] Definir métodos y estados de pago, incluyendo efectivo pendiente/recibido.

### Fase 1: contrato seguro de pedidos

- [x] Diseñar migración incremental de Supabase para delivery, importes, número visible, pagos, cancelaciones, Speedy y auditoría.
- [x] Implementar creación atómica del pedido y validación de precios/productos.
- [ ] Definir RLS y autenticación administrativa sin exponer `service_role`.
- [ ] Probar aislamiento administrativo; el aislamiento entre clientes ya está cubierto por el arnés SQL.

### Punto de control de seguridad

- [x] Un pedido no puede quedar sin ítems si falla una escritura.
- [x] El cliente no puede cambiar precios ni totales desde el navegador.
- [x] Un usuario anónimo no puede leer ni modificar pedidos ajenos.
- [ ] No hay secretos administrativos en el bundle público.

### Fase 2: checkout público mínimo

- [x] Añadir sector y tarifa calculada.
- [x] Añadir dirección opcional, indicaciones y captura de ubicación; exigir dirección o Maps.
- [x] Mostrar subtotal, delivery y total antes de confirmar.
- [x] Mostrar confirmación con número `AM-xxxxx` y mensaje de coordinación por WhatsApp.
- [x] Mantener el diseño y componentes existentes siempre que sea posible.

### Fase 3: operación de bodega

- [ ] Crear ruta y layout privado del dashboard.
- [ ] Mostrar bandeja y detalle completo del pedido.
- [ ] Registrar contacto por WhatsApp y método/estado de pago.
- [ ] Modificar cantidades o eliminar productos agotados.
- [ ] Registrar historial de modificaciones y cancelaciones.
- [ ] Solicitar Speedy con mensaje precargado y marca anti-duplicados.

### Fase 4: reportes

- [ ] Reportar hoy, ayer, semana y rango personalizado.
- [ ] Contar únicamente pedidos entregados y usar la versión final.
- [ ] Mostrar productos, unidades, pedidos, ventas, delivery y pagos.
- [ ] Mostrar efectivo pendiente y recibido de Speedy.
- [ ] Registrar la tasa Bs/$ diaria.

### Punto de control de lanzamiento

- [ ] Flujo cliente completo probado en móvil.
- [ ] Flujo de bodega probado con pedido real de prueba.
- [ ] Cancelación y modificación verificadas.
- [ ] RLS y acceso administrativo verificados.
- [ ] Lint, build, pruebas unitarias y E2E verdes.
- [ ] Variables de entorno y despliegue revisados antes de producción.

## Dependencias

La Fase 1 debe terminar antes de construir el dashboard. La Fase 2 depende del contrato de pedido. La Fase 4 depende de que las modificaciones, cancelaciones y estados finales queden registrados de forma confiable.

## Riesgos principales

| Riesgo | Mitigación |
|---|---|
| Precio o total manipulado en el navegador | Validación y cálculo en Supabase |
| Pedido creado sin ítems | Operación atómica |
| Dashboard con permisos excesivos | Auth administrativa y RLS explícito |
| Reportes incorrectos | Consultar solo pedidos entregados y versión final |
| Alcance crece antes de validar ventas | No construir stock automático, tracking público ni pagos online |
