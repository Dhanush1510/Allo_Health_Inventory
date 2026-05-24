import 'dotenv/config';
import { prisma } from '../src/lib/db';

const img = (fileName: string) => `/images/products/${fileName}.jpg`;

const catalog = [
  {
    sku: 'ALLO-M-BST-01',
    name: "Men's Health Booster",
    description: 'Daily stamina & heart support.',
    price: 1899,
    category: 'Men\'s Health',
    packSize: '30 sachets',
    ingredients: 'Ashwagandha, Zinc, Vitamin D3, L-Arginine',
    material: 'Plant-based capsules, vegetarian',
    highlights: ['Supports energy', 'Heart health blend', 'No artificial colors'],
    imageUrl: img('allo-mens-booster'),
    stock: { mumbai: 50, bangalore: 30, delhi: 20 },
  },
  {
    sku: 'ALLO-W-BDL-02',
    name: "Women's Wellness Bundle",
    description: 'Complete daily nutrition for women.',
    price: 2450,
    category: 'Women\'s Health',
    packSize: '1 box (45 days)',
    ingredients: 'Iron, Folic acid, Biotin, Calcium',
    material: 'Tablets with plant cellulose coating',
    highlights: ['Hair & skin support', 'Energy boost', 'Gynecologist reviewed'],
    imageUrl: img('allo-womens-bundle'),
    stock: { mumbai: 15, bangalore: 25, delhi: 10 },
  },
  {
    sku: 'ALLO-STR-GMY-03',
    name: 'Stress Relief Gummies',
    description: 'Calm focus without drowsiness.',
    price: 899,
    category: 'Stress & Sleep',
    packSize: '60 gummies',
    ingredients: 'Ashwagandha KSM-66, L-Theanine',
    material: 'Pectin-based vegan gummies',
    highlights: ['Non-habit forming', 'Natural fruit flavor', 'Sugar controlled'],
    imageUrl: img('allo-stress-gummies'),
    stock: { mumbai: 1, bangalore: 2, delhi: 0 },
  },
  {
    sku: 'ALLO-VIT-DLY-04',
    name: 'Daily Multi-Vitamins',
    description: 'One tablet, full-spectrum nutrients.',
    price: 1299,
    category: 'Vitamins',
    packSize: '90 tablets',
    ingredients: 'A-Z vitamins, Selenium, Chromium',
    material: 'Film-coated tablets',
    highlights: ['Once daily', 'High absorption', 'FSSAI certified'],
    imageUrl: img('allo-daily-vitamins'),
    stock: { mumbai: 12, bangalore: 18, delhi: 15 },
  },
  {
    sku: 'ALLO-OMG-05',
    name: 'Omega-3 Fish Oil',
    description: 'Triple-strength EPA & DHA.',
    price: 1099,
    category: 'Heart & Brain',
    packSize: '60 softgels',
    ingredients: 'Fish oil 1000mg, Vitamin E',
    material: 'Enteric-coated soft gelatin',
    highlights: ['Mercury tested', 'No fishy aftertaste', 'Joint support'],
    imageUrl: img('allo-omega3'),
    stock: { mumbai: 22, bangalore: 18, delhi: 14 },
  },
  {
    sku: 'ALLO-PRO-06',
    name: 'Probiotic Gut Balance',
    description: '10 billion CFU per capsule.',
    price: 1199,
    category: 'Digestive',
    packSize: '30 capsules',
    ingredients: 'Lactobacillus, Bifidobacterium blend',
    material: 'Acid-resistant veggie caps',
    highlights: ['Shelf stable', 'Bloating relief', 'Clinically studied strains'],
    imageUrl: img('allo-probiotic'),
    stock: { mumbai: 20, bangalore: 16, delhi: 12 },
  },
  {
    sku: 'ALLO-SLP-07',
    name: 'Sleep Support',
    description: 'Fall asleep faster, wake refreshed.',
    price: 749,
    category: 'Stress & Sleep',
    packSize: '30 tablets',
    ingredients: 'Melatonin 3mg, Chamomile extract',
    material: 'Fast-dissolve tablets',
    highlights: ['Non-groggy mornings', 'Travel friendly', 'Melatonin balanced dose'],
    imageUrl: img('allo-sleep'),
    stock: { mumbai: 25, bangalore: 20, delhi: 18 },
  },
  {
    sku: 'ALLO-PRT-08',
    name: 'Protein Recovery Shake',
    description: '24g plant protein per serving.',
    price: 1599,
    category: 'Fitness',
    packSize: '1 kg pouch',
    ingredients: 'Pea protein, Rice protein, BCAA',
    material: 'Recyclable stand-up pouch',
    highlights: ['Chocolate flavor', 'No added sugar', 'Post-workout ready'],
    imageUrl: img('allo-protein'),
    stock: { mumbai: 14, bangalore: 22, delhi: 11 },
  },
  {
    sku: 'ALLO-VTC-09',
    name: 'Vitamin C Immunity',
    description: '1000mg vitamin C with zinc.',
    price: 649,
    category: 'Immunity',
    packSize: '20 effervescent tabs',
    ingredients: 'Ascorbic acid, Zinc sulphate',
    material: 'Effervescent tablets',
    highlights: ['Orange flavor', 'Rapid absorption', 'Seasonal immunity'],
    imageUrl: img('allo-vitaminc'),
    stock: { mumbai: 40, bangalore: 35, delhi: 28 },
  },
  {
    sku: 'ALLO-COL-10',
    name: 'Hair & Skin Collagen',
    description: 'Marine collagen peptides.',
    price: 1799,
    category: 'Beauty',
    packSize: '250g powder',
    ingredients: 'Type I & III collagen, Hyaluronic acid',
    material: 'Tin with scoop',
    highlights: ['Unflavored mix', 'Skin elasticity', 'Nail strength'],
    imageUrl: img('allo-collagen'),
    stock: { mumbai: 16, bangalore: 14, delhi: 10 },
  },
  {
    sku: 'ALLO-JNT-11',
    name: 'Joint Flex',
    description: 'Mobility support for active adults.',
    price: 1349,
    category: 'Joint Care',
    packSize: '60 tablets',
    ingredients: 'Glucosamine, Chondroitin, MSM',
    material: 'Coated tablets',
    highlights: ['Cartilage support', 'For runners & seniors', 'Long-term use safe'],
    imageUrl: img('allo-joint'),
    stock: { mumbai: 11, bangalore: 13, delhi: 9 },
  },
  {
    sku: 'ALLO-IRN-12',
    name: 'Iron + Folate Boost',
    description: 'Gentle iron for low energy.',
    price: 799,
    category: 'Women\'s Health',
    packSize: '30 tablets',
    ingredients: 'Ferrous bisglycinate, Folic acid, B12',
    material: 'Slow-release tablets',
    highlights: ['Less gastric upset', 'Pregnancy safe formula', 'Energy support'],
    imageUrl: img('allo-iron'),
    stock: { mumbai: 19, bangalore: 17, delhi: 15 },
  },
  {
    sku: 'ALLO-KID-13',
    name: 'Kids Daily Gummies',
    description: 'Fun multivitamin for ages 4+.',
    price: 699,
    category: 'Kids',
    packSize: '50 gummies',
    ingredients: 'Vitamins A, C, D, Zinc',
    material: 'Gelatin-free gummies',
    highlights: ['Berry flavor', 'No artificial sweeteners', 'Pediatrician approved'],
    imageUrl: img('allo-kids-gummies'),
    stock: { mumbai: 28, bangalore: 24, delhi: 20 },
  },
  {
    sku: 'ALLO-HYD-14',
    name: 'Electrolyte Hydration',
    description: 'Rehydrate after workouts or heat.',
    price: 549,
    category: 'Hydration',
    packSize: '12 sachets',
    ingredients: 'Sodium, Potassium, Magnesium, Vitamin B6',
    material: 'Individual sachets',
    highlights: ['Lemon-lime taste', 'Zero sugar', 'Rapid electrolyte balance'],
    imageUrl: img('allo-electrolyte'),
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
        category: item.category,
        packSize: item.packSize,
        ingredients: item.ingredients,
        material: item.material,
        highlights: JSON.stringify(item.highlights),
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
