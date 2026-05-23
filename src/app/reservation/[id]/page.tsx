"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

type Reservation = {
  id: string;
  productId: string;
  warehouseId: string;
  units: number;
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED';
  expiresAt: string;
  createdAt: string;
  product: {
    id: string;
    sku: string;
    name: string;
    description: string;
    price: number;
    imageUrl?: string;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
    city: string;
  };
};

type ApiError = {
  error: string;
  details?: unknown;
};

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export default function ReservationPage() {
  const params = useParams();
  const reservationId = params?.id as string | undefined;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'confirm' | 'cancel' | null>(null);
  const [now, setNow] = useState(() => new Date());

  const isExpired = useMemo(() => {
    if (!reservation) return false;
    return new Date(reservation.expiresAt).getTime() <= now.getTime();
  }, [now, reservation]);

  const secondsLeft = useMemo(() => {
    if (!reservation) return 0;
    const diff = Math.max(0, Math.ceil((new Date(reservation.expiresAt).getTime() - now.getTime()) / 1000));
    return diff;
  }, [now, reservation]);

  useEffect(() => {
    if (!reservationId) return;

    async function loadReservation() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetch(`/api/reservations/${reservationId}`, { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok) {
          throw new Error((body as ApiError).error ?? 'Unable to load reservation');
        }
        setReservation(body as Reservation);
      } catch (error) {
        setErrorMessage((error as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadReservation();
  }, [reservationId]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  async function sendAction(path: string, successMessage: string) {
    if (!reservationId) return;
    setErrorMessage(null);
    setActionMessage(null);
    setPendingAction(path.includes('confirm') ? 'confirm' : 'cancel');

    try {
      const response = await fetch(`/api/reservations/${reservationId}/${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
      });

      const body = await response.json();
      if (!response.ok) {
        setErrorMessage(body.error ?? 'Action failed');
        if (response.status === 410) {
          setActionMessage('Reservation has expired. It is no longer available.');
        }
        return;
      }

      setReservation(body as Reservation);
      setActionMessage(successMessage);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setPendingAction(null);
    }
  }

  const reservationStatusLabel = reservation?.status === 'PENDING'
    ? 'Pending'
    : reservation?.status === 'CONFIRMED'
    ? 'Confirmed'
    : 'Released';

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 text-slate-900 sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-10 rounded-[2rem] bg-white/95 p-8 shadow-xl shadow-slate-200/80 backdrop-blur-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Reservation checkout</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Reservation details</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            Confirm the hold if payment succeeds, or cancel it to free the stock immediately.
          </p>
        </header>

        {loading ? (
          <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm">Loading reservation…</div>
        ) : errorMessage ? (
          <div className="rounded-[2rem] bg-rose-50 p-6 text-rose-900 shadow-sm">{errorMessage}</div>
        ) : reservation ? (
          <article className="rounded-[2rem] bg-white p-8 shadow-sm">
            <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
              <div>
                <div className="mb-6 flex flex-col gap-3 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Status</p>
                  <p className="text-3xl font-semibold text-slate-950">{reservationStatusLabel}</p>
                  <p className="text-sm text-slate-600">{reservation.warehouse.name} · {reservation.warehouse.city}</p>
                </div>

                <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Product</h2>
                    <p className="mt-2 text-xl font-semibold text-slate-950">{reservation.product.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{reservation.product.sku}</p>
                    <p className="mt-3 text-sm text-slate-700">{reservation.product.description}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl bg-white p-4 shadow-sm">
                      <p className="text-sm text-slate-500">Units reserved</p>
                      <p className="mt-2 text-xl font-semibold text-slate-950">{reservation.units}</p>
                    </div>
                    <div className="rounded-3xl bg-white p-4 shadow-sm">
                      <p className="text-sm text-slate-500">Expires in</p>
                      <p className="mt-2 text-xl font-semibold text-slate-950">{formatDuration(secondsLeft)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Warehouse</p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">{reservation.warehouse.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{reservation.warehouse.city} · {reservation.warehouse.code}</p>
                  <p className="mt-3 text-sm font-medium text-slate-700">{isExpired ? 'Reservation has expired' : 'Reservation is active'}</p>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Price</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">₹{reservation.product.price.toFixed(0)}</p>
                </div>
                <div className="space-y-3">
                  {actionMessage ? (
                    <div className="rounded-3xl bg-emerald-50 p-4 text-emerald-900 shadow-sm">{actionMessage}</div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => sendAction('confirm', 'Reservation confirmed successfully.')}
                    disabled={reservation.status !== 'PENDING' || pendingAction === 'confirm'}
                    className="inline-flex h-14 w-full items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                  >
                    {pendingAction === 'confirm' ? 'Confirming…' : 'Confirm purchase'}
                  </button>
                  <button
                    type="button"
                    onClick={() => sendAction('release', 'Reservation cancelled and stock released.')}
                    disabled={reservation.status !== 'PENDING' || pendingAction === 'cancel'}
                    className="inline-flex h-14 w-full items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  >
                    {pendingAction === 'cancel' ? 'Cancelling…' : 'Cancel reservation'}
                  </button>
                </div>
              </div>
            </div>
          </article>
        ) : null}
      </div>
    </main>
  );
}
