import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderByToken } from "@/lib/orders";
import { OrderDetail } from "@/components/order-detail";
import { OrderPlaced } from "@/components/order-placed";
import { getT } from "@/i18n/server";
import { whatsappLink } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { token } = await params;
  const { placed } = await searchParams;
  const { t, locale } = await getT();
  const order = await getOrderByToken(token);
  if (!order) notFound();

  // Show the confirmation panel when the customer has just arrived from
  // checkout. `?placed=1` is the reliable signal; the 30-minute window is a
  // fallback for card payments that come back via the gateway.
  const fresh = Date.now() - new Date(order.createdAt).getTime() < 30 * 60 * 1000;
  const justPlaced =
    placed === "1" || (fresh && (order.status === "PENDING" || order.status === "CONFIRMED"));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {justPlaced && (
        <OrderPlaced
          orderNumber={order.orderNumber}
          trackingToken={order.trackingToken}
          title={t("confirm.title")}
          sub={t("confirm.sub")}
          saveNote={t("confirm.saveNote")}
        />
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink-950">
          {justPlaced ? t("confirm.title") : t("track.title")}
        </h1>
        <div className="flex gap-2">
          <a
            href={whatsappLink(
              `Hello, about my order ${order.orderNumber} (tracking ${order.trackingToken})`,
            )}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost text-sm"
          >
            WhatsApp us
          </a>
          <Link href="/shop" className="btn-ghost text-sm">
            {t("cart.continue")}
          </Link>
        </div>
      </div>

      <OrderDetail order={order} locale={locale} />
    </div>
  );
}
