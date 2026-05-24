'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Countdown } from '@/components/Countdown';
import type { Reservation } from '@/types';
import { secondsUntil } from '@/lib/time';

export function ReservationCard({
  reservation,
  onConfirm,
  onRelease,
  busy,
  showActions = true,
}: {
  reservation: Reservation;
  onConfirm: (id: string) => void;
  onRelease: (id: string) => void;
  busy: string | null;
  showActions?: boolean;
}) {
  const isPending = reservation.status === 'PENDING';
  const expired = isPending && secondsUntil(reservation.expiresAt) <= 0;

  return (
    <article className="flex gap-4 rounded-sm border border-[#e0e0e0] bg-white p-4 shadow-sm">
      <Link href={`/product/${reservation.productId}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-sm bg-[#f8f8f8]">
        <Image
          src={reservation.product.imageUrl ?? '/images/placeholder.svg'}
          alt={reservation.product.name}
          fill
          className="object-cover p-1"
          unoptimized={reservation.product.imageUrl?.includes('picsum.photos')}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Link href={`/product/${reservation.productId}`} className="font-medium text-[#212121] hover:text-[#2874f0]">
              {reservation.product.name}
            </Link>
            <p className="mt-0.5 text-xs text-[#878787]">
              Ships from {reservation.warehouse.city} ({reservation.warehouse.code})
            </p>
          </div>
          <span
            className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
              reservation.status === 'CONFIRMED'
                ? 'bg-green-100 text-green-800'
                : reservation.status === 'PENDING'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {reservation.status}
          </span>
        </div>
        <p className="mt-2 text-base font-semibold">₹{reservation.product.price.toFixed(0)}</p>
        {isPending ? (
          <p className="mt-1 text-xs text-[#878787]">
            Hold expires in <Countdown expiresAt={reservation.expiresAt} />
          </p>
        ) : null}
        {showActions && isPending && !expired ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy === reservation.id}
              onClick={() => onConfirm(reservation.id)}
              className="btn-primary px-4 py-1.5 text-xs"
            >
              {busy === reservation.id ? '…' : 'Confirm order'}
            </button>
            <button
              type="button"
              disabled={busy === reservation.id}
              onClick={() => onRelease(reservation.id)}
              className="btn-secondary px-4 py-1.5 text-xs"
            >
              Remove
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
