import { Check, Circle, Package, Truck, Home, XCircle, Clock } from "lucide-react";
import type { HydratedOrder } from "@/lib/orders";
import { STATUS_FLOW } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { dictionaries, type Locale } from "@/i18n/dictionaries";

const ICONS = {
  PENDING: Clock,
  CONFIRMED: Check,
  PACKED: Package,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: Home,
  COMPLETED: Check,
  CANCELLED: XCircle,
  REFUNDED: XCircle,
} as const;

export function OrderDetail({ order, locale }: { order: HydratedOrder; locale: Locale }) {
  const dict = dictionaries[locale];
  const t = (k: keyof typeof dict) => dict[k];
  const isDead = order.status === "CANCELLED" || order.status === "REFUNDED";
  const currentIndex = STATUS_FLOW.indexOf(order.status);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {/* status header */}
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-ink-400">{t("confirm.number")}</p>
              <p className="text-lg font-bold text-ink-950">{order.orderNumber}</p>
            </div>
            <div className="text-end">
              <p className="text-xs text-ink-400">{t("confirm.tracking")}</p>
              <p className="font-mono text-lg font-bold text-brand-700">{order.trackingToken}</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-3 text-xs font-semibold tracking-wide text-ink-400 uppercase">
              {t("track.status")}
            </p>

            {isDead ? (
              <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4">
                <XCircle className="text-red-600" size={22} />
                <span className="font-semibold text-red-700">
                  {t(`status.${order.status}` as keyof typeof dict)}
                </span>
              </div>
            ) : (
              <ol className="relative flex flex-col gap-0 sm:flex-row sm:gap-2">
                {STATUS_FLOW.slice(0, 5).map((status, i) => {
                  const Icon = ICONS[status];
                  const done = i <= currentIndex;
                  const active = i === currentIndex;
                  return (
                    <li key={status} className="flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:text-center">
                      <div className="flex flex-col items-center sm:w-full sm:flex-row">
                        <span
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 ${
                            done
                              ? "border-brand-700 bg-brand-700 text-white"
                              : "border-ink-200 bg-white text-ink-300"
                          } ${active ? "ring-4 ring-brand-100" : ""} sm:mx-auto`}
                        >
                          <Icon size={16} />
                        </span>
                        <span
                          className={`hidden h-0.5 flex-1 sm:block ${
                            i < 4 ? (i < currentIndex ? "bg-brand-700" : "bg-ink-200") : "bg-transparent"
                          }`}
                        />
                      </div>
                      <span
                        className={`pb-6 text-xs sm:pb-0 ${done ? "font-semibold text-ink-900" : "text-ink-400"}`}
                      >
                        {t(`status.${status}` as keyof typeof dict)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        {/* items */}
        <div className="card overflow-hidden">
          <h2 className="border-b border-ink-100 px-5 py-3 text-sm font-bold text-ink-950">
            {t("track.items")}
          </h2>
          <ul className="divide-y divide-ink-100">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900">
                    {locale === "ar" ? item.nameAr : item.nameEn}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {item.sku} · {item.qty} × {formatMoney(item.unitPrice, locale)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold">
                  {formatMoney(item.lineTotal, locale)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* timeline */}
        {order.events.length > 0 && (
          <div className="card p-5">
            <h2 className="mb-4 text-sm font-bold text-ink-950">{t("track.timeline")}</h2>
            <ol className="space-y-3">
              {order.events.map((ev) => (
                <li key={ev.id} className="flex gap-3">
                  <Circle size={9} className="mt-1.5 shrink-0 fill-brand-700 text-brand-700" />
                  <div>
                    <p className="text-sm font-medium text-ink-800">
                      {t(`status.${ev.status}` as keyof typeof dict)}
                    </p>
                    <p className="text-xs text-ink-400">
                      {new Date(ev.createdAt).toLocaleString(locale === "ar" ? "ar-QA" : "en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {ev.note ? ` · ${ev.note}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* summary */}
      <div>
        <div className="card p-5">
          <h2 className="mb-4 font-bold text-ink-950">{t("checkout.summary")}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">{t("cart.subtotal")}</dt>
              <dd>{formatMoney(order.subtotal, locale)}</dd>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>{t("cart.discount")}</dt>
                <dd>−{formatMoney(order.discount, locale)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-500">{t("cart.delivery")}</dt>
              <dd>
                {Number(order.deliveryFee) === 0 ? (
                  <span className="text-emerald-600">{t("cart.free")}</span>
                ) : (
                  formatMoney(order.deliveryFee, locale)
                )}
              </dd>
            </div>
            <div className="flex justify-between border-t border-ink-100 pt-3 text-base font-bold">
              <dt>{t("cart.total")}</dt>
              <dd className="text-brand-800">{formatMoney(order.total, locale)}</dd>
            </div>
          </dl>

          <div className="mt-4 space-y-1 border-t border-ink-100 pt-4 text-xs text-ink-500">
            <p>
              <span className="text-ink-400">{t("checkout.payment")}:</span>{" "}
              <span className="font-medium text-ink-700">{order.paymentMethod}</span> ·{" "}
              <span className="font-medium text-ink-700">
                {t(`pay.${order.paymentStatus}` as keyof typeof dict)}
              </span>
            </p>
            <p>
              <span className="text-ink-400">{t("track.placedOn")}:</span>{" "}
              {new Date(order.createdAt).toLocaleString(locale === "ar" ? "ar-QA" : "en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>

          {order.channel === "ONLINE" && (
            <div className="mt-4 border-t border-ink-100 pt-4 text-xs">
              <p className="mb-1 font-semibold text-ink-700">{t("track.deliverTo")}</p>
              <p className="text-ink-500">
                {order.customerName}
                <br />
                {order.customerPhone}
                <br />
                {[
                  order.buildingNumber && `Building ${order.buildingNumber}`,
                  order.streetNumber && `Street ${order.streetNumber}`,
                  order.zone && `Zone ${order.zone}`,
                  order.city,
                ]
                  .filter(Boolean)
                  .join(", ")}
                {order.addressLine ? <><br />{order.addressLine}</> : null}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
