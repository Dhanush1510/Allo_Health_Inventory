'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : { name: form.name, email: form.email, password: form.password, phone: form.phone || undefined };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Request failed');
        return;
      }
      await refresh();
      router.push('/');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f1f3f6] px-4 py-12">
      <div className="w-full max-w-md rounded-sm bg-white p-8 shadow-md">
        <Link href="/" className="text-xl font-bold italic text-[#2874f0]">
          Allo<span className="text-[#ffe500]">Health</span>
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-[#212121]">
          {mode === 'login' ? 'Login' : 'Create account'}
        </h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === 'register' ? (
            <>
              <label className="block text-sm font-medium text-[#212121]">
                Full name
                <input
                  className="auth-input mt-1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-[#212121]">
                Phone (optional)
                <input
                  className="auth-input mt-1"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
            </>
          ) : null}
          <label className="block text-sm font-medium text-[#212121]">
            Email
            <input
              type="email"
              className="auth-input mt-1"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label className="block text-sm font-medium text-[#212121]">
            Password
            <input
              type="password"
              className="auth-input mt-1"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={mode === 'register' ? 8 : 1}
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm">
            {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[#878787]">
          {mode === 'login' ? (
            <>
              New customer?{' '}
              <Link href="/register" className="text-[#2874f0] font-medium">
                Start here
              </Link>
            </>
          ) : (
            <>
              Already registered?{' '}
              <Link href="/login" className="text-[#2874f0] font-medium">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
