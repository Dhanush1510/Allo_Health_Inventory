import { NextResponse } from 'next/server';
import { getSessionUser, type SessionUser } from '@/lib/auth';

export async function requireUser(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  return user;
}
