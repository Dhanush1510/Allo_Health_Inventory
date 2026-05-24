'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Star, ChevronRight } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { useAuth } from '@/contexts/AuthContext';
import type { Product, TabId } from '@/types';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const productId = params?.id as string;
  const [tab, setTab] = useState<TabId>('shop');
  const [product, setProduct] = useState<Product | null>(null);
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadProduct = useCallback(async () => {
    const res = await fetch(`/api/products/${productId}`, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Product not found');
    const p = data as Product;
    setProduct(p);
    const first = p.stocks.find((s) => s.available > 0) ?? p.stocks[0];
    if (first) setWarehouseId(first.warehouseId);
  }, [productId]);

  useEffect(() => {
    loadProduct()
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [loadProduct]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    pollRef.current = setInterval(() => {
      loadProduct().catch(() => {});
    }, 12000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadProduct]);

  async function reserve() {
    if (!user || !warehouseId) return;
    setReserving(true);
    setError(null);
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
        setError(body.error ?? 'Reservation failed');
        return;
      }
      setMessage('Reserved for 10 minutes!');
      router.push('/?tab=reserved');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReserving(false);
    }
  }

  const selectedStock = product?.stocks.find((s) => s.warehouseId === warehouseId);
  const available = selectedStock?.available ?? 0;
  const rating = product ? 4 + (product.sku.charCodeAt(product.sku.length - 1) % 10) / 10 : 4.5;

  return (
    <div className="min-h-screen bg-[#f1f3f6]">
      <SiteHeader activeTab={tab} onTabChange={setTab} reservedCount={0} />

      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <nav className="mb-4 flex items-center gap-1 text-xs text-[#878787]">
          <Link href="/" className="hover:text-[#2874f0]">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span>{product?.category ?? 'Products'}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[#212121]">{product?.name ?? '…'}</span>
        </nav>

        {loading ? (
          <p className="py-20 text-center text-[#878787]">Loading product…</p>
        ) : !product ? (
          <p className="py-20 text-center text-red-600">{error ?? 'Product not found'}</p>
        ) : (
          <div className="grid gap-6 rounded-sm bg-white p-4 shadow-sm lg:grid-cols-2 lg:p-8">
            <div className="relative aspect-square max-h-[480px] w-full bg-[#f8f8f8]">
              <Image
                src={product.imageUrl ?? '/images/placeholder.svg'}
                alt={product.name}
                fill
                className="object-contain p-4"
                priority
                unoptimized={product.imageUrl?.includes('picsum.photos')}
              />
            </div>

            <div>
              <p className="text-sm text-[#878787]">{product.category}</p>
              <h1 className="mt-1 text-2xl font-medium text-[#212121]">{product.name}</h1>
              <div className="mt-2 flex items-center gap-2">
                <span className="flex items-center gap-0.5 rounded-sm bg-[#388e3c] px-1.5 py-0.5 text-sm text-white">
                  {rating.toFixed(1)} <Star className="h-3.5 w-3.5 fill-current" />
                </span>
                <span className="text-sm text-[#878787]">1,240 ratings</span>
              </div>

              <div className="mt-4 border-t border-[#e0e0e0] pt-4">
                <span className="text-3xl font-semibold">₹{product.price.toFixed(0)}</span>
                <span className="ml-2 text-sm text-[#878787] line-through">
                  ₹{Math.round(product.price * 1.15)}
                </span>
              </div>

              <p className="mt-4 text-sm text-[#212121]">{product.description}</p>

              <div className="mt-6">
                <label className="text-sm font-medium text-[#212121]">Fulfillment center</label>
                <select
                  className="mt-1 w-full rounded-sm border border-[#e0e0e0] bg-white px-3 py-2 text-sm"
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                >
                  {product.stocks.map((s) => (
                    <option key={s.warehouseId} value={s.warehouseId} disabled={s.available < 1}>
                      {s.warehouseName} ({s.city}) — {s.available} available
                    </option>
                  ))}
                </select>
              </div>

              {message ? <p className="mt-4 text-sm text-green-700">{message}</p> : null}
              {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!user || available < 1 || reserving}
                  onClick={reserve}
                  className="btn-primary min-w-[180px] px-8 py-3 text-base"
                >
                  {!user ? 'Sign in to reserve' : available < 1 ? 'Sold out' : reserving ? 'Reserving…' : 'Reserve'}
                </button>
                <Link href="/" className="btn-secondary flex items-center px-6 py-3 text-sm">
                  Continue shopping
                </Link>
              </div>

              <div className="mt-8 border-t border-[#e0e0e0] pt-6">
                <h2 className="text-lg font-semibold text-[#212121]">Product details</h2>
                <table className="mt-3 w-full text-sm">
                  <tbody>
                    {product.packSize ? (
                      <tr className="border-b border-[#f0f0f0]">
                        <td className="py-2 pr-4 font-medium text-[#878787]">Pack size</td>
                        <td className="py-2">{product.packSize}</td>
                      </tr>
                    ) : null}
                    {product.material ? (
                      <tr className="border-b border-[#f0f0f0]">
                        <td className="py-2 pr-4 font-medium text-[#878787]">Material / form</td>
                        <td className="py-2">{product.material}</td>
                      </tr>
                    ) : null}
                    {product.ingredients ? (
                      <tr className="border-b border-[#f0f0f0]">
                        <td className="py-2 pr-4 font-medium text-[#878787]">Ingredients</td>
                        <td className="py-2">{product.ingredients}</td>
                      </tr>
                    ) : null}
                    <tr>
                      <td className="py-2 pr-4 font-medium text-[#878787]">SKU</td>
                      <td className="py-2">{product.sku}</td>
                    </tr>
                  </tbody>
                </table>

                {product.highlights && product.highlights.length > 0 ? (
                  <div className="mt-6">
                    <h3 className="font-medium text-[#212121]">Highlights</h3>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[#878787]">
                      {product.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
