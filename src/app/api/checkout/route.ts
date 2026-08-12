import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, OrderError, recordPayment } from "@/lib/orders";
import { getPaymentProvider } from "@/lib/payments";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  items: z
    .array(z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(50) }))
    .min(1)
    .max(40),
  customerName: z.string().trim().min(2).max(160),
  customerPhone: z.string().trim().min(6).max(40),
  customerEmail: z.string().email().nullish().or(z.literal("")),
  addressLine: z.string().max(400).nullish(),
  zone: z.string().max(20).nullish(),
  streetNumber: z.string().max(20).nullish(),
  buildingNumber: z.string().max(20).nullish(),
  city: z.string().max(80).nullish(),
  notes: z.string().max(1000).nullish(),
  paymentMethod: z.enum(["COD", "CARD_ONLINE"]),
});

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Please check the details you entered and try again." },
      { status: 400 },
    );
  }

  const input = parsed.data;

  try {
    const order = await createOrder({
      channel: "ONLINE",
      items: input.items,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail || null,
      addressLine: input.addressLine ?? null,
      zone: input.zone ?? null,
      streetNumber: input.streetNumber ?? null,
      buildingNumber: input.buildingNumber ?? null,
      city: input.city ?? "Doha",
      notes: input.notes ?? null,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === "COD" ? "UNPAID" : "PENDING",
      status: "PENDING",
    });

    // Cash on delivery: nothing else to do, the shop confirms by phone.
    if (input.paymentMethod === "COD") {
      return NextResponse.json({
        ok: true,
        orderNumber: order.orderNumber,
        trackingToken: order.trackingToken,
      });
    }

    // Card: hand off to the configured gateway.
    const provider = getPaymentProvider();
    const origin = new URL(req.url).origin || site.url;

    const init = await provider.init({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.total,
      currency: "QAR",
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail || null,
      returnUrl: `${origin}/order/${order.trackingToken}`,
      webhookUrl: `${origin}/api/payments/${provider.id}/webhook`,
    });

    if (!init.ok) {
      return NextResponse.json(
        {
          ok: true,
          orderNumber: order.orderNumber,
          trackingToken: order.trackingToken,
          warning: init.error,
        },
        { status: 200 },
      );
    }

    await recordPayment({
      orderId: order.id,
      provider: provider.id,
      providerRef: init.providerRef,
      amount: order.total,
      status: "PENDING",
    });

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      trackingToken: order.trackingToken,
      redirectUrl: init.redirectUrl,
    });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 409 });
    }
    console.error("[checkout]", err);
    return NextResponse.json(
      { ok: false, error: "We could not place the order. Please try again or call the shop." },
      { status: 500 },
    );
  }
}
