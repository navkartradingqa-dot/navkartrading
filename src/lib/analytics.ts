import "server-only";
import { and, desc, eq, gte, sql, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, products, categories } from "@/db/schema";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000);
}

const NOT_CANCELLED = and(ne(orders.status, "CANCELLED"), ne(orders.status, "REFUNDED"));

export async function getDashboardStats() {
  const today = startOfDay();

  const [
    todayRow,
    weekRow,
    monthRow,
    statusRows,
    channelRows,
    stockRow,
    lowStock,
    topProducts,
    recentOrders,
    daily,
  ] = await Promise.all([
    db
      .select({
        revenue: sql<string>`coalesce(sum(${orders.total}), 0)::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(and(gte(orders.createdAt, today), NOT_CANCELLED)),

    db
      .select({
        revenue: sql<string>`coalesce(sum(${orders.total}), 0)::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(and(gte(orders.createdAt, daysAgo(7)), NOT_CANCELLED)),

    db
      .select({
        revenue: sql<string>`coalesce(sum(${orders.total}), 0)::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(and(gte(orders.createdAt, daysAgo(30)), NOT_CANCELLED)),

    db
      .select({ status: orders.status, count: sql<number>`count(*)::int` })
      .from(orders)
      .groupBy(orders.status),

    db
      .select({
        channel: orders.channel,
        revenue: sql<string>`coalesce(sum(${orders.total}), 0)::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(and(gte(orders.createdAt, daysAgo(30)), NOT_CANCELLED))
      .groupBy(orders.channel),

    db
      .select({
        skus: sql<number>`count(*)::int`,
        units: sql<number>`coalesce(sum(${products.stock}), 0)::int`,
        retailValue: sql<string>`coalesce(sum(${products.stock} * ${products.price}), 0)::text`,
        costValue: sql<string>`coalesce(sum(${products.stock} * ${products.cost}), 0)::text`,
        outOfStock: sql<number>`count(*) filter (where ${products.stock} = 0)::int`,
        lowStock: sql<number>`count(*) filter (where ${products.stock} > 0 and ${products.stock} <= ${products.lowStockThreshold})::int`,
      })
      .from(products)
      .where(eq(products.active, true)),

    db
      .select({
        id: products.id,
        sku: products.sku,
        nameEn: products.nameEn,
        stock: products.stock,
        threshold: products.lowStockThreshold,
        price: products.price,
        category: categories.nameEn,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(eq(products.active, true), sql`${products.stock} <= ${products.lowStockThreshold}`),
      )
      .orderBy(products.stock)
      .limit(12),

    db
      .select({
        sku: orderItems.sku,
        name: orderItems.nameEn,
        units: sql<number>`sum(${orderItems.qty})::int`,
        revenue: sql<string>`sum(${orderItems.lineTotal})::text`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(gte(orders.createdAt, daysAgo(30)), NOT_CANCELLED))
      .groupBy(orderItems.sku, orderItems.nameEn)
      .orderBy(desc(sql`sum(${orderItems.qty})`))
      .limit(8),

    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        total: orders.total,
        status: orders.status,
        channel: orders.channel,
        paymentStatus: orders.paymentStatus,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(10),

    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
        revenue: sql<string>`coalesce(sum(${orders.total}), 0)::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(and(gte(orders.createdAt, daysAgo(14)), NOT_CANCELLED))
      .groupBy(sql`date_trunc('day', ${orders.createdAt})`)
      .orderBy(sql`date_trunc('day', ${orders.createdAt})`),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, r.count]));

  // Fill gaps so the chart has one bar per day.
  const series: { day: string; revenue: number; count: number }[] = [];
  const map = new Map(daily.map((d) => [d.day, d]));
  for (let i = 13; i >= 0; i--) {
    const key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const row = map.get(key);
    series.push({
      day: key,
      revenue: Number(row?.revenue ?? 0),
      count: row?.count ?? 0,
    });
  }

  return {
    today: { revenue: todayRow[0].revenue, count: todayRow[0].count },
    week: { revenue: weekRow[0].revenue, count: weekRow[0].count },
    month: { revenue: monthRow[0].revenue, count: monthRow[0].count },
    byStatus,
    channels: channelRows,
    inventory: stockRow[0],
    lowStock,
    topProducts,
    recentOrders,
    series,
  };
}

export async function getShiftSummary(shiftId: string) {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<string>`coalesce(sum(${orders.total}), 0)::text`,
      cash: sql<string>`coalesce(sum(case when ${orders.paymentMethod} in ('CASH') then ${orders.total} else coalesce(${orders.cashAmount}, 0) end), 0)::text`,
      card: sql<string>`coalesce(sum(case when ${orders.paymentMethod} in ('CARD_POS') then ${orders.total} else coalesce(${orders.cardAmount}, 0) end), 0)::text`,
    })
    .from(orders)
    .where(and(eq(orders.shiftId, shiftId), NOT_CANCELLED));
  return row;
}

export async function getSalesBetween(from: Date, to: Date) {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      channel: orders.channel,
      total: orders.total,
      paymentMethod: orders.paymentMethod,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to), NOT_CANCELLED))
    .orderBy(desc(orders.createdAt));
}
