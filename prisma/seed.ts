import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  console.log("Seeding started...");

  // Clean the database
  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.idempotency.deleteMany();

  console.log("Database cleared.");

  // Create Warehouses
  const whMumbai = await prisma.warehouse.create({
    data: { name: "Mumbai Fulfillment Center", code: "WH-BOM", city: "Mumbai" }
  });

  const whBangalore = await prisma.warehouse.create({
    data: { name: "Bangalore Logistics Hub", code: "WH-BLR", city: "Bangalore" }
  });

  const whDelhi = await prisma.warehouse.create({
    data: { name: "Delhi National Warehouse", code: "WH-DEL", city: "Delhi" }
  });

  console.log("Warehouses seeded.");

  // Create Products
  const p1 = await prisma.product.create({
    data: {
      sku: "ALLO-M-BST-01",
      name: "Allo Men's Health Booster Pack",
      description: "A premium daily wellness blend curated specifically for men's hormonal health, stamina, and cardiovascular support. Contains 30 packets.",
      price: 1899.00,
      imageUrl: "/images/placeholder.svg"
    }
  });

  const p2 = await prisma.product.create({
    data: {
      sku: "ALLO-W-BDL-02",
      name: "Allo Women's Wellness Bundle",
      description: "A comprehensive nutrient bundle designed for women. Formulated to enhance energy levels, improve skin and hair health, and support balanced nutrition.",
      price: 2450.00,
      imageUrl: "/images/placeholder.svg"
    }
  });

  const p3 = await prisma.product.create({
    data: {
      sku: "ALLO-STR-GMY-03",
      name: "Allo Stress Relief Gummies",
      description: "Organic, vegan ashwagandha and L-theanine gummies to combat daily work-stress, induce calm, and improve sleep quality naturally. 60 chewable gummies.",
      price: 899.00,
      imageUrl: "/images/placeholder.svg"
    }
  });

  const p4 = await prisma.product.create({
    data: {
      sku: "ALLO-VIT-DLY-04",
      name: "Allo Premium Daily Multi-Vitamins",
      description: "Essential micro-nutrients, minerals, and antioxidants for daily systemic support. Pure cold-pressed formula with 100% bio-availability.",
      price: 1299.00,
      imageUrl: "/images/placeholder.svg"
    }
  });

  console.log("Products seeded.");

  // Create Stock Levels
  // Product 1 (Men's Health Booster) - High stock
  await prisma.stock.createMany({
    data: [
      { productId: p1.id, warehouseId: whMumbai.id, total: 50, reserved: 0 },
      { productId: p1.id, warehouseId: whBangalore.id, total: 30, reserved: 0 },
      { productId: p1.id, warehouseId: whDelhi.id, total: 20, reserved: 0 }
    ]
  });

  // Product 2 (Women's Wellness) - Mid stock
  await prisma.stock.createMany({
    data: [
      { productId: p2.id, warehouseId: whMumbai.id, total: 15, reserved: 0 },
      { productId: p2.id, warehouseId: whBangalore.id, total: 25, reserved: 0 },
      { productId: p2.id, warehouseId: whDelhi.id, total: 10, reserved: 0 }
    ]
  });

  // Product 3 (Stress Relief Gummies) - Low stock for concurrency testing! (E.g. only 1 item in Mumbai, 2 items in Bangalore)
  await prisma.stock.createMany({
    data: [
      { productId: p3.id, warehouseId: whMumbai.id, total: 1, reserved: 0 },
      { productId: p3.id, warehouseId: whBangalore.id, total: 2, reserved: 0 },
      { productId: p3.id, warehouseId: whDelhi.id, total: 0, reserved: 0 }
    ]
  });

  // Product 4 (Daily Multi-Vitamins) - Moderate stock
  await prisma.stock.createMany({
    data: [
      { productId: p4.id, warehouseId: whMumbai.id, total: 12, reserved: 0 },
      { productId: p4.id, warehouseId: whBangalore.id, total: 18, reserved: 0 },
      { productId: p4.id, warehouseId: whDelhi.id, total: 15, reserved: 0 }
    ]
  });

  console.log("Stock levels seeded.");
  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
