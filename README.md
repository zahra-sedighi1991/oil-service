# Oil Service API

NestJS/TypeScript backend for a multi-tenant oil-change shop and digital
vehicle service-book MVP.

The repository also contains a Nuxt 4, TypeScript and UnoCSS frontend in
`frontend/`. It includes the shop dashboard, customer and vehicle CRM,
three-step service registration, catalog pricing, invoices, public service
book and super-admin pages.

## Implemented modules

- Temporary password authentication, JWT, shop-owner and super-admin roles
- Strict shop-level isolation for customers, vehicles, service orders and prices
- Global vehicle, product and service catalogs
- Versioned dynamic product attributes with server-side schema validation
- Shop-specific product prices and service fees
- Customer and multi-vehicle CRM with Persian/Arabic digit normalization
- Draft, update, completion and cancellation lifecycle for service orders
- Atomic invoice creation, immutable snapshots, line-level due dates and odometers
- Idempotent completion through the `Idempotency-Key` header
- Secure hashed public-link tokens with revoke/regenerate support
- Customer-safe public service-book response
- Suggestions workflow and admin decisions
- Tenant dashboard and audit records
- Swagger/OpenAPI documentation and request validation

## Local setup

1. Copy `.env.example` to `.env` and replace `JWT_SECRET`.
2. Start PostgreSQL with `docker compose up -d`.
3. During local development the schema is synchronized automatically unless
   `DB_SYNCHRONIZE=false` is explicitly configured.
4. Start the API with `pnpm start:dev`.

The API listens on `http://localhost:3000`. Private endpoints are under
`/api/v1`, the public vehicle book is at `/public/v1/service-book/:token`,
Swagger is at `/docs`, and the health endpoint is `/health`.

## Frontend

```bash
cd frontend
copy .env.example .env
pnpm dev
```

The frontend listens on `http://localhost:3001` by default and expects the API
at `http://localhost:3000`. Configure alternate addresses through
`NUXT_PUBLIC_API_BASE` and `NUXT_PUBLIC_PUBLIC_API_BASE`.

`DB_SYNCHRONIZE` must be disabled in production. Generate and review a TypeORM
migration before the first production deployment.

## Authentication

OTP is temporarily disabled through `OTP_ENABLED=false`. Initial registration
uses a mobile number and password:

```http
POST /api/v1/auth/password/register
Content-Type: application/json

{
  "name": "Shop Owner",
  "mobile": "09120000000",
  "password": "a-strong-password",
  "shopName": "Example Oil Service",
  "city": "Tehran"
}
```

Existing users can sign in with:

```http
POST /api/v1/auth/password/login
Content-Type: application/json

{
  "mobile": "09120000000",
  "password": "a-strong-password"
}
```

Send the returned token as `Authorization: Bearer <token>`.

If `ADMIN_MOBILE` is configured, a super-admin account is created on startup.
Set `ADMIN_PASSWORD` and use the password-login endpoint for that number.
Passwords are salted and hashed with Node.js `scrypt`; plaintext passwords are
never stored. The OTP implementation remains behind the `OTP_ENABLED` flag for
later integration.

## Service completion

Create a draft at `POST /api/v1/service-orders`, then complete it atomically:

```http
POST /api/v1/service-orders/:id/complete
Authorization: Bearer <token>
Idempotency-Key: a-client-generated-unique-value
Content-Type: application/json

{"discountAmount":0}
```

Temporary product or local-service lines can omit their catalog ID and provide
`description`; a pending catalog suggestion is created automatically.

## Production notes

- Before restoring OTP, replace its in-memory challenge store with Redis and connect an SMS provider.
- Use reviewed TypeORM migrations instead of schema synchronization.
- Terminate TLS at the reverse proxy and set a strong JWT secret.
- Add encrypted backups, restore drills, structured logging and error tracking.
- Public-link raw tokens are never stored; only their SHA-256 hashes are persisted.
