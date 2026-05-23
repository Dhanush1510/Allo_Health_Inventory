'use client';

import Link from 'next/link';
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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050b14]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-sm font-bold text-[#050b14]">
            A
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">Allo Health</span>
        </Link>

        <nav className="flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/5 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-emerald-500/90 to-cyan-500/90 text-[#050b14]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {tab.label}
              {tab.id === 'reserved' && reservedCount > 0 ? (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {reservedCount}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {loading ? (
            <span className="text-slate-400">…</span>
          ) : user ? (
            <>
              <span className="hidden text-slate-300 sm:inline">Hi, {user.name.split(' ')[0]}</span>
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-full border border-white/15 px-4 py-2 text-slate-200 transition hover:bg-white/10"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-white/15 px-4 py-2 text-slate-200 transition hover:bg-white/10"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 font-medium text-[#050b14]"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
