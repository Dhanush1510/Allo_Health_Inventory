'use client';

import Image from 'next/image';
import { Countdown } from '@/components/Countdown';
import type { Reservation } from '@/types';
import { secondsUntil } from '@/lib/time';

export function ReservationCard({
  reservation,
  onConfirm,
  onRelease,
  busy,
}: {
  reservation: Reservation;
  onConfirm: (id: string) => void;
  onRelease: (id: string) => void;
  busy: string | null;
}) {
  const isPending = reservation.status === 'PENDING';
  const expired = isPending && secondsUntil(reservation.expiresAt) <= 0;

  return (
    <article className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <Image
        src={reservation.product.imageUrl ?? '/images/placeholder.svg'}
        alt={reservation.product.name}
        width={88}
        height={88}
        className="h-20 w-20 shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-white">{reservation.product.name}</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {reservation.warehouse.city} · {reservation.warehouse.code}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              reservation.status === 'CONFIRMED'
                ? 'bg-emerald-500/20 text-emerald-300'
                : reservation.status === 'PENDING'
                ? 'bg-cyan-500/20 text-cyan-200'
                : 'bg-slate-500/20 text-slate-400'
            }`}
          >
            {reservation.status}
          </span>
        </div>
        <p className="mt-2 text-sm font-medium text-emerald-300">₹{reservation.product.price.toFixed(0)}</p>
        {isPending ? (
          <p className="mt-1 text-xs text-slate-400">
            Hold expires in <Countdown expiresAt={reservation.expiresAt} />
          </p>
        ) : null}
        {isPending && !expired ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy === reservation.id}
              onClick={() => onConfirm(reservation.id)}
              className="rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-1.5 text-xs font-semibold text-[#050b14] disabled:opacity-50"
            >
              {busy === reservation.id ? '…' : 'Confirm order'}
            </button>
            <button
              type="button"
              disabled={busy === reservation.id}
              onClick={() => onRelease(reservation.id)}
              className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-slate-200 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
