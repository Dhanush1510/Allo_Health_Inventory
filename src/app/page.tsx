"use client";

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type WarehouseStock = {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  city: string;
  total: number;
  reserved: number;
  available: number;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  stocks: WarehouseStock[];
};

type ApiError = {
  error: string;
  details?: unknown;
};

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reservingWarehouse, setReservingWarehouse] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch('/api/products', { cache: 'no-store' });

        if (!response.ok) {
          const body = (await response.json()) as ApiError;
          throw new Error(body.error || 'Unable to load products');
        }

        const data = (await response.json()) as Product[];
        setProducts(data);
      } catch (error) {
        setErrorMessage((error as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  async function reserve(productId: string, warehouseId: string) {
    setActionMessage(null);
    setErrorMessage(null);
    setReservingWarehouse(`${productId}:${warehouseId}`);

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({ productId, warehouseId, units: 1 }),
      });

      const body = await response.json();
      if (!response.ok) {
        setErrorMessage(body.error ?? 'Reservation failed');
        return;
      }

      setActionMessage('Reservation created — redirecting to checkout...');
      router.push(`/reservation/${body.id}`);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setReservingWarehouse(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 text-slate-900 sm:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-10 rounded-[2rem] bg-white/95 p-8 shadow-xl shadow-slate-200/70 backdrop-blur-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Allo Health reservation demo</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Reserve inventory before checkout
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            Select a product and warehouse, hold stock for 10 minutes, then confirm or cancel the reservation from checkout.
            The backend is designed to keep stock counts consistent under concurrent reservation attempts.
          </p>
        </header>

        {actionMessage ? (
          <div className="mb-6 rounded-3xl border border-emerald-200/80 bg-emerald-50 p-4 text-emerald-900">
            {actionMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-6 rounded-3xl border border-rose-200/80 bg-rose-50 p-4 text-rose-900">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm">Loading products…</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {products.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
                  <Image
                    src={product.imageUrl ?? '/images/placeholder.svg'}
                    alt={product.name}
                    width={224}
                    height={224}
                    className="h-40 w-full rounded-[1.5rem] object-cover sm:h-56 sm:w-56"
                  />
                  <div className="flex-1">
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500">{product.sku}</p>
                    <h2 className="mt-4 text-2xl font-semibold text-slate-950">{product.name}</h2>
                    <p className="mt-3 text-base leading-7 text-slate-600">{product.description}</p>
                    <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-700">
                      <span className="rounded-full bg-slate-100 px-3 py-1">₹{product.price.toFixed(0)}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {product.stocks.reduce((sum, stock) => sum + stock.available, 0)} available
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 bg-slate-50 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Warehouse availability</h3>
                  <div className="space-y-4">
                    {product.stocks.map((stock) => (
                      <div key={stock.warehouseId} className="grid gap-4 rounded-[1.5rem] bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center">
                        <div>
                          <p className="font-semibold text-slate-900">{stock.warehouseName}</p>
                          <p className="mt-1 text-sm text-slate-600">{stock.city} · {stock.warehouseCode}</p>
                          <p className="mt-3 text-sm text-slate-700">
                            {stock.available} available · {stock.total} total · {stock.reserved} reserved
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => reserve(product.id, stock.warehouseId)}
                          disabled={stock.available < 1 || reservingWarehouse === `${product.id}:${stock.warehouseId}`}
                          className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                        >
                          {stock.available < 1
                            ? 'Sold out'
                            : reservingWarehouse === `${product.id}:${stock.warehouseId}`
                            ? 'Reserving…'
                            : 'Reserve'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
