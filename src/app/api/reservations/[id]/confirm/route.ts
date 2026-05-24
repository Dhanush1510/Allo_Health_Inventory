import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/api-auth';
import { assertReservationAccess } from '@/lib/reservation-access';
import { beginIdempotency } from '@/lib/idempotency';
import { withStockLock } from '@/lib/stock-lock';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idempotencyKey = request.headers.get('Idempotency-Key');
  const idem = await beginIdempotency(`confirm:${id}`, idempotencyKey);
  if (!idem.proceed) return idem.response;
  const { save, clear } = idem.handle;

  try {
    const auth = await requireUser();
    if (auth instanceof NextResponse) {
      await save(401, { error: 'Sign in required' });
      return auth;
    }

    const now = new Date();
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { product: true, warehouse: true },
    });

    if (!reservation) {
      const errorMsg = { error: 'Reservation not found' };
      await save(404, errorMsg);
      return NextResponse.json(errorMsg, { status: 404 });
    }

    const forbidden = assertReservationAccess(reservation, auth);
    if (forbidden) return forbidden;

    if (reservation.status === 'CONFIRMED') {
      await save(200, reservation);
      return NextResponse.json(reservation);
    }

    if (reservation.status === 'RELEASED') {
      const errorMsg = { error: 'Reservation has already been released' };
      await save(400, errorMsg);
      return NextResponse.json(errorMsg, { status: 400 });
    }

    if (reservation.expiresAt < now) {
      await prisma.$transaction(async (tx) => {
        await tx.reservation.update({ where: { id }, data: { status: 'RELEASED' } });
        await tx.$executeRaw`
          UPDATE "Stock"
          SET "reserved" = CASE WHEN "reserved" - ${reservation.units} < 0 THEN 0 ELSE "reserved" - ${reservation.units} END
          WHERE "productId" = ${reservation.productId} AND "warehouseId" = ${reservation.warehouseId}
        `;
      });
      const errorMsg = { error: 'Reservation has expired' };
      await save(410, errorMsg);
      return NextResponse.json(errorMsg, { status: 410 });
    }

    const result = await withStockLock(reservation.productId, reservation.warehouseId, () =>
      prisma.$transaction(async (tx) => {
        const affected = await tx.$executeRaw`
          UPDATE "Stock"
          SET "total" = CASE WHEN "total" - ${reservation.units} < 0 THEN 0 ELSE "total" - ${reservation.units} END,
              "reserved" = CASE WHEN "reserved" - ${reservation.units} < 0 THEN 0 ELSE "reserved" - ${reservation.units} END
          WHERE "productId" = ${reservation.productId} AND "warehouseId" = ${reservation.warehouseId}
        `;
        if (affected === 0) throw new Error('StockRecordMissing');
        return tx.reservation.update({
          where: { id },
          data: { status: 'CONFIRMED' },
          include: { product: true, warehouse: true },
        });
      })
    );

    await save(200, result);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API_RESERVATIONS_CONFIRM_POST]', err);
    await clear();
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
