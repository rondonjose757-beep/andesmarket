# Prueba local de pedidos del MVP

El arnés crea un contenedor PostgreSQL 17 aislado y desechable, instala
`supabase/schema.sql`, siembra dos pedidos históricos y aplica, en orden:

1. `2026-09-19-mvp-pedidos-base.sql`;
2. `2026-09-19-mvp-pedidos-atomicos.sql`;
3. las aserciones de `mvp-pedidos.sql`.

No usa variables del proyecto, no abre puertos, ejecuta el contenedor con
`--network none` y lo elimina incluso cuando una prueba falla. Nunca se conecta
a Supabase remoto ni a una base PostgreSQL existente.

## Requisitos

- Docker instalado y con el daemon activo.
- La imagen `postgres:17-alpine` descargada previamente. El script no instala
  herramientas ni descarga imágenes automáticamente.

Si falta la imagen, descárgala explícitamente:

```bash
docker pull postgres:17-alpine
```

## Ejecución

Desde la raíz del repositorio:

```bash
sh supabase/tests/run-mvp-pedidos.sh
```

Para usar otra imagen de PostgreSQL 17 que ya esté disponible localmente:

```bash
ANDESMARKET_POSTGRES_IMAGE=postgres:17.6-alpine sh supabase/tests/run-mvp-pedidos.sh
```

La ejecución termina con `OK: todas las pruebas SQL del MVP de pedidos
pasaron.` cuando todas las aserciones son correctas. Ante un fallo, `psql`
detiene inmediatamente la prueba y muestra el mensaje `FALLO:` correspondiente.
