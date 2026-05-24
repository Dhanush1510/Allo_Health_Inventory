# Allo Health Inventory Reservation Demo

A Next.js ecommerce-style app with concurrent-safe inventory reservations, user accounts, and Redis-backed idempotency and distributed locking.

## Features

- Flipkart/Amazon-inspired storefront (shop grid, product detail pages, reserved cart, orders)
- **Reserve** button holds stock for 10 minutes per user
- Product detail pages with pack size, ingredients, material, and highlights (like marketplace spec tables)
- User registration and sign-in (`User` table in Postgres)
- Per-user reservations — `expiresAt` stored server-side; timers persist across sign-out
- 14 wellness products with reliable [picsum.photos](https://picsum.photos) images
- **Redis** (Upstash) for idempotency keys and per-SKU warehouse locks
- Silent background refresh every 12s (stock, reservations) without loading spinners

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file:

```bash
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-REGION.pooler.supabase.com:5432/postgres"
AUTH_SECRET="generate-a-long-random-string"
UPSTASH_REDIS_REST_URL="https://YOUR-REDIS.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
```

Get free Redis from [Upstash](https://upstash.com) (Vercel integration works). Without Redis, idempotency falls back to Postgres and stock locks use SQL-only atomic updates.

3. Migrate and seed:

```bash
npx prisma migrate deploy
npx prisma db seed
```

4. Run the app:

```bash
npm run dev
```

## Idempotency (Redis + Postgres fallback)

`POST /api/reservations` and `POST /api/reservations/:id/confirm` accept an `Idempotency-Key` header.

### With Redis (production)

1. Client sends `Idempotency-Key: <uuid>` with the request.
2. Server runs `SET idempotency:{scope}:{key} { status: PENDING } NX EX 86400`.
   - If the key already holds `SUCCESS`, the stored HTTP status and JSON body are returned immediately (no side effects).
   - If the key is `PENDING`, respond `409` (another in-flight request).
3. On success, the key is overwritten with `{ status: SUCCESS, responseCode, responseBody }` (24h TTL).
4. On unexpected `500`, the key is deleted so the client can retry safely.

Scopes: `reserve` for new holds, `confirm:{reservationId}` for confirmations.

### Without Redis (local fallback)

Same flow using the `Idempotency` Postgres table (legacy path for dev machines without Upstash).

## Distributed locking (Redis)

Before the atomic stock `UPDATE`, reserve/confirm acquire a Redis lock:

- Key: `lock:stock:{productId}:{warehouseId}`
- `SET` with `NX` and 15s TTL; token = random UUID
- Released via Lua script (delete only if token matches)
- Retries for up to 4s, then `409 Warehouse is busy`

This serializes concurrent requests per SKU/warehouse across serverless instances. The SQL `WHERE (total - reserved) >= units` guard remains the source of truth for overselling.

## Reservation expiry

Lazy cleanup on `GET /api/products`, `GET /api/products/:id`, and `POST /api/reservations`.

## API Endpoints

- `GET /api/products` — catalog with live stock
- `GET /api/products/:id` — product detail + specs
- `POST /api/auth/register` | `POST /api/auth/login` | `POST /api/auth/logout` | `GET /api/auth/me`
- `POST /api/reservations` — create hold (auth required)
- `GET /api/reservations/mine` — user's reservations
- `POST /api/reservations/:id/confirm` | `POST /api/reservations/:id/release`

## Deploy to Vercel

Repository: [github.com/Dhanush1510/Allo_Health_Inventory](https://github.com/Dhanush1510/Allo_Health_Inventory)

Set environment variables: `DATABASE_URL`, `AUTH_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

```bash
npx vercel --prod
```

Live: [allo-health-inventory.vercel.app](https://allo-health-inventory.vercel.app)
