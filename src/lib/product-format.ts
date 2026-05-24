import type { Prisma } from '@/generated/prisma';

type ProductWithStocks = Prisma.ProductGetPayload<{
  include: { stocks: { include: { warehouse: true } } };
}>;

export function formatProduct(prod: ProductWithStocks) {
  const highlights = prod.highlights ? (JSON.parse(prod.highlights) as string[]) : [];

  return {
    id: prod.id,
    sku: prod.sku,
    name: prod.name,
    description: prod.description,
    price: prod.price,
    imageUrl: prod.imageUrl,
    category: prod.category,
    packSize: prod.packSize,
    ingredients: prod.ingredients,
    material: prod.material,
    highlights,
    stocks: prod.stocks.map((stk) => ({
      warehouseId: stk.warehouseId,
      warehouseName: stk.warehouse.name,
      warehouseCode: stk.warehouse.code,
      city: stk.warehouse.city,
      total: stk.total,
      reserved: stk.reserved,
      available: Math.max(stk.total - stk.reserved, 0),
    })),
  };
}
