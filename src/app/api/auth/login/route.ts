import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createSessionToken, sessionCookieOptions, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = await createSessionToken({ id: user.id, email: user.email, name: user.name });
    const response = NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
    });
    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch (err) {
    console.error('[AUTH_LOGIN]', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
