"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Banknote, CreditCard, Loader2, AlertCircle } from "lucide-react";
import { useCart } from "@/components/cart-context";
import { useLocale } from "@/i18n/client";
import { formatMoney } from "@/lib/money";
import { site } from "@/lib/site";

type Method = "COD" | "CARD_ONLINE";

export default function CheckoutPage() {
  const { lines, subtotal, clear, ready } = useCart();
  const { t, locale } = useLocale();
  const router = useRouter();

  const [method, setMethod] = useState<Method>("COD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    zone: "",
    street: "",
    building: "",
    address: "",
    city: "Doha",
    notes: "",
  });

  useEffect(() => {
    if (ready && lines.length === 0) router.replace("/cart");
  }, [ready, lines.length, router]);

  const freeOver = Number(site.delivery.freeOver);
  const deliveryFee = subtotal >= freeOver ? 0 : Number(site.delivery.fee);
  const total = subtotal + deliveryFee;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.phone.trim()) {
      setError(t("checkout.required"));
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
          customerName: form.name,
          customerPhone: form.phone,
          customerEmail: form.email || null,
          zone: form.zone || null,
          streetNumber: form.street || null,
          buildingNumber: form.building || null,
          addressLine: form.address || null,
          city: form.city || "Doha",
          notes: form.notes || null,
          paymentMethod: method,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        trackingToken?: string;
        redirectUrl?: string;
      };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }

      clear();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        router.push(`/order/${data.trackingToken}?placed=1`);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
      setBusy(false);
    }
  }

  if (!ready || lines.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-ink-400">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-ink-950">{t("checkout.title")}</h1>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="mb-4 font-bold text-ink-950">{t("checkout.contact")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-500">
                  {t("checkout.name")} *
                </span>
                <input
                  className="field"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-500">
                  {t("checkout.phone")} *
                </span>
                <input
                  className="field"
                  type="tel"
                  inputMode="tel"
                  placeholder="3XXX XXXX"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  required
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-ink-500">
                  {t("checkout.email")}
                </span>
                <input
                  className="field"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-bold text-ink-950">{t("checkout.delivery")}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-500">
                  {t("checkout.zone")}
                </span>
                <input
                  className="field"
                  inputMode="numeric"
                  value={form.zone}
                  onChange={(e) => set("zone", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-500">
                  {t("checkout.street")}
                </span>
                <input
                  className="field"
                  inputMode="numeric"
                  value={form.street}
                  onChange={(e) => set("street", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-500">
                  {t("checkout.building")}
                </span>
                <input
                  className="field"
                  inputMode="numeric"
                  value={form.building}
                  onChange={(e) => set("building", e.target.value)}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-ink-500">
                  {t("checkout.address")}
                </span>
                <input
                  className="field"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Villa / flat number, nearest landmark"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-500">
                  {t("checkout.city")}
                </span>
                <input
                  className="field"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </label>
              <label className="block sm:col-span-3">
                <span className="mb-1 block text-xs font-medium text-ink-500">
                  {t("checkout.notes")}
                </span>
                <textarea
                  className="field min-h-20"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-bold text-ink-950">{t("checkout.payment")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    id: "COD" as const,
                    icon: Banknote,
                    title: t("checkout.pay.cod"),
                    sub: t("checkout.pay.cod.sub"),
                  },
                  {
                    id: "CARD_ONLINE" as const,
                    icon: CreditCard,
                    title: t("checkout.pay.card"),
                    sub: t("checkout.pay.card.sub"),
                  },
                ]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMethod(opt.id)}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-start transition ${
                    method === opt.id
                      ? "border-brand-600 bg-brand-50/60 ring-1 ring-brand-600"
                      : "border-ink-200 hover:border-ink-300"
                  }`}
                >
                  <opt.icon size={20} className="mt-0.5 shrink-0 text-brand-700" />
                  <span>
                    <span className="block text-sm font-semibold text-ink-900">{opt.title}</span>
                    <span className="mt-0.5 block text-xs text-ink-500">{opt.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div>
          <div className="card sticky top-40 p-5">
            <h2 className="mb-4 font-bold text-ink-950">{t("checkout.summary")}</h2>

            <ul className="mb-4 max-h-56 space-y-2 overflow-y-auto text-sm">
              {lines.map((l) => (
                <li key={l.productId} className="flex justify-between gap-3">
                  <span className="line-clamp-2 text-ink-600">
                    {l.qty} × {locale === "ar" ? l.nameAr : l.nameEn}
                  </span>
                  <span className="shrink-0 font-medium">
                    {formatMoney(Number(l.price) * l.qty, locale)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="space-y-2 border-t border-ink-100 pt-3 text-sm">
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
              <div className="flex justify-between border-t border-ink-100 pt-3 text-base">
                <dt className="font-bold">{t("cart.total")}</dt>
                <dd className="font-bold text-brand-800">{formatMoney(total, locale)}</dd>
              </div>
            </dl>

            {error && (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-primary mt-5 w-full disabled:opacity-60">
              {busy && <Loader2 size={16} className="animate-spin" />}
              {busy ? t("checkout.processing") : t("checkout.placeOrder")}
            </button>

            <Link
              href="/cart"
              className="mt-2 block text-center text-sm font-medium text-ink-500 hover:underline"
            >
              {t("common.back")}
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
