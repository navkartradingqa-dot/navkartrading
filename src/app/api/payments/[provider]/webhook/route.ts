import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, orders } from "@/db/schema";
import { getPaymentProvider } from "@/lib/payments";
import { setOrderStatus, setPaymentStatus, recordPayment, cancelOrder } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Gateway → shop confirmation. This is the only source of truth for "paid";
 * the shopper's browser returning to /order/[token] is not trusted.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params;
  const provider = getPaymentProvider();

  if (provider.id !== providerId) {
    return NextResponse.json({ ok: false, error: "Unknown provider" }, { status: 404 });
  }

  const body = await req.text();
  const result = await provider.parseWebhook(req, body);

  if (!result) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  // Resolve the order: providers echo our order id, or we match the payment row.
  let orderId = result.orderId ?? null;
  if (!orderId && result.providerRef) {
    const [row] = await db
      .select({ orderId: payments.orderId })
      .from(payments)
      .where(eq(payments.providerRef, result.providerRef))
      .limit(1);
    orderId = row?.orderId ?? null;
  }

  if (!orderId) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  // Idempotent: a repeated PAID callback must not double-confirm.
  if (order.paymentStatus === "PAID" && result.status === "PAID") {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  await recordPayment({
    orderId,
    provider: provider.id,
    providerRef: result.providerRef,
    amount: result.amount ?? order.total,
    status: result.status,
    raw: result.raw,
  });

  if (result.status === "PAID") {
    await setPaymentStatus(orderId, "PAID");
    if (order.status === "PENDING") {
      await setOrderStatus(orderId, "CONFIRMED", "Payment received online");
    }
  } else if (result.status === "FAILED") {
    await setPaymentStatus(orderId, "FAILED");
    // Release the reserved stock so it goes back on sale.
    await cancelOrder(orderId, "Online payment failed");
  }

  return NextResponse.json({ ok: true });
}
