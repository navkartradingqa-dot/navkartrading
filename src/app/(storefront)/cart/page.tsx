"use client";

import Link from "next/link";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-context";
import { ProductImage } from "@/components/product-image";
import { useLocale } from "@/i18n/client";
import { formatMoney } from "@/lib/money";
import { site } from "@/lib/site";

export default function CartPage() {
  const { lines, subtotal, setQty, remove, ready } = useCart();
  const { t, locale } = useLocale();

  const freeOver = Number(site.delivery.freeOver);
  const deliveryFee = subtotal === 0 || subtotal >= freeOver ? 0 : Number(site.delivery.fee);
  const total = subtotal + deliveryFee;
  const remaining = Math.max(0, freeOver - subtotal);

  if (!ready) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-ink-400">{t("common.loading")}</div>;
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <ShoppingBag size={48} className="mx-auto text-ink-200" />
        <p className="mt-4 text-lg font-semibold text-ink-700">{t("cart.empty")}</p>
        <Link href="/shop" className="btn-primary mt-6 inline-flex">
          {t("cart.continue")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-ink-950">{t("cart.title")}</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card divide-y divide-ink-100">
          {lines.map((l) => (
            <div key={l.productId} className="flex gap-4 p-4">
              <Link
                href={`/product/${l.slug}`}
                className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-50"
              >
                <ProductImage
                  name={l.nameEn}
                  images={l.image ? [l.image] : []}
                  seed={l.sku}
                  rounded={false}
                />
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/product/${l.slug}`}
                  className="line-clamp-2 text-sm font-medium text-ink-900 hover:text-brand-700"
                >
                  {locale === "ar" ? l.nameAr : l.nameEn}
                </Link>
                <p className="mt-0.5 text-xs text-ink-400">{l.sku}</p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center rounded-lg border border-ink-200">
                    <button
                      onClick={() => setQty(l.productId, l.qty - 1)}
                      className="grid h-8 w-8 place-items-center text-ink-600"
                      aria-label="Decrease"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-9 text-center text-sm font-semibold">{l.qty}</span>
                    <button
                      onClick={() => setQty(l.productId, l.qty + 1)}
                      disabled={l.qty >= l.stock}
                      className="grid h-8 w-8 place-items-center text-ink-600 disabled:opacity-30"
                      aria-label="Increase"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <button
                    onClick={() => remove(l.productId)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-red-600"
                  >
                    <Trash2 size={13} />
                    {t("cart.remove")}
                  </button>
                </div>
              </div>

              <div className="text-end">
                <p className="text-sm font-bold text-ink-950">
                  {formatMoney(Number(l.price) * l.qty, locale)}
                </p>
                {l.qty > 1 && (
                  <p className="mt-0.5 text-xs text-ink-400">{formatMoney(l.price, locale)} ea.</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="card sticky top-40 p-5">
            <h2 className="mb-4 font-bold text-ink-950">{t("checkout.summary")}</h2>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">{t("cart.subtotal")}</dt>
                <dd className="font-medium">{formatMoney(subtotal, locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">{t("cart.delivery")}</dt>
                <dd className="font-medium">
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-600">{t("cart.free")}</span>
                  ) : (
                    formatMoney(deliveryFee, locale)
                  )}
                </dd>
              </div>
              <div className="mt-3 flex justify-between border-t border-ink-100 pt-3 text-base">
                <dt className="font-bold">{t("cart.total")}</dt>
                <dd className="font-bold text-brand-800">{formatMoney(total, locale)}</dd>
              </div>
            </dl>

            {remaining > 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Add {formatMoney(remaining, locale)} more for free delivery.
              </p>
            )}

            <Link href="/checkout" className="btn-primary mt-5 w-full">
              {t("cart.checkout")}
            </Link>
            <Link
              href="/shop"
              className="mt-2 block text-center text-sm font-medium text-brand-700 hover:underline"
            >
              {t("cart.continue")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
