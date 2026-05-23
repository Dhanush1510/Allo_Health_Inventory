import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { releaseExpiredReservations } from '@/lib/cleanup';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    await releaseExpiredReservations();

    const reservations = await prisma.reservation.findMany({
      where: { userId: auth.id },
      include: { product: true, warehouse: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reservations);
  } catch (err) {
    console.error('[API_RESERVATIONS_MINE]', err);
    return NextResponse.json({ error: 'Failed to load reservations' }, { status: 500 });
  }
}
