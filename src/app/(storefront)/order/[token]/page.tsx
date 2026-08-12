import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getOrderByToken } from "@/lib/orders";
import { OrderDetail } from "@/components/order-detail";
import { getT } from "@/i18n/server";
import { whatsappLink } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { t, locale } = await getT();

  const order = await getOrderByToken(token);
  if (!order) notFound();

  const fresh = Date.now() - new Date(order.createdAt).getTime() < 10 * 60 * 1000;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {fresh && order.status === "PENDING" && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={22} />
          <div>
            <p className="font-bold text-emerald-900">{t("confirm.title")}</p>
            <p className="mt-0.5 text-sm text-emerald-700">{t("confirm.sub")}</p>
            <p className="mt-2 text-xs text-emerald-700">{t("confirm.saveNote")}</p>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink-950">{t("track.title")}</h1>
        <div className="flex gap-2">
          <a
            href={whatsappLink(`Hello, about my order ${order.orderNumber}`)}
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
