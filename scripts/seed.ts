/**
 * Seeds the database with categories, brands, 250 mock products, staff logins
 * and a few sample orders so every screen has something to show.
 *
 *   npm run db:push && npm run db:seed
 */
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { buildCatalogue, CATEGORIES } from "./catalogue";

const {
  categories,
  brands,
  products,
  stockMovements,
  users,
  orders,
  orderItems,
  orderEvents,
  settings,
} = schema;

function slugify(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function createId() {
  return (
    Date.now().toString(36).padStart(8, "0") +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 8)
  ).slice(0, 30);
}

function trackingToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `NT-${pick(4)}-${pick(4)}`;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");

  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
  const pool = new Pool({
    connectionString,
    ...(isLocal ? { ssl: false as const } : {}),
  });
  const db = drizzle(pool, { schema });

  console.log("→ Clearing existing seed data…");
  await db.delete(orderEvents);
  await db.delete(orderItems);
  await db.delete(schema.payments);
  await db.delete(orders);
  await db.delete(stockMovements);
  await db.delete(products);
  await db.delete(brands);
  await db.delete(categories);
  await db.delete(schema.posShifts);
  await db.delete(users);
  await db.delete(settings);

  /* ------------------------------------------------------------ categories */
  console.log("→ Categories…");
  const categoryRows = CATEGORIES.map((c, index) => ({
    id: createId(),
    slug: c.slug,
    nameEn: c.nameEn,
    nameAr: c.nameAr,
    icon: c.icon,
    sortOrder: index,
    active: true,
  }));
  await db.insert(categories).values(categoryRows);
  const categoryBySlug = new Map(categoryRows.map((c) => [c.slug, c.id]));

  /* ---------------------------------------------------------------- brands */
  const catalogue = buildCatalogue();
  const brandNames = [...new Set(catalogue.map((p) => p.brand))].sort();
  console.log(`→ Brands (${brandNames.length})…`);
  const brandRows = brandNames.map((name) => ({
    id: createId(),
    slug: slugify(name),
    name,
  }));
  await db.insert(brands).values(brandRows);
  const brandByName = new Map(brandRows.map((b) => [b.name, b.id]));

  /* -------------------------------------------------------------- products */
  console.log(`→ Products (${catalogue.length})…`);
  const productRows = catalogue.map((p) => ({
    id: createId(),
    sku: p.sku,
    barcode: p.barcode,
    slug: p.slug,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    descEn: p.descEn,
    descAr: p.descAr,
    categoryId: categoryBySlug.get(p.categorySlug)!,
    brandId: brandByName.get(p.brand)!,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    cost: p.cost,
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    warrantyMonths: p.warrantyMonths,
    images: [] as string[],
    specs: p.specs,
    active: p.active,
    featured: p.featured,
  }));

  for (let i = 0; i < productRows.length; i += 50) {
    await db.insert(products).values(productRows.slice(i, i + 50));
  }

  console.log("→ Opening stock movements…");
  const movementRows = productRows.map((p) => ({
    id: createId(),
    productId: p.id,
    delta: p.stock,
    balance: p.stock,
    type: "INITIAL" as const,
    reference: "OPENING",
    note: "Opening stock loaded from seed catalogue",
  }));
  for (let i = 0; i < movementRows.length; i += 50) {
    await db.insert(stockMovements).values(movementRows.slice(i, i + 50));
  }

  /* ----------------------------------------------------------------- staff */
  console.log("→ Staff accounts…");
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Navkar@2026";
  const staff = [
    { email: "admin@navkartrading.qa", name: "Store Owner", role: "ADMIN" as const },
    { email: "manager@navkartrading.qa", name: "Inventory Manager", role: "MANAGER" as const },
    { email: "cashier@navkartrading.qa", name: "Counter Salesman", role: "CASHIER" as const },
  ];
  const hash = await bcrypt.hash(adminPassword, 10);
  const userRows = staff.map((s) => ({ id: createId(), ...s, passwordHash: hash, active: true }));
  await db.insert(users).values(userRows);

  /* ---------------------------------------------------------- sample orders */
  console.log("→ Sample orders…");
  const statuses = [
    "PENDING",
    "CONFIRMED",
    "PACKED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "COMPLETED",
  ] as const;
  const names = [
    "Ahmed Al-Kuwari",
    "Priya Nair",
    "Mohammed Rahman",
    "Fatima Al-Sulaiti",
    "Rajesh Kumar",
    "Sara Abdullah",
    "John Mathew",
    "Noor Al-Mansoori",
  ];

  for (let n = 0; n < 12; n++) {
    const isPos = n % 3 === 0;
    const picks = Array.from({ length: 1 + (n % 3) }, () => {
      const p = productRows[Math.floor(Math.random() * productRows.length)];
      const qty = 1 + (Math.random() < 0.25 ? 1 : 0);
      return { p, qty };
    });

    const subtotalFils = picks.reduce(
      (sum, { p, qty }) => sum + Math.round(Number(p.price) * 100) * qty,
      0,
    );
    const deliveryFils = isPos ? 0 : subtotalFils >= 30000 ? 0 : 2500;
    const totalFils = subtotalFils + deliveryFils;
    const status = statuses[n % statuses.length];
    const daysAgo = 14 - n;
    const createdAt = new Date(Date.now() - daysAgo * 86400000 - n * 3600000);

    const orderId = createId();
    await db.insert(orders).values({
      id: orderId,
      orderNumber: `NT-${createdAt.toISOString().slice(2, 10).replace(/-/g, "")}-${String(1000 + n)}`,
      trackingToken: trackingToken(),
      channel: isPos ? "POS" : "ONLINE",
      status: isPos ? "COMPLETED" : status,
      paymentStatus: isPos || status === "COMPLETED" ? "PAID" : "UNPAID",
      paymentMethod: isPos ? (n % 2 === 0 ? "CASH" : "CARD_POS") : n % 2 === 0 ? "COD" : "CARD_ONLINE",
      customerName: isPos ? "Walk-in customer" : names[n % names.length],
      customerPhone: `3${String(3000000 + n * 7919).slice(0, 7)}`,
      customerEmail: isPos ? null : `customer${n}@example.com`,
      addressLine: isPos ? null : `Villa ${10 + n}, near Al Meera`,
      zone: isPos ? null : String(20 + n),
      streetNumber: isPos ? null : String(300 + n * 3),
      buildingNumber: isPos ? null : String(10 + n),
      city: "Doha",
      subtotal: (subtotalFils / 100).toFixed(2),
      deliveryFee: (deliveryFils / 100).toFixed(2),
      discount: "0.00",
      total: (totalFils / 100).toFixed(2),
      cashierId: isPos ? userRows[2].id : null,
      cashReceived: isPos && n % 2 === 0 ? (Math.ceil(totalFils / 10000) * 100).toFixed(2) : null,
      createdAt,
      updatedAt: createdAt,
    });

    await db.insert(orderItems).values(
      picks.map(({ p, qty }) => ({
        id: createId(),
        orderId,
        productId: p.id,
        sku: p.sku,
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        unitPrice: p.price,
        qty,
        lineTotal: (Math.round(Number(p.price) * 100) * qty / 100).toFixed(2),
      })),
    );

    const flow = statuses.slice(0, statuses.indexOf(status as (typeof statuses)[number]) + 1);
    await db.insert(orderEvents).values(
      (isPos ? (["COMPLETED"] as const) : flow).map((s, idx) => ({
        id: createId(),
        orderId,
        status: s,
        note: null,
        createdAt: new Date(createdAt.getTime() + idx * 7200000),
      })),
    );
  }

  /* -------------------------------------------------------------- settings */
  await db.insert(settings).values([
    { key: "delivery", value: { fee: "25.00", freeOver: "300.00" } },
    { key: "shop", value: { name: "Navkar Trading", city: "Doha", country: "QA" } },
  ]);

  const total = productRows.length;
  const outOfStock = productRows.filter((p) => p.stock === 0).length;
  const low = productRows.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length;

  console.log("\n✅ Seed complete");
  console.log(`   ${total} products · ${outOfStock} out of stock · ${low} low stock`);
  console.log(`   ${categoryRows.length} categories · ${brandRows.length} brands · 12 sample orders`);
  console.log("\n   Staff logins (password for all three):");
  console.log(`   ${adminPassword}`);
  for (const u of staff) console.log(`   ${u.role.padEnd(8)} ${u.email}`);
  console.log("\n   ⚠️  Change these passwords before going live.\n");

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
