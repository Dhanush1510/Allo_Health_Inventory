'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';
import type { Product } from '@/types';

export function ProductCard({
  product,
  onReserve,
  reserving,
  signedIn,
}: {
  product: Product;
  onReserve: (productId: string, warehouseId: string) => void;
  reserving: boolean;
  signedIn: boolean;
}) {
  const available = product.stocks.reduce((s, st) => s + st.available, 0);
  const best = product.stocks.find((st) => st.available > 0) ?? product.stocks[0];
  const rating = 4 + (product.sku.charCodeAt(product.sku.length - 1) % 10) / 10;

  return (
    <article className="product-card flex flex-col overflow-hidden rounded-sm">
      <Link href={`/product/${product.id}`} className="relative block aspect-square bg-[#f8f8f8]">
        <Image
          src={product.imageUrl ?? '/images/placeholder.svg'}
          alt={product.name}
          fill
          sizes="(max-width:768px) 50vw, 20vw"
          className="object-cover p-2"
          unoptimized={product.imageUrl?.includes('picsum.photos')}
        />
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <Link href={`/product/${product.id}`} className="line-clamp-2 text-sm text-[#212121] hover:text-[#2874f0]">
          {product.name}
        </Link>
        <div className="mt-1 flex items-center gap-1 text-xs text-[#388e3c]">
          <span className="flex items-center gap-0.5 rounded-sm bg-[#388e3c] px-1 py-0.5 text-white">
            {rating.toFixed(1)} <Star className="h-3 w-3 fill-current" />
          </span>
          <span className="text-[#878787]">(120)</span>
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-[#878787]">{product.description}</p>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-lg font-semibold text-[#212121]">₹{product.price.toFixed(0)}</span>
          <span className="text-xs text-[#878787] line-through">₹{Math.round(product.price * 1.2)}</span>
        </div>
        <p className="text-[10px] text-[#878787]">{available > 0 ? `${available} in stock` : 'Out of stock'}</p>
        <button
          type="button"
          disabled={!signedIn || !best || best.available < 1 || reserving}
          onClick={() => best && onReserve(product.id, best.warehouseId)}
          className="btn-primary mt-2 w-full py-2 text-sm"
        >
          {!signedIn ? 'Sign in to reserve' : available < 1 ? 'Sold out' : reserving ? 'Reserving…' : 'Reserve'}
        </button>
      </div>
    </article>
  );
}
