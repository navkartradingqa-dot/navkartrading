import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getBrands, getCategoryBySlug, listProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/product-card";
import { ShopFilters, Pagination } from "@/components/shop-filters";
import { getT } from "@/i18n/server";

type Params = Promise<{ slug: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  return { title: category?.nameEn ?? "Category" };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SP;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const page = Math.max(1, Number(one(sp.page) ?? 1) || 1);
  const sortParam = one(sp.sort);
  const sort = (["newest", "priceAsc", "priceDesc", "nameAsc", "relevance"].includes(
    sortParam ?? "",
  )
    ? sortParam
    : "relevance") as "newest" | "priceAsc" | "priceDesc" | "nameAsc" | "relevance";

  const [result, brands] = await Promise.all([
    listProducts({
      category: slug,
      q: one(sp.q),
      brand: one(sp.brand),
      min: one(sp.min) ? Number(one(sp.min)) : undefined,
      max: one(sp.max) ? Number(one(sp.max)) : undefined,
      inStock: one(sp.inStock) === "1",
      sort,
      page,
      perPage: 24,
    }),
    getBrands(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-2 flex items-center gap-1.5 text-xs text-ink-400">
        <Link href="/" className="hover:text-brand-700">
          {t("nav.home")}
        </Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-brand-700">
          {t("nav.shop")}
        </Link>
        <span>/</span>
        <span className="text-ink-600">{locale === "ar" ? category.nameAr : category.nameEn}</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-ink-950">
        {locale === "ar" ? category.nameAr : category.nameEn}
      </h1>

      <Suspense fallback={<div className="h-10" />}>
        <ShopFilters
          hideCategory
          total={result.total}
          categories={[]}
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
