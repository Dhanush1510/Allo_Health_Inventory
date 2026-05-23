import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createSessionToken, hashPassword, sessionCookieOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  phone: z.string().max(20).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const { name, email, password, phone } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
        phone,
      },
    });

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
    console.error('[AUTH_REGISTER]', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
