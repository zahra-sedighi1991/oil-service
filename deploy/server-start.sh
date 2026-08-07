#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

if [ ! -f .env.production ]; then
  echo "Missing .env.production. Copy .env.production.example and configure it first." >&2
  exit 1
fi

if [ ! -f oil-service-images.tar ]; then
  echo "Missing oil-service-images.tar." >&2
  exit 1
fi

if grep -Eq '^(DOMAIN=example\.ir|DB_PASSWORD=REPLACE_WITH_|JWT_SECRET=REPLACE_WITH_)' .env.production; then
  echo "Replace the example domain and secrets in .env.production before starting." >&2
  exit 1
fi

if [ -f oil-service-images.tar.sha256 ]; then
  sha256sum --check oil-service-images.tar.sha256
fi

docker load --input oil-service-images.tar
docker compose --env-file .env.production -f compose.production.yml up -d --remove-orphans
docker compose --env-file .env.production -f compose.production.yml ps
