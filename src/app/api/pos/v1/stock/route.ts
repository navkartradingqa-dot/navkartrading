import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, stockMovements } from "@/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { createId } from "@/lib/id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  barcode: z.string().optional(),
  sku: z.string().optional(),
  productId: z.string().optional(),
  /** Positive to add stock, negative to remove. */
  delta: z.number().int().optional(),
  /** Or set an absolute count from a stock take. */
  setTo: z.number().int().min(0).optional(),
  reason: z.enum(["PURCHASE", "ADJUSTMENT", "RETURN", "DAMAGE"]).default("ADJUSTMENT"),
  note: z.string().max(300).optional(),
});

/** POST /api/pos/v1/stock — let a terminal or stock-take app move stock. */
export async function POST(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;

  if (input.delta === undefined && input.setTo === undefined) {
    return NextResponse.json({ error: "Provide either delta or setTo" }, { status: 400 });
  }

  const conditions = [];
  if (input.productId) conditions.push(eq(products.id, input.productId));
  if (input.barcode) conditions.push(eq(products.barcode, input.barcode));
  if (input.sku) conditions.push(eq(products.sku, input.sku.toUpperCase()));
  if (!conditions.length) {
    return NextResponse.json({ error: "Identify the product by id, sku or barcode" }, { status: 400 });
  }

  const [product] = await db
    .select()
    .from(products)
    .where(conditions.length === 1 ? conditions[0] : or(...conditions))
    .limit(1);

  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const delta = input.setTo !== undefined ? input.setTo - product.stock : input.delta!;
  const balance = product.stock + delta;
  if (balance < 0) {
    return NextResponse.json(
      { error: "That change would take stock below zero", currentStock: product.stock },
      { status: 409 },
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(products)
      .set({ stock: balance, updatedAt: new Date() })
      .where(eq(products.id, product.id));
    await tx.insert(stockMovements).values({
      id: createId(),
      productId: product.id,
      delta,
      balance,
      type: input.reason,
      reference: `API:${auth.label ?? "terminal"}`,
      note: input.note ?? null,
    });
  });

  return NextResponse.json({ ok: true, sku: product.sku, stock: balance, delta });
}

/** GET /api/pos/v1/stock — bulk stock levels, for a terminal that caches locally. */
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  const url = new URL(req.url);
  const since = url.searchParams.get("since");

  const rows = await db
    .select({
      sku: products.sku,
      barcode: products.barcode,
      stock: products.stock,
      price: products.price,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .where(
      since
        ? and(eq(products.active, true), sql`${products.updatedAt} > ${new Date(since)}`)
        : eq(products.active, true),
    )
    .limit(2000);

  return NextResponse.json({ count: rows.length, items: rows, asOf: new Date().toISOString() });
}
