import 'dotenv/config';
import { prisma } from '../src/lib/db';

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=400&h=400&fit=crop&q=80`;

const catalog = [
  {
    sku: 'ALLO-M-BST-01',
    name: "Men's Health Booster",
    description: 'Daily stamina & heart support. 30 packets.',
    price: 1899,
    imageUrl: img('1571019613454-1cb2f99b2d8b'),
    stock: { mumbai: 50, bangalore: 30, delhi: 20 },
  },
  {
    sku: 'ALLO-W-BDL-02',
    name: "Women's Wellness Bundle",
    description: 'Energy, skin & hair nutrients in one kit.',
    price: 2450,
    imageUrl: img('1556228578-8c89e734dfe3'),
    stock: { mumbai: 15, bangalore: 25, delhi: 10 },
  },
  {
    sku: 'ALLO-STR-GMY-03',
    name: 'Stress Relief Gummies',
    description: 'Ashwagandha + L-theanine. 60 gummies.',
    price: 899,
    imageUrl: img('1556909114-f6e7ad7d9346'),
    stock: { mumbai: 1, bangalore: 2, delhi: 0 },
  },
  {
    sku: 'ALLO-VIT-DLY-04',
    name: 'Daily Multi-Vitamins',
    description: 'Essential minerals for everyday balance.',
    price: 1299,
    imageUrl: img('1584308664894-14d9f170e9ee'),
    stock: { mumbai: 12, bangalore: 18, delhi: 15 },
  },
  {
    sku: 'ALLO-OMG-05',
    name: 'Omega-3 Fish Oil',
    description: 'EPA/DHA for brain & joint health.',
    price: 1099,
    imageUrl: img('1505751172876-4aef2b4e1c82'),
    stock: { mumbai: 22, bangalore: 18, delhi: 14 },
  },
  {
    sku: 'ALLO-PRO-06',
    name: 'Probiotic Gut Balance',
    description: '10B CFU strains for digestion.',
    price: 1199,
    imageUrl: img('1622484212008-6969d325fae0'),
    stock: { mumbai: 20, bangalore: 16, delhi: 12 },
  },
  {
    sku: 'ALLO-SLP-07',
    name: 'Sleep Support',
    description: 'Melatonin blend for restful nights.',
    price: 749,
    imageUrl: img('154178324103-b46d9ff0380a'),
    stock: { mumbai: 25, bangalore: 20, delhi: 18 },
  },
  {
    sku: 'ALLO-PRT-08',
    name: 'Protein Recovery Shake',
    description: 'Plant protein post-workout fuel.',
    price: 1599,
    imageUrl: img('1593095948074-395c9fd8f309'),
    stock: { mumbai: 14, bangalore: 22, delhi: 11 },
  },
  {
    sku: 'ALLO-VTC-09',
    name: 'Vitamin C Immunity',
    description: 'High-potency C with zinc.',
    price: 649,
    imageUrl: img('1615485508299-6d40a0fcb3f4'),
    stock: { mumbai: 40, bangalore: 35, delhi: 28 },
  },
  {
    sku: 'ALLO-COL-10',
    name: 'Hair & Skin Collagen',
    description: 'Marine collagen peptides.',
    price: 1799,
    imageUrl: img('1522335781002-4e337f0222e7'),
    stock: { mumbai: 16, bangalore: 14, delhi: 10 },
  },
  {
    sku: 'ALLO-JNT-11',
    name: 'Joint Flex',
    description: 'Glucosamine for mobility support.',
    price: 1349,
    imageUrl: img('1574680096145-05c25b8a3a0a'),
    stock: { mumbai: 11, bangalore: 13, delhi: 9 },
  },
  {
    sku: 'ALLO-IRN-12',
    name: 'Iron + Folate Boost',
    description: 'Gentle iron for active lifestyles.',
    price: 799,
    imageUrl: img('1587854695756-39c4001ea228'),
    stock: { mumbai: 19, bangalore: 17, delhi: 15 },
  },
  {
    sku: 'ALLO-KID-13',
    name: 'Kids Daily Gummies',
    description: 'Fruit-flavored kids multivitamin.',
    price: 699,
    imageUrl: img('1503454537194-1dcb0c5c2e0f'),
    stock: { mumbai: 28, bangalore: 24, delhi: 20 },
  },
  {
    sku: 'ALLO-HYD-14',
    name: 'Electrolyte Hydration',
    description: 'Zero-sugar hydration mix sachets.',
    price: 549,
    imageUrl: img('1622484212008-6969d325fae0'),
    stock: { mumbai: 35, bangalore: 30, delhi: 25 },
  },
];

async function main() {
  console.log('Seeding started...');

  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.idempotency.deleteMany();
  await prisma.user.deleteMany();

  const whMumbai = await prisma.warehouse.create({
    data: { name: 'Mumbai FC', code: 'WH-BOM', city: 'Mumbai' },
  });
  const whBangalore = await prisma.warehouse.create({
    data: { name: 'Bangalore Hub', code: 'WH-BLR', city: 'Bangalore' },
  });
  const whDelhi = await prisma.warehouse.create({
    data: { name: 'Delhi Warehouse', code: 'WH-DEL', city: 'Delhi' },
  });

  const wh = { mumbai: whMumbai.id, bangalore: whBangalore.id, delhi: whDelhi.id };

  for (const item of catalog) {
    const product = await prisma.product.create({
      data: {
        sku: item.sku,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
      },
    });

    await prisma.stock.createMany({
      data: [
        { productId: product.id, warehouseId: wh.mumbai, total: item.stock.mumbai, reserved: 0 },
        { productId: product.id, warehouseId: wh.bangalore, total: item.stock.bangalore, reserved: 0 },
        { productId: product.id, warehouseId: wh.delhi, total: item.stock.delhi, reserved: 0 },
      ],
    });
  }

  console.log(`Seeded ${catalog.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
