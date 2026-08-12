import Link from "next/link";
import { Search, PackageSearch } from "lucide-react";
import { getOrderByToken, getLatestOrderByPhone, getOrderByNumber } from "@/lib/orders";
import { OrderDetail } from "@/components/order-detail";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

type SP = Promise<{ code?: string }>;

export default async function TrackPage({ searchParams }: { searchParams: SP }) {
  const { code } = await searchParams;
  const { t, locale } = await getT();

  const query = code?.trim();
  let order = null;
  if (query) {
    order =
      (await getOrderByToken(query)) ??
      (await getOrderByNumber(query)) ??
      (/^[0-9+\s-]{7,}$/.test(query) ? await getLatestOrderByPhone(query) : null);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mx-auto max-w-xl text-center">
        <PackageSearch size={40} className="mx-auto text-brand-700" />
        <h1 className="mt-3 text-2xl font-bold text-ink-950">{t("track.title")}</h1>
        <p className="mt-1 text-sm text-ink-500">{t("track.sub")}</p>

        <form method="GET" className="relative mt-5">
          <input
            name="code"
            defaultValue={query ?? ""}
            placeholder={t("track.placeholder")}
            className="w-full rounded-full border border-ink-200 bg-white py-3 ps-5 pe-28 text-sm outline-none focus:border-brand-500"
            autoComplete="off"
          />
          <button
            type="submit"
            className="absolute end-1.5 top-1.5 inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
          >
            <Search size={15} />
            {t("track.cta")}
          </button>
        </form>

        {query && !order && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {t("track.notFound")}
          </p>
        )}
      </div>

      {order && (
        <div className="mt-10">
          <OrderDetail order={order} locale={locale} />
        </div>
      )}

      {!query && (
        <div className="mx-auto mt-10 max-w-xl text-center text-sm text-ink-400">
          <Link href="/shop" className="font-semibold text-brand-700 hover:underline">
            {t("cart.continue")} →
          </Link>
        </div>
      )}
    </div>
  );
}
