"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Menu, Search, ShoppingCart, X, Truck, Phone, ChevronDown } from "lucide-react";
import { useCart } from "./cart-context";
import { useLocale } from "@/i18n/client";
import { site } from "@/lib/site";

type Cat = { slug: string; nameEn: string; nameAr: string };

export function Header({ categories }: { categories: Cat[] }) {
  const { t, locale } = useLocale();
  const { count, ready } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [menuOpen, setMenuOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [q, setQ] = useState(params.get("q") ?? "");
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setCatsOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatsOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
  }

  function switchLocale(to: "en" | "ar") {
    document.cookie = `nt_locale=${to}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  const catName = (c: Cat) => (locale === "ar" ? c.nameAr : c.nameEn);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white">
      {/* announcement strip */}
      <div className="bg-brand-800 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-xs">
          <span className="flex items-center gap-1.5">
            <Truck size={14} />
            {t("usp.delivery.sub")}
          </span>
          <div className="flex items-center gap-4">
            <a href={`tel:${site.phone}`} className="hidden items-center gap-1.5 sm:flex">
              <Phone size={13} />
              {site.phone}
            </a>
            <div className="flex items-center gap-1">
              <button
                onClick={() => switchLocale("en")}
                className={`rounded px-1.5 py-0.5 ${locale === "en" ? "bg-white/20 font-semibold" : "opacity-75"}`}
              >
                EN
              </button>
              <button
                onClick={() => switchLocale("ar")}
                className={`rounded px-1.5 py-0.5 ${locale === "ar" ? "bg-white/20 font-semibold" : "opacity-75"}`}
              >
                عربي
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <button
          className="rounded-lg p-2 text-ink-600 lg:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span>
            <img src="/Navkar-Logo.jpg" alt="Navkar Trading" className="h-[50px] w-auto object-contain" />
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-[25px] font-bold text-ink-950">{t("brand.name")}</span>
            <span className="text-[10px] text-ink-400">{site.domain}</span>
          </span>
        </Link>

        <form onSubmit={submitSearch} className="relative mx-auto hidden max-w-xl flex-1 md:block">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("nav.search")}
            className="w-full rounded-full border border-ink-200 bg-ink-50 py-2 ps-4 pe-11 text-sm outline-none focus:border-brand-400 focus:bg-white"
          />
          <button
            type="submit"
            className="absolute end-1 top-1 grid h-8 w-9 place-items-center rounded-full bg-brand-700 text-white"
            aria-label={t("common.search")}
          >
            <Search size={16} />
          </button>
        </form>

        <div className="ms-auto flex items-center gap-1 md:ms-0">
          <Link
            href="/track"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 sm:block"
          >
            {t("nav.track")}
          </Link>
          <Link
            href="/cart"
            className="relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            <ShoppingCart size={20} />
            <span className="hidden lg:inline">{t("nav.cart")}</span>
            {ready && count > 0 && (
              <span className="absolute start-6 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-700 px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* mobile search */}
      <form onSubmit={submitSearch} className="relative px-4 pb-3 md:hidden">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("nav.search")}
          className="w-full rounded-full border border-ink-200 bg-ink-50 py-2 ps-4 pe-11 text-sm outline-none focus:border-brand-400 focus:bg-white"
        />
        <button
          type="submit"
          className="absolute end-5 top-1 grid h-8 w-9 place-items-center rounded-full bg-brand-700 text-white"
          aria-label={t("common.search")}
        >
          <Search size={16} />
        </button>
      </form>

      {/* category bar */}
      <nav className="hidden border-t border-ink-100 lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-4">
          <div ref={catRef} className="relative">
            <button
              onClick={() => setCatsOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-brand-700"
            >
              <Menu size={16} />
              {t("nav.allCategories")}
              <ChevronDown size={14} />
            </button>
            {catsOpen && (
              <div className="absolute start-0 top-full z-50 w-64 rounded-xl border border-ink-100 bg-white py-2 shadow-lg">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/category/${c.slug}`}
                    className="block px-4 py-2 text-sm text-ink-700 hover:bg-ink-50"
                  >
                    {catName(c)}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {categories.slice(0, 7).map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="px-3 py-2.5 text-sm text-ink-600 hover:text-brand-700"
            >
              {catName(c)}
            </Link>
          ))}
          <Link href="/shop?deals=1" className="px-3 py-2.5 text-sm font-semibold text-brand-700">
            {t("nav.deals")}
          </Link>
        </div>
      </nav>

      {/* mobile drawer */}
      {menuOpen && (
        <div className="border-t border-ink-100 bg-white lg:hidden">
          <div className="max-h-[70vh] overflow-y-auto px-4 py-2">
            <Link href="/shop" className="block py-2.5 text-sm font-semibold text-ink-900">
              {t("nav.shop")}
            </Link>
            <Link href="/track" className="block py-2.5 text-sm font-semibold text-ink-900">
              {t("nav.track")}
            </Link>
            <div className="my-2 h-px bg-ink-100" />
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="block py-2 text-sm text-ink-600"
              >
                {catName(c)}
              </Link>
            ))}
            <div className="my-2 h-px bg-ink-100" />
            <Link href="/contact" className="block py-2 text-sm text-ink-600">
              {t("nav.contact")}
            </Link>
            <Link href="/admin" className="block py-2 text-sm text-ink-600">
              {t("nav.account")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
