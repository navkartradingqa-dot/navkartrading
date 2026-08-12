"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, desc } from "drizzle-orm";
import { db } from "@/db";
import { posShifts, orders } from "@/db/schema";
import { requireRole, readSession } from "@/lib/auth";
import { createId } from "@/lib/id";
import { createOrder, OrderError, recordPayment } from "@/lib/orders";
import { addMoney, toFils, fromFils } from "@/lib/money";

export type SaleLine = { productId: string; qty: number };

export type SaleInput = {
  lines: SaleLine[];
  payment: "CASH" | "CARD_POS" | "SPLIT";
  cashReceived?: string;
  cashAmount?: string;
  cardAmount?: string;
  discount?: string;
  customerName?: string;
  customerPhone?: string;
};

export type SaleResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
      total: string;
      subtotal: string;
      discount: string;
      change: string;
      paidCash: string;
      paidCard: string;
      at: string;
      cashier: string;
    }
  | { ok: false; error: string };

/* ------------------------------------------------------------------ shifts */

export async function getOpenShift(userId: string) {
  const [shift] = await db
    .select()
    .from(posShifts)
    .where(and(eq(posShifts.userId, userId), isNull(posShifts.closedAt)))
    .orderBy(desc(posShifts.openedAt))
    .limit(1);
  return shift ?? null;
}

export async function openShift(formData: FormData) {
  const user = await requireRole("CASHIER");
  if (!user) return;

  const existing = await getOpenShift(user.id);
  if (existing) return;

  await db.insert(posShifts).values({
    id: createId(),
    userId: user.id,
    openingFloat: Number(String(formData.get("openingFloat") ?? "0") || 0).toFixed(2),
  });
  revalidatePath("/pos");
}

export async function closeShift(formData: FormData) {
  const user = await requireRole("CASHIER");
  if (!user) return;

  const shift = await getOpenShift(user.id);
  if (!shift) return;

  await db
    .update(posShifts)
    .set({
      closedAt: new Date(),
      countedCash: Number(String(formData.get("countedCash") ?? "0") || 0).toFixed(2),
      note: String(formData.get("note") ?? "").trim() || null,
    })
    .where(eq(posShifts.id, shift.id));

  revalidatePath("/pos");
}

/* -------------------------------------------------------------------- sale */

export async function completeSale(input: SaleInput): Promise<SaleResult> {
  const user = await readSession();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  if (!input.lines.length) return { ok: false, error: "The till is empty." };

  const shift = await getOpenShift(user.id);

  try {
    const order = await createOrder({
      channel: "POS",
      items: input.lines,
      customerName: input.customerName?.trim() || "Walk-in customer",
      customerPhone: input.customerPhone?.trim() || "",
      paymentMethod: input.payment,
      paymentStatus: "PAID",
      status: "COMPLETED",
      discount: input.discount ?? "0.00",
      cashierId: user.id,
      shiftId: shift?.id ?? null,
      cashReceived: input.payment === "CASH" ? (input.cashReceived ?? null) : null,
      cashAmount: input.payment === "SPLIT" ? (input.cashAmount ?? null) : null,
      cardAmount: input.payment === "SPLIT" ? (input.cardAmount ?? null) : null,
      forceFreeDelivery: true,
    });

    await recordPayment({
      orderId: order.id,
      provider: input.payment === "CARD_POS" ? "card_pos" : "cash",
      amount: order.total,
      status: "PAID",
    });

    const [full] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);

    const change =
      input.payment === "CASH" && input.cashReceived
        ? fromFils(Math.max(0, toFils(input.cashReceived) - toFils(order.total)))
        : "0.00";

    const paidCash =
      input.payment === "CASH"
        ? order.total
        : input.payment === "SPLIT"
          ? (input.cashAmount ?? "0.00")
          : "0.00";
    const paidCard =
      input.payment === "CARD_POS"
        ? order.total
        : input.payment === "SPLIT"
          ? (input.cardAmount ?? "0.00")
          : "0.00";

    revalidatePath("/pos");
    revalidatePath("/admin");

    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      subtotal: order.subtotal,
      discount: order.discount,
      change,
      paidCash,
      paidCard,
      at: (full?.createdAt ?? new Date()).toISOString(),
      cashier: user.name,
    };
  } catch (err) {
    if (err instanceof OrderError) return { ok: false, error: err.message };
    console.error("[pos sale]", err);
    return { ok: false, error: "The sale could not be completed. Please try again." };
  }
}

export async function shiftTotals(shiftId: string) {
  const rows = await db
    .select({
      total: orders.total,
      method: orders.paymentMethod,
      cashAmount: orders.cashAmount,
      cardAmount: orders.cardAmount,
      status: orders.status,
    })
    .from(orders)
    .where(eq(orders.shiftId, shiftId));

  let cash = "0.00";
  let card = "0.00";
  let gross = "0.00";
  let count = 0;

  for (const r of rows) {
    if (r.status === "CANCELLED" || r.status === "REFUNDED") continue;
    count++;
    gross = addMoney(gross, r.total);
    if (r.method === "CASH") cash = addMoney(cash, r.total);
    else if (r.method === "CARD_POS") card = addMoney(card, r.total);
    else if (r.method === "SPLIT") {
      cash = addMoney(cash, r.cashAmount ?? "0");
      card = addMoney(card, r.cardAmount ?? "0");
    }
  }

  return { cash, card, gross, count };
}
