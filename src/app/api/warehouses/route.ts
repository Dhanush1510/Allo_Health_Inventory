import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(warehouses);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API_WAREHOUSES_GET] Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', details: message },
      { status: 500 }
    );
  }
}
