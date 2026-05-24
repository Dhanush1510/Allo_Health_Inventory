'use client';

import Link from 'next/link';
import { Search, ShoppingCart, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { TabId } from '@/types';

const tabs: { id: TabId; label: string }[] = [
  { id: 'shop', label: 'Shop' },
  { id: 'reserved', label: 'Reserved' },
  { id: 'orders', label: 'Orders' },
];

export function SiteHeader({
  activeTab,
  onTabChange,
  reservedCount,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  reservedCount: number;
}) {
  const { user, loading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-[#2874f0] text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0 text-xl font-bold italic tracking-tight">
          Allo<span className="text-[#ffe500]">Health</span>
        </Link>

        <div className="hidden flex-1 items-center md:flex">
          <div className="flex w-full max-w-2xl overflow-hidden rounded-sm bg-white">
            <input
              type="search"
              placeholder="Search wellness products..."
              className="flex-1 px-4 py-2 text-sm text-[#212121] outline-none"
              readOnly
            />
            <button type="button" className="bg-[#ffe500] px-5 text-[#2874f0]" aria-label="Search">
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          {loading ? (
            <span className="text-sm opacity-80">…</span>
          ) : user ? (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden text-sm sm:inline">{user.name.split(' ')[0]}</span>
              <button type="button" onClick={() => logout()} className="text-xs underline opacity-90">
                Sign out
              </button>
            </div>
          ) : (
            <Link href="/login" className="text-sm font-medium hover:underline">
              Sign in
            </Link>
          )}

          <button
            type="button"
            onClick={() => onTabChange('reserved')}
            className="relative flex items-center gap-1 rounded-sm px-2 py-1 hover:bg-white/10"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="hidden text-sm sm:inline">Reserved</span>
            {reservedCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ffe500] px-1 text-[10px] font-bold text-[#212121]">
                {reservedCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <nav className="border-t border-white/20 bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 px-4 sm:px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'border-[#2874f0] text-[#2874f0]'
                  : 'border-transparent text-[#878787] hover:text-[#2874f0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
}
