#!/bin/sh
set -eu

IMAGE="${ANDESMARKET_POSTGRES_IMAGE:-postgres:17-alpine}"
CONTAINER="andesmarket-mvp-test-$$"
DATABASE="andesmarket_mvp_test"
PASSWORD="andesmarket-local-test"

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker no está instalado o no está disponible en PATH." >&2
  echo "Instálalo o habilítalo manualmente; este script no instala dependencias." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: el daemon de Docker no está activo." >&2
  echo "Inícialo manualmente y vuelve a ejecutar este script." >&2
  exit 1
fi

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "ERROR: falta la imagen local $IMAGE." >&2
  echo "Descárgala manualmente con: docker pull $IMAGE" >&2
  exit 1
fi

trap cleanup EXIT HUP INT TERM

echo "Creando PostgreSQL desechable sin acceso de red..."
docker run --detach --rm \
  --name "$CONTAINER" \
  --network none \
  --env POSTGRES_PASSWORD="$PASSWORD" \
  --env POSTGRES_DB="$DATABASE" \
  --mount "type=bind,src=$REPO_ROOT,dst=/workspace,readonly" \
  "$IMAGE" >/dev/null

attempt=0
until docker exec "$CONTAINER" pg_isready --username postgres --dbname "$DATABASE" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "ERROR: PostgreSQL no estuvo listo dentro de 30 segundos." >&2
    docker logs "$CONTAINER" >&2 || true
    exit 1
  fi
  sleep 1
done

echo "Ejecutando esquema, migraciones y aserciones..."
docker exec \
  --env PGPASSWORD="$PASSWORD" \
  "$CONTAINER" \
  psql \
    --username postgres \
    --dbname "$DATABASE" \
    --file /workspace/supabase/tests/mvp-pedidos.sql

echo "La base desechable pasó las pruebas y será eliminada."
