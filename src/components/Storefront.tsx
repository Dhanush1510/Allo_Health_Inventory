'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { ReservationCard } from '@/components/ReservationCard';
import { SiteHeader } from '@/components/SiteHeader';
import { useAuth } from '@/contexts/AuthContext';
import type { Product, Reservation, TabId } from '@/types';

const POLL_MS = 12000;

export function Storefront({ initialTab }: { initialTab?: TabId }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>(initialTab ?? 'shop');
  const [products, setProducts] = useState<Product[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const loadProducts = useCallback(async () => {
    const res = await fetch('/api/products', { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to load products');
    setProducts(data as Product[]);
  }, []);

  const loadReservations = useCallback(async () => {
    if (!user) {
      setReservations([]);
      return;
    }
    const res = await fetch('/api/reservations/mine', { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to load reservations');
    setReservations(data as Reservation[]);
  }, [user]);

  const refreshAll = useCallback(
    async (silent: boolean) => {
      try {
        if (!silent) setInitialLoad(true);
        await Promise.all([loadProducts(), loadReservations()]);
        setError(null);
      } catch (e) {
        if (!silent) setError((e as Error).message);
      } finally {
        if (!silent) {
          setInitialLoad(false);
          hasLoadedOnce.current = true;
        }
      }
    },
    [loadProducts, loadReservations]
  );

  useEffect(() => {
    refreshAll(false);
  }, [refreshAll]);

  useEffect(() => {
    if (!hasLoadedOnce.current) return;
    const id = window.setInterval(() => refreshAll(true), POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshAll]);

  const pending = reservations.filter((r) => r.status === 'PENDING');
  const orders = reservations.filter((r) => r.status === 'CONFIRMED');

  async function reserve(productId: string, warehouseId: string) {
    if (!user) {
      setError('Sign in to reserve items');
      return;
    }
    setError(null);
    setMessage(null);
    setReserving(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({ productId, warehouseId, units: 1 }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? 'Could not reserve');
        return;
      }
      setMessage('Reserved for 10 minutes — timer continues if you sign out.');
      await refreshAll(true);
      setTab('reserved');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReserving(false);
    }
  }

  async function reservationAction(id: string, action: 'confirm' | 'release') {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${id}/${action}`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? 'Action failed');
        return;
      }
      setMessage(action === 'confirm' ? 'Order placed successfully!' : 'Reservation removed');
      await refreshAll(true);
      if (action === 'confirm') setTab('orders');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f1f3f6]">
      <SiteHeader activeTab={tab} onTabChange={setTab} reservedCount={pending.length} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {message ? (
          <div className="mb-4 rounded-sm border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {tab === 'shop' ? (
          <>
            <div className="mb-4 rounded-sm bg-white p-4 shadow-sm">
              <h1 className="text-xl font-semibold text-[#212121]">Wellness & nutrition</h1>
              <p className="mt-1 text-sm text-[#878787]">
                Reserve stock for 10 minutes — click a product for full specifications.
              </p>
            </div>
            {initialLoad && products.length === 0 ? (
              <p className="py-16 text-center text-[#878787]">Loading catalog…</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    signedIn={Boolean(user)}
                    reserving={reserving}
                    onReserve={reserve}
                  />
                ))}
              </div>
            )}
          </>
        ) : null}

        {tab === 'reserved' ? (
          <section className="rounded-sm bg-white p-4 shadow-sm">
            <h1 className="text-xl font-semibold">Reserved items</h1>
            <p className="mt-1 text-sm text-[#878787]">
              Timers sync from the server — no reset on refresh or sign-in.
            </p>
            {!user ? (
              <p className="mt-8 text-center text-[#878787]">
                <Link href="/login" className="text-[#2874f0] font-medium hover:underline">
                  Sign in
                </Link>{' '}
                to view reservations.
              </p>
            ) : initialLoad && reservations.length === 0 ? (
              <p className="mt-8 text-center text-[#878787]">Loading…</p>
            ) : pending.length === 0 ? (
              <p className="mt-8 text-center text-[#878787]">No active reservations.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {pending.map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    busy={busyId}
                    onConfirm={(id) => reservationAction(id, 'confirm')}
                    onRelease={(id) => reservationAction(id, 'release')}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}

        {tab === 'orders' ? (
          <section className="rounded-sm bg-white p-4 shadow-sm">
            <h1 className="text-xl font-semibold">Your orders</h1>
            <p className="mt-1 text-sm text-[#878787]">Confirmed purchases from completed reservations.</p>
            {!user ? (
              <p className="mt-8 text-center text-[#878787]">
                <Link href="/login" className="text-[#2874f0] font-medium hover:underline">
                  Sign in
                </Link>{' '}
                to see orders.
              </p>
            ) : orders.length === 0 ? (
              <p className="mt-8 text-center text-[#878787]">No orders yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {orders.map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    busy={busyId}
                    showActions={false}
                    onConfirm={() => {}}
                    onRelease={() => {}}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
