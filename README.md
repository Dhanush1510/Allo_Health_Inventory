# Allo Health Inventory Reservation Demo

A Next.js App Router application that implements a concurrent-safe inventory reservation flow for multi-warehouse stock.

## Features

- Aurora-themed ecommerce storefront with **Shop**, **Reserved**, and **Orders** tabs
- User registration and sign-in (`User` table in Postgres) with session cookies
- Per-user reservations — countdown uses server `expiresAt`, so holds persist across sign-out
- 14 wellness products with Unsplash imagery and compact descriptions
- Products and warehouses with per-warehouse stock counts
- `total` vs `reserved` stock tracking
- `pending`, `confirmed`, and `released` reservation states
- Concurrent-safe reservation endpoint using an atomic stock update in PostgreSQL
- Lazy expiry cleanup on reads and during reservation operations
- Frontend product page with reservation buttons and live checkout flow
- Idempotency support for reserve and confirm APIs

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file:

```bash
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-REGION.pooler.supabase.com:5432/postgres"
AUTH_SECRET="generate-a-long-random-string"
```

Use your Supabase **session pooler** URI (Settings → Database). Set `AUTH_SECRET` to any long random string for JWT sessions.

For local development you can also run Postgres in Docker:

```bash
docker run -d --name allo-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=allo -p 5432:5432 postgres:16
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/allo"
```

3. Run Prisma migrations and seed the database:

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

Prisma 7 uses the `@prisma/adapter-pg` driver adapter; the connection string is read at runtime in `src/lib/db.ts`, not from the schema file. The client is generated into `src/generated/prisma` (`prisma generate` runs on `npm install` and `npm run build`).

> If you previously used SQLite (`file:./dev.db`), replace `DATABASE_URL` with a PostgreSQL URL before running the app.

4. Start the app:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

Repository: [github.com/Dhanush1510/Allo_Health_Inventory](https://github.com/Dhanush1510/Allo_Health_Inventory)

1. Log in to the Vercel CLI:

```bash
npx vercel login
```

2. From the project root, link the project and add environment variables (use your Supabase **Session** or direct Postgres URL):

```bash
npx vercel link
npx vercel env add DATABASE_URL production
# paste: postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres?sslmode=require
npx vercel env add RUN_SEED production
# enter: true   (only for the first deploy, then remove or set to false)
```

3. Deploy to production:

```bash
npx vercel --prod
```

The Vercel build runs `prisma migrate deploy` and optionally seeds when `RUN_SEED=true`. After the first successful deploy, unset `RUN_SEED` so production data is not reset on every build.

Alternatively, import the GitHub repo in the [Vercel dashboard](https://vercel.com/new) and set `DATABASE_URL` (and `RUN_SEED=true` once) under Project Settings → Environment Variables.

## Reservation expiry mechanism

This project uses a lazy cleanup approach:

- `GET /api/products` runs `releaseExpiredReservations()` before loading products
- `POST /api/reservations` also calls cleanup before attempting a new hold
- expired reservations are marked `RELEASED` and their reserved stock is decremented

In production, a cron job or background worker could periodically run the same cleanup logic.

## Idempotency (bonus)

`POST /api/reservations` and `POST /api/reservations/:id/confirm` accept an optional `Idempotency-Key` header.

- First request with a key creates an `Idempotency` row in `PENDING`, runs the operation, then stores the HTTP status and JSON body as `SUCCESS`.
- Retries with the same key return the stored response without re-running stock updates.
- Concurrent duplicate requests while `PENDING` receive `409`.
- On unexpected `500` errors during reserve, the key row is deleted so the client can safely retry.

The checkout UI generates a fresh UUID per confirm/cancel action; reserve uses a new key per button click.

## Notes and trade-offs

- The reservation API uses a single atomic SQL `UPDATE "Stock" SET "reserved" = "reserved" + units WHERE (total - reserved) >= units` inside a transaction. Under concurrent requests, exactly one request can claim the last available unit.
- The confirmation and release endpoints preserve idempotency via the optional `Idempotency-Key` header.
- The frontend is intentionally lightweight and focused on the reservation flow.
- Product images use a shared placeholder asset so seeded demo data displays consistently.
- With more time: a dedicated cron/worker for expiry instead of lazy cleanup only, shared idempotency helper to reduce duplication across routes, and automated concurrency tests against the low-stock SKUs in seed data.

## API Endpoints

- `GET /api/products`
- `GET /api/warehouses`
- `POST /api/reservations`
- `GET /api/reservations/:id`
- `POST /api/reservations/:id/confirm`
- `POST /api/reservations/:id/release`
