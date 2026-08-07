#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

if [ ! -f .env.production ]; then
  echo "Missing .env.production." >&2
  exit 1
fi

backup_dir="${BACKUP_DIR:-./backups}"
retention_days="${BACKUP_RETENTION_DAYS:-14}"
timestamp="$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"

docker compose --env-file .env.production -f compose.production.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  > "$backup_dir/oil-service-$timestamp.dump"

find "$backup_dir" -type f -name 'oil-service-*.dump' -mtime "+$retention_days" -delete
echo "Backup created: $backup_dir/oil-service-$timestamp.dump"
