import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { releaseExpiredReservations } from '@/lib/cleanup';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Run lazy cleanup of expired reservations to ensure real-time stock accuracy
    await releaseExpiredReservations();

    // 2. Fetch products along with stock levels and warehouse details
    const products = await prisma.product.findMany({
      include: {
        stocks: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 3. Format the stock counts and compute available units
    const formatted = products.map((prod) => {
      const formattedStocks = prod.stocks.map((stk) => ({
        warehouseId: stk.warehouseId,
        warehouseName: stk.warehouse.name,
        warehouseCode: stk.warehouse.code,
        city: stk.warehouse.city,
        total: stk.total,
        reserved: stk.reserved,
        available: Math.max(stk.total - stk.reserved, 0),
      }));

      return {
        id: prod.id,
        sku: prod.sku,
        name: prod.name,
        description: prod.description,
        price: prod.price,
        imageUrl: prod.imageUrl,
        stocks: formattedStocks,
      };
    });

    return NextResponse.json(formatted);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API_PRODUCTS_GET] Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', details: message },
      { status: 500 }
    );
  }
}
