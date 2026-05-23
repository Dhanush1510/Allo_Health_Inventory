import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { releaseExpiredReservations } from '@/lib/cleanup';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const reserveSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  units: z.number().int().positive().default(1),
});

export async function POST(request: NextRequest) {
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

        // Return the saved response
        const savedBody = existing.responseBody
          ? (JSON.parse(existing.responseBody as string) as unknown)
          : null;
        return NextResponse.json(savedBody, { status: existing.responseCode || 200 });
      }

      // Record that we are processing this request
      await prisma.idempotency.create({
        data: {
          key: idempotencyKey,
          status: 'PENDING',
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[API_RESERVATIONS_POST] Idempotency pre-check error:', err);
      return NextResponse.json(
        { error: 'Idempotency tracking system failure', details: message },
        { status: 500 }
      );
    }
  }

  // Helper function to update idempotency response
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
      console.error('[API_RESERVATIONS_POST] Failed to save idempotency response:', err);
    }
  };

  // Helper function to remove/reset idempotency key on unexpected failure
  const deleteIdempotencyKey = async () => {
    if (!idempotencyKey) return;
    try {
      await prisma.idempotency.delete({
        where: { key: idempotencyKey },
      });
    } catch (err) {
      console.error('[API_RESERVATIONS_POST] Failed to delete idempotency key:', err);
    }
  };

  try {
    // 2. Parse and validate body
    const body = await request.json();
    const parsed = reserveSchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = { error: 'Invalid input data', details: parsed.error.format() };
      await saveIdempotencyResponse(400, errorMsg);
      return NextResponse.json(errorMsg, { status: 400 });
    }

    const { productId, warehouseId, units } = parsed.data;

    // 3. Lazy cleanup expired holds first to optimize available stock
    await releaseExpiredReservations();

    // 4. Run database transaction with strict Compare-And-Swap (optimistic locking)
    const result = await prisma.$transaction(async (tx) => {
      // A. Verify stock record exists
      const stock = await tx.stock.findUnique({
        where: {
          productId_warehouseId: { productId, warehouseId },
        },
      });

      if (!stock) {
        return { success: false, status: 404, message: 'Stock record for product and warehouse does not exist' };
      }

      // B. Attempt atomic database update
      // By using a SQL WHERE constraint "total" - "reserved" >= units, we ensure
      // PostgreSQL locks the row and increments ONLY if there is enough stock.
      // Under concurrency, PostgreSQL queues updates on the same row, resolving them sequentially.
      const updatedCount = await tx.$executeRaw`
        UPDATE "Stock"
        SET "reserved" = "reserved" + ${units}
        WHERE "productId" = ${productId}
          AND "warehouseId" = ${warehouseId}
          AND ("total" - "reserved") >= ${units}
      `;

      if (updatedCount === 0) {
        return { success: false, status: 409, message: 'Not enough stock available in this warehouse' };
      }

      // C. Success! Create reservation hold record
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      const reservation = await tx.reservation.create({
        data: {
          productId,
          warehouseId,
          units,
          status: 'PENDING',
          expiresAt,
        },
        include: {
          product: true,
          warehouse: true,
        },
      });

      return { success: true, status: 201, reservation };
    });

    if (!result.success) {
      const errorMsg = { error: result.message };
      await saveIdempotencyResponse(result.status || 409, errorMsg);
      return NextResponse.json(errorMsg, { status: result.status || 409 });
    }

    // Save final success response for idempotency
    await saveIdempotencyResponse(201, result.reservation);
    return NextResponse.json(result.reservation, { status: 201 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API_RESERVATIONS_POST] Transaction error:', err);
    await deleteIdempotencyKey(); // Let the client retry on system error
    return NextResponse.json(
      { error: 'Internal Server Error', details: message },
      { status: 500 }
    );
  }
}
