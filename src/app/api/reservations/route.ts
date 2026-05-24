import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { releaseExpiredReservations } from '@/lib/cleanup';
import { requireUser } from '@/lib/api-auth';
import { beginIdempotency } from '@/lib/idempotency';
import { withStockLock } from '@/lib/stock-lock';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const reserveSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  units: z.number().int().positive().default(1),
});

export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get('Idempotency-Key');
  const idem = await beginIdempotency('reserve', idempotencyKey);
  if (!idem.proceed) return idem.response;
  const { save, clear } = idem.handle;

  try {
    const auth = await requireUser();
    if (auth instanceof NextResponse) {
      await save(401, { error: 'Sign in required' });
      return auth;
    }

    const body = await request.json();
    const parsed = reserveSchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = { error: 'Invalid input data', details: parsed.error.format() };
      await save(400, errorMsg);
      return NextResponse.json(errorMsg, { status: 400 });
    }

    const { productId, warehouseId, units } = parsed.data;
    await releaseExpiredReservations();

    let result: Awaited<ReturnType<typeof runReservation>>;
    try {
      result = await withStockLock(productId, warehouseId, () =>
        runReservation({ productId, warehouseId, units, userId: auth.id })
      );
    } catch (e) {
      if ((e as Error).message === 'STOCK_LOCK_TIMEOUT') {
        const errorMsg = { error: 'Warehouse is busy, please retry' };
        await save(409, errorMsg);
        return NextResponse.json(errorMsg, { status: 409 });
      }
      throw e;
    }

    if (!result.success) {
      const errorMsg = { error: result.message };
      await save(result.status || 409, errorMsg);
      return NextResponse.json(errorMsg, { status: result.status || 409 });
    }

    await save(201, result.reservation);
    return NextResponse.json(result.reservation, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API_RESERVATIONS_POST]', err);
    await clear();
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

async function runReservation({
  productId,
  warehouseId,
  units,
  userId,
}: {
  productId: string;
  warehouseId: string;
  units: number;
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const stock = await tx.stock.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    });

    if (!stock) {
      return { success: false as const, status: 404, message: 'Stock record for product and warehouse does not exist' };
    }

    const updatedCount = await tx.$executeRaw`
      UPDATE "Stock"
      SET "reserved" = "reserved" + ${units}
      WHERE "productId" = ${productId}
        AND "warehouseId" = ${warehouseId}
        AND ("total" - "reserved") >= ${units}
    `;

    if (updatedCount === 0) {
      return { success: false as const, status: 409, message: 'Not enough stock available in this warehouse' };
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const reservation = await tx.reservation.create({
      data: {
        userId,
        productId,
        warehouseId,
        units,
        status: 'PENDING',
        expiresAt,
      },
      include: { product: true, warehouse: true },
    });

    return { success: true as const, status: 201, reservation };
  });
}
