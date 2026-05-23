import { prisma } from './db';

/**
 * Lazy cleanup function to release all expired reservations and update stock counts atomically.
 * Designed to be executed before database reads/writes to guarantee data consistency.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const now = new Date();

  // Find all pending reservations that have exceeded their expiry time
  const expired = await prisma.reservation.findMany({
    where: {
      status: 'PENDING',
      expiresAt: {
        lt: now,
      },
    },
  });

  if (expired.length === 0) {
    return 0;
  }

  // Process each expired reservation in an interactive transaction
  await prisma.$transaction(async (tx) => {
    for (const res of expired) {
      // 1. Mark reservation as RELEASED
      await tx.reservation.update({
        where: { id: res.id },
        data: { status: 'RELEASED' },
      });

      // 2. Decrement reserved stock atomically
      await tx.$executeRaw`
        UPDATE "Stock"
        SET "reserved" = CASE WHEN "reserved" - ${res.units} < 0 THEN 0 ELSE "reserved" - ${res.units} END
        WHERE "productId" = ${res.productId}
          AND "warehouseId" = ${res.warehouseId}
      `;
    }
  });

  return expired.length;
}
