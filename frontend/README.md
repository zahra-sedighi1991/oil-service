# Oil Service Frontend

Nuxt 4 + TypeScript + UnoCSS frontend for the Oil Service API.

## Run locally

1. Copy `.env.example` to `.env`.
2. Ensure the NestJS API and PostgreSQL are running.
3. Run `pnpm dev`.
4. Open `http://localhost:3001`.

## Main routes

- `/login`: OTP login and initial shop registration
- `/`: shop dashboard
- `/service-orders/new`: three-step service registration
- `/customers`: customer and vehicle CRM
- `/catalog`: shop product prices and service fees
- `/invoices`: invoice history and printable invoice
- `/settings`: public shop profile
- `/public/service-book/:token`: public vehicle service book
- `/admin`: super-admin shop management
- `/admin/catalog`: global catalog management
- `/admin/suggestions`: catalog suggestion review

The API base URL is configured through `NUXT_PUBLIC_API_BASE`. Authentication
uses the JWT returned by the backend and stores it in a same-site cookie.
