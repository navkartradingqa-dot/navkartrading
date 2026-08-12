import "server-only";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  orderEvents,
  orderItems,
  orders,
  products,
  stockMovements,
  payments,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "@/db/schema";
import { createId, createOrderNumber, createTrackingToken } from "./id";
import { addMoney, multiplyMoney, subtractMoney, toFils, fromFils } from "./money";
import { site } from "./site";

export type CartInput = { productId: string; qty: number }[];

export type CreateOrderInput = {
  channel: "ONLINE" | "POS";
  items: CartInput;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  addressLine?: string | null;
  zone?: string | null;
  streetNumber?: string | null;
  buildingNumber?: string | null;
  city?: string | null;
  notes?: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  status?: OrderStatus;
  discount?: string;
  cashierId?: string | null;
  shiftId?: string | null;
  cashReceived?: string | null;
  cashAmount?: string | null;
  cardAmount?: string | null;
  /** POS sales never carry a delivery fee. */
  forceFreeDelivery?: boolean;
};

export class OrderError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Creates an order and moves stock in a single transaction.
 *
 * Stock is decremented with a conditional UPDATE (`stock >= qty`) so two
 * simultaneous buyers can never take the shop below zero — whoever loses the
 * race gets an OUT_OF_STOCK error instead of an oversell.
 */
export async function createOrder(input: CreateOrderInput) {
  if (!input.items.length) throw new OrderError("EMPTY_CART", "The cart is empty.");

  const ids = input.items.map((i) => i.productId);
  const rows = await db.select().from(products).where(inArray(products.id, ids));
  const byId = new Map(rows.map((p) => [p.id, p]));

  for (const item of input.items) {
    const product = byId.get(item.productId);
    if (!product) throw new OrderError("NOT_FOUND", `Product ${item.productId} no longer exists.`);
    if (!product.active) throw new OrderError("INACTIVE", `${product.nameEn} is no longer for sale.`);
    if (item.qty < 1) throw new OrderError("BAD_QTY", "Quantity must be at least 1.");
    if (product.stock < item.qty) {
      throw new OrderError(
        "OUT_OF_STOCK",
        `Only ${product.stock} left of ${product.nameEn}. Please adjust the quantity.`,
      );
    }
  }

  const lines = input.items.map((item) => {
    const product = byId.get(item.productId)!;
    return {
      product,
      qty: item.qty,
      lineTotal: multiplyMoney(product.price, item.qty),
    };
  });

  const subtotal = addMoney(...lines.map((l) => l.lineTotal));
  const discount = input.discount ?? "0.00";
  const afterDiscount = subtractMoney(subtotal, discount);

  const freeDelivery =
    input.forceFreeDelivery ||
    input.channel === "POS" ||
    toFils(afterDiscount) >= toFils(site.delivery.freeOver);
  const deliveryFee = freeDelivery ? "0.00" : site.delivery.fee;
  const total = addMoney(afterDiscount, deliveryFee);

  if (toFils(total) < 0) throw new OrderError("BAD_TOTAL", "Discount exceeds the order value.");

  const orderId = createId();
  const orderNumber = createOrderNumber();
  const trackingToken = createTrackingToken();
  const status: OrderStatus = input.status ?? (input.channel === "POS" ? "COMPLETED" : "PENDING");
  const paymentStatus: PaymentStatus = input.paymentStatus ?? "UNPAID";

  await db.transaction(async (tx) => {
    // 1. Reserve stock first — the conditional update is the safety net.
    for (const { product, qty } of lines) {
      const updated = await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${qty}`, updatedAt: new Date() })
        .where(and(eq(products.id, product.id), gte(products.stock, qty)))
        .returning({ id: products.id, stock: products.stock });

      if (!updated.length) {
        throw new OrderError(
          "OUT_OF_STOCK",
          `${product.nameEn} sold out while you were checking out.`,
        );
      }

      await tx.insert(stockMovements).values({
        id: createId(),
        productId: product.id,
        delta: -qty,
        balance: updated[0].stock,
        type: input.channel === "POS" ? "POS_SALE" : "SALE",
        reference: orderNumber,
        userId: input.cashierId ?? null,
      });
    }

    // 2. Write the order.
    await tx.insert(orders).values({
      id: orderId,
      orderNumber,
      trackingToken,
      channel: input.channel,
      status,
      paymentStatus,
      paymentMethod: input.paymentMethod,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail ?? null,
      addressLine: input.addressLine ?? null,
      zone: input.zone ?? null,
      streetNumber: input.streetNumber ?? null,
      buildingNumber: input.buildingNumber ?? null,
      city: input.city ?? "Doha",
      notes: input.notes ?? null,
      subtotal,
      deliveryFee,
      discount,
      total,
      cashierId: input.cashierId ?? null,
      shiftId: input.shiftId ?? null,
      cashReceived: input.cashReceived ?? null,
      changeGiven:
        input.cashReceived != null
          ? fromFils(Math.max(0, toFils(input.cashReceived) - toFils(total)))
          : null,
      cashAmount: input.cashAmount ?? null,
      cardAmount: input.cardAmount ?? null,
    });

    await tx.insert(orderItems).values(
      lines.map(({ product, qty, lineTotal }) => ({
        id: createId(),
        orderId,
        productId: product.id,
        sku: product.sku,
        nameEn: product.nameEn,
        nameAr: product.nameAr,
        unitPrice: product.price,
        qty,
        lineTotal,
      })),
    );

    await tx.insert(orderEvents).values({
      id: createId(),
      orderId,
      status,
      note: input.channel === "POS" ? "Counter sale" : "Order placed online",
    });
  });

  return { id: orderId, orderNumber, trackingToken, total, subtotal, deliveryFee, discount };
}

/* ------------------------------------------------------------------ reads */

export async function getOrderByToken(token: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.trackingToken, token.trim().toUpperCase()))
    .limit(1);
  if (!order) return null;
  return hydrate(order);
}

export async function getOrderById(id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return null;
  return hydrate(order);
}

export async function getOrderByNumber(orderNumber: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber.trim().toUpperCase()))
    .limit(1);
  if (!order) return null;
  return hydrate(order);
}

/** Track by mobile number — returns the most recent order for that phone. */
export async function getLatestOrderByPhone(phone: string) {
  const normalised = phone.replace(/[^0-9]/g, "").slice(-8);
  if (normalised.length < 7) return null;
  const [order] = await db
    .select()
    .from(orders)
    .where(sql`right(regexp_replace(${orders.customerPhone}, '[^0-9]', '', 'g'), 8) = ${normalised}`)
    .orderBy(desc(orders.createdAt))
    .limit(1);
  if (!order) return null;
  return hydrate(order);
}

async function hydrate(order: typeof orders.$inferSelect) {
  const [items, events] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db
      .select()
      .from(orderEvents)
      .where(eq(orderEvents.orderId, order.id))
      .orderBy(orderEvents.createdAt),
  ]);
  return { ...order, items, events };
}

export type HydratedOrder = Awaited<ReturnType<typeof hydrate>>;

/* --------------------------------------------------------------- mutations */

export const STATUS_FLOW: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
];

export async function setOrderStatus(orderId: string, status: OrderStatus, note?: string) {
  await db.transaction(async (tx) => {
    await tx.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, orderId));
    await tx.insert(orderEvents).values({
      id: createId(),
      orderId,
      status,
      note: note ?? null,
    });

    // Delivered COD orders are paid the moment the driver hands them over.
    if (status === "DELIVERED" || status === "COMPLETED") {
      await tx
        .update(orders)
        .set({ paymentStatus: "PAID" })
        .where(and(eq(orders.id, orderId), eq(orders.paymentMethod, "COD")));
    }
  });
}

export async function setPaymentStatus(orderId: string, paymentStatus: PaymentStatus) {
  await db
    .update(orders)
    .set({ paymentStatus, updatedAt: new Date() })
    .where(eq(orders.id, orderId));
}

/** Cancel an order and return every line back to stock. */
export async function cancelOrder(orderId: string, note?: string) {
  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new OrderError("NOT_FOUND", "Order not found.");
    if (order.status === "CANCELLED") return;

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const item of items) {
      if (!item.productId) continue;
      const updated = await tx
        .update(products)
        .set({ stock: sql`${products.stock} + ${item.qty}`, updatedAt: new Date() })
        .where(eq(products.id, item.productId))
        .returning({ stock: products.stock });

      if (updated.length) {
        await tx.insert(stockMovements).values({
          id: createId(),
          productId: item.productId,
          delta: item.qty,
          balance: updated[0].stock,
          type: "RETURN",
          reference: order.orderNumber,
          note: "Order cancelled — stock returned",
        });
      }
    }

    await tx
      .update(orders)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(eq(orders.id, orderId));
    await tx.insert(orderEvents).values({
      id: createId(),
      orderId,
      status: "CANCELLED",
      note: note ?? "Cancelled",
    });
  });
}

export async function recordPayment(opts: {
  orderId: string;
  provider: string;
  providerRef?: string | null;
  amount: string;
  status: PaymentStatus;
  raw?: unknown;
}) {
  await db.insert(payments).values({
    id: createId(),
    orderId: opts.orderId,
    provider: opts.provider,
    providerRef: opts.providerRef ?? null,
    amount: opts.amount,
    status: opts.status,
    raw: (opts.raw ?? null) as never,
  });
}
