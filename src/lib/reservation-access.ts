import { NextResponse } from 'next/server';
import type { SessionUser } from '@/lib/auth';

type ReservationRow = { userId: string | null };

export function assertReservationAccess(
  reservation: ReservationRow,
  user: SessionUser
): NextResponse | null {
  if (!reservation.userId || reservation.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
