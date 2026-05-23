'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ReservationCard } from '@/components/ReservationCard';
import { SiteHeader } from '@/components/SiteHeader';
import { useAuth } from '@/contexts/AuthContext';
import type { Product, Reservation, TabId } from '@/types';

export function Storefront() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>('shop');
  const [products, setProducts] = useState<Product[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reserving, setReserving] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load products');
      setProducts(data as Product[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadReservations = useCallback(async () => {
    if (!user) {
      setReservations([]);
      return;
    }
    setLoadingReservations(true);
    try {
      const res = await fetch('/api/reservations/mine', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load cart');
      setReservations(data as Reservation[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingReservations(false);
    }
  }, [user]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadReservations();
    const id = window.setInterval(loadReservations, 15000);
    return () => window.clearInterval(id);
  }, [loadReservations]);

  const pending = reservations.filter((r) => r.status === 'PENDING');
  const orders = reservations.filter((r) => r.status === 'CONFIRMED');

  async function addToCart(productId: string, warehouseId: string) {
    if (!user) {
      setError('Sign in to reserve items');
      return;
    }
    setError(null);
    setMessage(null);
    setReserving(`${productId}:${warehouseId}`);
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
      setMessage('Added to reserved cart — your 10-minute hold is active.');
      await loadReservations();
      await loadProducts();
      setTab('reserved');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReserving(null);
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
      setMessage(action === 'confirm' ? 'Order confirmed!' : 'Removed from cart');
      await loadReservations();
      await loadProducts();
      if (action === 'confirm') setTab('orders');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="aurora-bg min-h-screen text-slate-100">
      <SiteHeader activeTab={tab} onTabChange={setTab} reservedCount={pending.length} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {message ? (
          <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {tab === 'shop' ? (
          <>
            <section className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Wellness, held for you
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Add to cart to reserve stock for 10 minutes. Confirm before the timer ends — your hold
                stays active even after sign-out.
              </p>
            </section>
            {loadingProducts ? (
              <p className="text-center text-slate-400">Loading catalog…</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => {
                  const available = product.stocks.reduce((s, st) => s + st.available, 0);
                  const best = product.stocks.find((st) => st.available > 0) ?? product.stocks[0];
                  return (
                    <article
                      key={product.id}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition hover:border-cyan-400/30"
                    >
                      <div className="relative aspect-square overflow-hidden">
                        <Image
                          src={product.imageUrl ?? '/images/placeholder.svg'}
                          alt={product.name}
                          fill
                          sizes="(max-width:768px) 50vw, 25vw"
                          className="object-cover transition duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <p className="text-[10px] uppercase tracking-widest text-cyan-400/80">{product.sku}</p>
                        <h2 className="mt-1 line-clamp-2 text-sm font-semibold text-white">{product.name}</h2>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-400">{product.description}</p>
                        <div className="mt-auto flex items-center justify-between pt-3">
                          <span className="text-base font-bold text-emerald-300">₹{product.price.toFixed(0)}</span>
                          <span className="text-xs text-slate-500">{available} left</span>
                        </div>
                        <button
                          type="button"
                          disabled={!user || !best || best.available < 1 || reserving !== null}
                          onClick={() => best && addToCart(product.id, best.warehouseId)}
                          className="mt-3 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-2.5 text-sm font-semibold text-[#050b14] transition hover:opacity-90 disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-600 disabled:text-slate-400"
                        >
                          {!user
                            ? 'Sign in to add'
                            : available < 1
                            ? 'Sold out'
                            : reserving
                            ? 'Adding…'
                            : 'Add to cart'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : null}

        {tab === 'reserved' ? (
          <section>
            <h1 className="text-2xl font-bold text-white">Reserved items</h1>
            <p className="mt-1 text-sm text-slate-400">Active holds with live countdown from your account.</p>
            {!user ? (
              <p className="mt-8 text-center text-slate-400">
                <Link href="/login" className="text-cyan-400 underline">
                  Sign in
                </Link>{' '}
                to view your cart.
              </p>
            ) : loadingReservations ? (
              <p className="mt-8 text-center text-slate-400">Loading…</p>
            ) : pending.length === 0 ? (
              <p className="mt-8 text-center text-slate-400">No reserved items. Browse the shop to add some.</p>
            ) : (
              <div className="mt-6 space-y-3">
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
          <section>
            <h1 className="text-2xl font-bold text-white">Orders</h1>
            <p className="mt-1 text-sm text-slate-400">Confirmed purchases from your reservations.</p>
            {!user ? (
              <p className="mt-8 text-center text-slate-400">
                <Link href="/login" className="text-cyan-400 underline">
                  Sign in
                </Link>{' '}
                to see orders.
              </p>
            ) : loadingReservations ? (
              <p className="mt-8 text-center text-slate-400">Loading…</p>
            ) : orders.length === 0 ? (
              <p className="mt-8 text-center text-slate-400">No orders yet.</p>
            ) : (
              <div className="mt-6 space-y-3">
                {orders.map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    busy={busyId}
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
