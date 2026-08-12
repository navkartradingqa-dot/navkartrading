import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { products, users } from "@/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { createOrder, OrderError, recordPayment } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  // Identify items by any of these — barcode is what a terminal usually has.
  items: z
    .array(
      z.object({
        barcode: z.string().optional(),
        sku: z.string().optional(),
        productId: z.string().optional(),
        qty: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(60),
  payment: z.enum(["CASH", "CARD_POS", "SPLIT"]),
  cashAmount: z.string().optional(),
  cardAmount: z.string().optional(),
  cashReceived: z.string().optional(),
  discount: z.string().optional(),
  customerName: z.string().max(160).optional(),
  customerPhone: z.string().max(40).optional(),
  /** Email of the staff member operating the terminal, so the sale is attributed. */
  cashierEmail: z.string().email().optional(),
  /** Terminal's own reference, echoed back — useful for reconciliation. */
  terminalRef: z.string().max(80).optional(),
});

/**
 * POST /api/pos/v1/sales
 *
 * Records a counter sale made on an external POS machine. Stock is decremented
 * exactly as it is for a sale rung up in the browser POS, so both tills and the
 * website always share one stock figure.
 */
export async function POST(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

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

  // Resolve every line to a product id.
  const barcodes = input.items.map((i) => i.barcode).filter(Boolean) as string[];
  const skus = input.items.map((i) => i.sku?.toUpperCase()).filter(Boolean) as string[];

  const [byBarcode, bySku] = await Promise.all([
    barcodes.length
      ? db.select().from(products).where(inArray(products.barcode, barcodes))
      : Promise.resolve([]),
    skus.length ? db.select().from(products).where(inArray(products.sku, skus)) : Promise.resolve([]),
  ]);

  const barcodeMap = new Map(byBarcode.map((p) => [p.barcode, p.id]));
  const skuMap = new Map(bySku.map((p) => [p.sku, p.id]));

  const lines: { productId: string; qty: number }[] = [];
  const unresolved: string[] = [];

  for (const item of input.items) {
    const id =
      item.productId ??
      (item.barcode ? barcodeMap.get(item.barcode) : undefined) ??
      (item.sku ? skuMap.get(item.sku.toUpperCase()) : undefined);
    if (!id) {
      unresolved.push(item.barcode ?? item.sku ?? "unknown");
      continue;
    }
    lines.push({ productId: id, qty: item.qty });
  }

  if (unresolved.length) {
    return NextResponse.json(
      { error: "Some items are not in the catalogue", unresolved },
      { status: 422 },
    );
  }

  let cashierId: string | null = null;
  if (input.cashierEmail) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.cashierEmail.toLowerCase()))
      .limit(1);
    cashierId = user?.id ?? null;
  }

  try {
    const order = await createOrder({
      channel: "POS",
      items: lines,
      customerName: input.customerName || "Walk-in customer",
      customerPhone: input.customerPhone || "",
      paymentMethod: input.payment,
      paymentStatus: "PAID",
      status: "COMPLETED",
      discount: input.discount ?? "0.00",
      cashierId,
      cashReceived: input.cashReceived ?? null,
      cashAmount: input.cashAmount ?? null,
      cardAmount: input.cardAmount ?? null,
      notes: input.terminalRef ? `Terminal ref: ${input.terminalRef}` : null,
      forceFreeDelivery: true,
    });

    await recordPayment({
      orderId: order.id,
      provider: input.payment === "CARD_POS" ? "card_pos" : "cash",
      providerRef: input.terminalRef ?? null,
      amount: order.total,
      status: "PAID",
    });

    return NextResponse.json(
      {
        ok: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        subtotal: order.subtotal,
        discount: order.discount,
        total: order.total,
        currency: "QAR",
        terminalRef: input.terminalRef ?? null,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
    }
    console.error("[pos api sale]", err);
    return NextResponse.json({ error: "Could not record the sale" }, { status: 500 });
  }
}
