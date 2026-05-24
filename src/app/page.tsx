'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Storefront } from '@/components/Storefront';
import type { TabId } from '@/types';

function HomeContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab =
    tabParam === 'reserved' || tabParam === 'orders' || tabParam === 'shop'
      ? (tabParam as TabId)
      : undefined;
  return <Storefront initialTab={initialTab} />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f1f3f6]" />}>
      <HomeContent />
    </Suspense>
  );
}
