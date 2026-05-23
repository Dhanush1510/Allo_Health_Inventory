import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { releaseExpiredReservations } from '@/lib/cleanup';
import { requireUser } from '@/lib/api-auth';
import { assertReservationAccess } from '@/lib/reservation-access';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    await releaseExpiredReservations();

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        product: true,
        warehouse: true,
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    const forbidden = assertReservationAccess(reservation, auth);
    if (forbidden) return forbidden;

    return NextResponse.json(reservation);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API_RESERVATIONS_ID_GET] Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', details: message },
      { status: 500 }
    );
  }
}
