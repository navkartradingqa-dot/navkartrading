import Link from "next/link";
import { Truck, Banknote, ShieldCheck, Lock } from "lucide-react";
import { getCategories, getCategoryCounts, getFeatured, getDeals, getNewArrivals } from "@/lib/catalog";
import { ProductGrid } from "@/components/product-card";
import { SectionHeading } from "@/components/ui";
import { getT } from "@/i18n/server";
import { CategoryTiles } from "@/components/category-tiles";

export default async function HomePage() {
  const { t } = await getT();
  const [categories, counts, featured, deals, arrivals] = await Promise.all([
    getCategories(),
    getCategoryCounts(),
    getFeatured(10),
    getDeals(10),
    getNewArrivals(10),
  ]);

  const usps = [
    { icon: Truck, title: t("usp.delivery.title"), sub: t("usp.delivery.sub") },
    { icon: Banknote, title: t("usp.cod.title"), sub: t("usp.cod.sub") },
    { icon: ShieldCheck, title: t("usp.warranty.title"), sub: t("usp.warranty.sub") },
    { icon: Lock, title: t("usp.secure.title"), sub: t("usp.secure.sub") },
  ];

  return (
    <>
      {/* hero */}
      <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              {t("brand.tagline")}
            </span>
            <h1 className="mt-4 text-3xl leading-tight font-bold sm:text-5xl">
              {t("home.hero.title")}
            </h1>
            <p className="mt-4 max-w-lg text-base text-white/85 sm:text-lg">{t("home.hero.sub")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="rounded-lg bg-white px-6 py-3 text-sm font-bold text-brand-800 transition hover:bg-white/90"
              >
                {t("home.hero.cta")}
              </Link>
              <Link
                href="/track"
                className="rounded-lg border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                {t("home.hero.cta2")}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {usps.map((u) => (
              <div key={u.title} className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                <u.icon size={22} className="mb-2 text-gold-400" />
                <p className="text-sm font-bold">{u.title}</p>
                <p className="mt-1 text-xs text-white/75">{u.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
        <SectionHeading title={t("home.browse")} />
        <CategoryTiles
          categories={categories.map((c) => ({
            slug: c.slug,
            nameEn: c.nameEn,
            nameAr: c.nameAr,
            icon: c.icon,
            count: counts.get(c.id) ?? 0,
          }))}
        />

        {deals.length > 0 && (
          <section className="mt-12">
            <SectionHeading title={t("home.deals")} href="/shop?sort=priceAsc" cta={t("home.viewAll")} />
            <ProductGrid products={deals} />
          </section>
        )}

        {featured.length > 0 && (
          <section className="mt-12">
            <SectionHeading title={t("home.featured")} href="/shop" cta={t("home.viewAll")} />
            <ProductGrid products={featured} />
          </section>
        )}

        <section className="mt-12">
          <SectionHeading title={t("home.newArrivals")} href="/shop?sort=newest" cta={t("home.viewAll")} />
          <ProductGrid products={arrivals} />
        </section>
      </div>
    </>
  );
}
