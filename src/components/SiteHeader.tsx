'use client';

import Link from 'next/link';
import { Search, ShoppingCart, User } from 'lucide-react';

const GITHUB_REPO = 'https://github.com/Dhanush1510/Allo_Health_Inventory';

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
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
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 sm:px-6">
          <div className="flex items-center gap-1">
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
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 flex items-center gap-1.5 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-[#878787] transition hover:border-[#2874f0] hover:text-[#2874f0]"
              aria-label="View source code on GitHub"
              title="GitHub repository"
            >
              <GitHubIcon className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </nav>
    </header>
  );
}
