import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idempotencyKey = request.headers.get('Idempotency-Key');

  // 1. Handle Idempotency Key check if provided
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
      console.error('[API_RESERVATIONS_CONFIRM_POST] Idempotency pre-check error:', err);
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
      console.error('[API_RESERVATIONS_CONFIRM_POST] Failed to save idempotency response:', err);
    }
  };

  const deleteIdempotencyKey = async () => {
    if (!idempotencyKey) return;
    try {
      await prisma.idempotency.delete({
        where: { key: idempotencyKey },
      });
    } catch (err) {
      console.error('[API_RESERVATIONS_CONFIRM_POST] Failed to delete idempotency key:', err);
    }
  };

  try {
    const now = new Date();

    // 2. Fetch reservation details
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        product: true,
        warehouse: true,
      },
    });

    if (!reservation) {
      const errorMsg = { error: 'Reservation not found' };
      await saveIdempotencyResponse(404, errorMsg);
      return NextResponse.json(errorMsg, { status: 404 });
    }

    // 3. Handle already processed reservation
    if (reservation.status === 'CONFIRMED') {
      await saveIdempotencyResponse(200, reservation);
      return NextResponse.json(reservation);
    }

    if (reservation.status === 'RELEASED') {
      const errorMsg = { error: 'Reservation has already been released' };
      await saveIdempotencyResponse(400, errorMsg);
      return NextResponse.json(errorMsg, { status: 400 });
    }

    // 4. Check if reservation has expired
    if (reservation.expiresAt < now) {
      // Lazy cleanup inside transaction
      await prisma.$transaction(async (tx) => {
        await tx.reservation.update({
          where: { id },
          data: { status: 'RELEASED' },
        });

        await tx.$executeRaw`
          UPDATE "Stock"
          SET "reserved" = CASE WHEN "reserved" - ${reservation.units} < 0 THEN 0 ELSE "reserved" - ${reservation.units} END
          WHERE "productId" = ${reservation.productId}
            AND "warehouseId" = ${reservation.warehouseId}
        `;
      });

      const errorMsg = { error: 'Reservation has expired' };
      await saveIdempotencyResponse(410, errorMsg);
      return NextResponse.json(errorMsg, { status: 410 });
    }

    // 5. Success transaction: Confirm purchase
    const result = await prisma.$transaction(async (tx) => {
      // Decrement both total and reserved stock atomically
      const affected = await tx.$executeRaw`
        UPDATE "Stock"
        SET "total" = CASE WHEN "total" - ${reservation.units} < 0 THEN 0 ELSE "total" - ${reservation.units} END,
            "reserved" = CASE WHEN "reserved" - ${reservation.units} < 0 THEN 0 ELSE "reserved" - ${reservation.units} END
        WHERE "productId" = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
      `;

      if (affected === 0) {
        throw new Error('StockRecordMissing');
      }

      const updated = await tx.reservation.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: {
          product: true,
          warehouse: true,
        },
      });

      return updated;
    });

    await saveIdempotencyResponse(200, result);
    return NextResponse.json(result);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API_RESERVATIONS_CONFIRM_POST] Error:', err);
    await deleteIdempotencyKey();
    return NextResponse.json(
      { error: 'Internal Server Error', details: message },
      { status: 500 }
    );
  }
}
