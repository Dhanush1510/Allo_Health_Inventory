import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/api-auth';
import { assertReservationAccess } from '@/lib/reservation-access';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idempotencyKey = request.headers.get('Idempotency-Key');

  if (idempotencyKey) {
    try {
      const existing = await prisma.idempotency.findUnique({
        where: { key: idempotencyKey },
      });

      if (existing) {
        if (existing.status === 'PENDING') {
          return NextResponse.json(
            { error: 'An identical request is currently processing. Please try again.' },
            { status: 409 }
          );
        }

        const savedBody = existing.responseBody
          ? (JSON.parse(existing.responseBody as string) as unknown)
          : null;
        return NextResponse.json(savedBody, { status: existing.responseCode || 200 });
      }

      await prisma.idempotency.create({
        data: {
          key: idempotencyKey,
          status: 'PENDING',
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[API_RESERVATIONS_RELEASE_POST] Idempotency pre-check error:', err);
      return NextResponse.json(
        { error: 'Idempotency tracking system failure', details: message },
        { status: 500 }
      );
    }
  }

  const saveIdempotencyResponse = async (code: number, body: unknown) => {
    if (!idempotencyKey) return;
    try {
      await prisma.idempotency.update({
        where: { key: idempotencyKey },
        data: {
          status: 'SUCCESS',
          responseCode: code,
          responseBody: JSON.stringify(body),
        },
      });
    } catch (err) {
      console.error('[API_RESERVATIONS_RELEASE_POST] Failed to save idempotency response:', err);
    }
  };

  const deleteIdempotencyKey = async () => {
    if (!idempotencyKey) return;
    try {
      await prisma.idempotency.delete({
        where: { key: idempotencyKey },
      });
    } catch (err) {
      console.error('[API_RESERVATIONS_RELEASE_POST] Failed to delete idempotency key:', err);
    }
  };

  try {
    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        product: true,
        warehouse: true,
      },
    });

    if (!reservation) {
      const errorBody = { error: 'Reservation not found' };
      await saveIdempotencyResponse(404, errorBody);
      return NextResponse.json(errorBody, { status: 404 });
    }

    const forbidden = assertReservationAccess(reservation, auth);
    if (forbidden) return forbidden;

    if (reservation.status === 'RELEASED') {
      await saveIdempotencyResponse(200, reservation);
      return NextResponse.json(reservation);
    }

    if (reservation.status === 'CONFIRMED') {
      const errorBody = { error: 'Confirmed reservations cannot be released' };
      await saveIdempotencyResponse(400, errorBody);
      return NextResponse.json(errorBody, { status: 400 });
    }

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      if (reservation.expiresAt < now) {
        await tx.reservation.update({
          where: { id },
          data: { status: 'RELEASED' },
        });
      } else {
        await tx.reservation.update({
          where: { id },
          data: { status: 'RELEASED' },
        });
      }

      await tx.$executeRaw`
        UPDATE "Stock"
        SET "reserved" = CASE WHEN "reserved" - ${reservation.units} < 0 THEN 0 ELSE "reserved" - ${reservation.units} END
        WHERE "productId" = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
      `;

      return tx.reservation.findUnique({
        where: { id },
        include: {
          product: true,
          warehouse: true,
        },
      });
    });

    await saveIdempotencyResponse(200, result);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API_RESERVATIONS_RELEASE_POST] Error:', err);
    await deleteIdempotencyKey();
    return NextResponse.json(
      { error: 'Internal Server Error', details: message },
      { status: 500 }
    );
  }
}
