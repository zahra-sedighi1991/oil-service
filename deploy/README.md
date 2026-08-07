# Production deployment (local build)

The application images are built on the development machine. The server only
loads and runs the images; it does not install Node.js packages or build Nuxt
or NestJS.

## 1. Build a release locally

Docker Desktop must be running in Linux-container mode:

```powershell
pnpm.cmd deploy:build
```

To bundle the PostgreSQL and Caddy images too (useful for an offline server):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-release.ps1 -IncludeInfrastructureImages
```

The output is written to `.release/<version>/`. Upload that entire directory
to the server.

## 2. Prepare the server once

Install Docker Engine with the Compose plugin, point the domain's A/AAAA record
to the server, and allow inbound TCP ports 80 and 443 (plus UDP 443). Do not
expose PostgreSQL port 5432.

## 3. Configure and start

Inside the uploaded release directory:

```sh
cp .env.production.example .env.production
nano .env.production
chmod +x server-start.sh backup-db.sh
sh server-start.sh
```

Use long random values for `DB_PASSWORD` and `JWT_SECRET`. The API runs pending
database migrations before each start. Schema synchronization stays disabled.

Verify the deployment:

```sh
docker compose --env-file .env.production -f compose.production.yml ps
curl -fsS "https://$(sed -n 's/^DOMAIN=//p' .env.production)/health"
```

## Updating

Build a new release locally, upload the new directory, copy the existing
`.env.production` into it, update only `APP_VERSION` to the new release tag,
and run `sh server-start.sh`. Database and TLS data live in named Docker volumes
and are not removed by an application update.

## Backup

Run this command from cron every day and copy the resulting dump to storage on
another machine:

```sh
sh backup-db.sh
```

Backups are kept for 14 days by default. Set `BACKUP_DIR` and
`BACKUP_RETENTION_DAYS` to override those values.
