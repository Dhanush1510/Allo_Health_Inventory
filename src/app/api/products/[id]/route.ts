import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { releaseExpiredReservations } from '@/lib/cleanup';
import { formatProduct } from '@/lib/product-format';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await releaseExpiredReservations();

    const product = await prisma.product.findUnique({
      where: { id },
      include: { stocks: { include: { warehouse: true } } },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(formatProduct(product));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API_PRODUCTS_ID_GET]', err);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
