import { Suspense } from "react";
import type { Metadata } from "next";
import { getBrands, getCategories, getCategoryCounts, listProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/product-card";
import { ShopFilters, Pagination } from "@/components/shop-filters";
import { getT } from "@/i18n/server";

export const metadata: Metadata = { title: "Shop all products" };

type SP = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { t, locale } = await getT();

  const page = Math.max(1, Number(one(sp.page) ?? 1) || 1);
  const sortParam = one(sp.sort);
  const sort = (["newest", "priceAsc", "priceDesc", "nameAsc", "relevance"].includes(
    sortParam ?? "",
  )
    ? sortParam
    : "relevance") as "newest" | "priceAsc" | "priceDesc" | "nameAsc" | "relevance";

  const [result, categories, counts, brands] = await Promise.all([
    listProducts({
      q: one(sp.q),
      category: one(sp.category),
      brand: one(sp.brand),
      min: one(sp.min) ? Number(one(sp.min)) : undefined,
      max: one(sp.max) ? Number(one(sp.max)) : undefined,
      inStock: one(sp.inStock) === "1",
      sort,
      page,
      perPage: 24,
    }),
    getCategories(),
    getCategoryCounts(),
    getBrands(),
  ]);

  const q = one(sp.q);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-ink-950">
        {q ? `“${q}”` : t("shop.title")}
      </h1>
      <p className="mb-6 text-sm text-ink-500">{t("brand.tagline")}</p>

      <Suspense fallback={<div className="h-10" />}>
        <ShopFilters
          total={result.total}
          categories={categories.map((c) => ({
            slug: c.slug,
            label: locale === "ar" ? c.nameAr : c.nameEn,
            count: counts.get(c.id) ?? 0,
          }))}
          brands={brands.map((b) => ({ slug: b.slug, label: b.name }))}
        >
          {result.items.length === 0 ? (
            <div className="card p-10 text-center text-ink-500">{t("shop.noResults")}</div>
          ) : (
            <>
              <ProductGrid products={result.items} />
              <Pagination page={result.page} pages={result.pages} />
            </>
          )}
        </ShopFilters>
      </Suspense>
    </div>
  );
}
