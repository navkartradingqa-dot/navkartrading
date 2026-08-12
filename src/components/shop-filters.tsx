"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useLocale } from "@/i18n/client";

type Option = { slug: string; label: string; count?: number };

export function ShopFilters({
  categories,
  brands,
  total,
  hideCategory = false,
  children,
}: {
  categories: Option[];
  brands: Option[];
  total: number;
  hideCategory?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const current = {
    category: params.get("category") ?? "",
    brand: params.get("brand") ?? "",
    min: params.get("min") ?? "",
    max: params.get("max") ?? "",
    inStock: params.get("inStock") === "1",
    sort: params.get("sort") ?? "relevance",
  };

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  function clearAll() {
    const next = new URLSearchParams();
    const q = params.get("q");
    if (q) next.set("q", q);
    router.push(next.toString() ? `${pathname}?${next.toString()}` : pathname);
  }

  const activeCount =
    (current.category ? 1 : 0) +
    (current.brand ? 1 : 0) +
    (current.min ? 1 : 0) +
    (current.max ? 1 : 0) +
    (current.inStock ? 1 : 0);

  const panel = (
    <div className="space-y-6">
      {!hideCategory && (
        <div>
          <p className="mb-2 text-sm font-bold text-ink-950">{t("shop.category")}</p>
          <div className="max-h-64 space-y-1 overflow-y-auto pe-1">
            {categories.map((c) => (
              <button
                key={c.slug}
                onClick={() => update({ category: current.category === c.slug ? null : c.slug })}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-start text-sm ${
                  current.category === c.slug
                    ? "bg-brand-50 font-semibold text-brand-800"
                    : "text-ink-600 hover:bg-ink-50"
                }`}
              >
                <span className="truncate">{c.label}</span>
                {c.count != null && <span className="text-xs text-ink-400">{c.count}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-bold text-ink-950">{t("shop.brand")}</p>
        <div className="max-h-64 space-y-1 overflow-y-auto pe-1">
          {brands.map((b) => (
            <button
              key={b.slug}
              onClick={() => update({ brand: current.brand === b.slug ? null : b.slug })}
              className={`block w-full truncate rounded-md px-2 py-1.5 text-start text-sm ${
                current.brand === b.slug
                  ? "bg-brand-50 font-semibold text-brand-800"
                  : "text-ink-600 hover:bg-ink-50"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-ink-950">{t("shop.price")} (QAR)</p>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            update({
              min: String(data.get("min") ?? ""),
              max: String(data.get("max") ?? ""),
            });
          }}
        >
          <input
            name="min"
            type="number"
            min={0}
            defaultValue={current.min}
            placeholder={t("shop.min")}
            className="field py-1.5 text-sm"
          />
          <input
            name="max"
            type="number"
            min={0}
            defaultValue={current.max}
            placeholder={t("shop.max")}
            className="field py-1.5 text-sm"
          />
          <button type="submit" className="btn-ghost px-3 py-1.5 text-sm">
            OK
          </button>
        </form>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={current.inStock}
          onChange={(e) => update({ inStock: e.target.checked ? "1" : null })}
          className="h-4 w-4 accent-brand-700"
        />
        {t("shop.inStockOnly")}
      </label>

      {activeCount > 0 && (
        <button onClick={clearAll} className="text-sm font-semibold text-brand-700 hover:underline">
          {t("shop.clear")} ({activeCount})
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* toolbar */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-500">{t("shop.results", { n: total })}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="btn-ghost gap-1.5 px-3 py-1.5 text-sm lg:hidden"
          >
            <SlidersHorizontal size={15} />
            {t("shop.filters")}
            {activeCount > 0 && (
              <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-700 text-[10px] text-white">
                {activeCount}
              </span>
            )}
          </button>
          <select
            value={current.sort}
            onChange={(e) => update({ sort: e.target.value })}
            className="field w-auto py-1.5 text-sm"
          >
            <option value="relevance">{t("shop.sort.relevance")}</option>
            <option value="newest">{t("shop.sort.newest")}</option>
            <option value="priceAsc">{t("shop.sort.priceAsc")}</option>
            <option value="priceDesc">{t("shop.sort.priceDesc")}</option>
            <option value="nameAsc">{t("shop.sort.nameAsc")}</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="card sticky top-40 p-4">{panel}</div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>

      {/* mobile sheet */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 end-0 w-[85%] max-w-sm overflow-y-auto bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-bold">{t("shop.filters")}</p>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-ink-50">
                <X size={20} />
              </button>
            </div>
            {panel}
            <button
              onClick={() => setOpen(false)}
              className="btn-primary mt-6 w-full"
              type="button"
            >
              {t("shop.apply")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function Pagination({ page, pages }: { page: number; pages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (pages <= 1) return null;

  function go(p: number) {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(p));
    router.push(`${pathname}?${next.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const window_ = 2;
  const nums: (number | "…")[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= window_) nums.push(i);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      <button
        onClick={() => go(Math.max(1, page - 1))}
        disabled={page === 1}
        className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40"
      >
        ‹
      </button>
      {nums.map((n, i) =>
        n === "…" ? (
          <span key={`gap-${i}`} className="px-2 text-ink-400">
            …
          </span>
        ) : (
          <button
            key={n}
            onClick={() => go(n)}
            className={`min-w-9 rounded-lg px-3 py-1.5 text-sm font-medium ${
              n === page
                ? "bg-brand-700 text-white"
                : "border border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
            }`}
          >
            {n}
          </button>
        ),
      )}
      <button
        onClick={() => go(Math.min(pages, page + 1))}
        disabled={page === pages}
        className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40"
      >
        ›
      </button>
    </nav>
  );
}
