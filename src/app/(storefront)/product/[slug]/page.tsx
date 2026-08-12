import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Truck, RotateCcw, MessageCircle } from "lucide-react";
import { getProductBySlug, getRelated } from "@/lib/catalog";
import { ProductImage } from "@/components/product-image";
import { ProductGrid } from "@/components/product-card";
import { AddToCart } from "@/components/add-to-cart";
import { Price, StockBadge, SectionHeading } from "@/components/ui";
import { getT } from "@/i18n/server";
import { site, whatsappLink } from "@/lib/site";
import { formatMoney } from "@/lib/money";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.nameEn,
    description: product.descEn.slice(0, 155),
    openGraph: { title: product.nameEn, description: product.descEn.slice(0, 155) },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const { t, locale } = await getT();

  const product = await getProductBySlug(slug);
  if (!product || !product.active) notFound();

  const related = await getRelated(product, 5);
  const name = locale === "ar" ? product.nameAr : product.nameEn;
  const desc = locale === "ar" ? product.descAr : product.descEn;
  const categoryName = locale === "ar" ? product.categoryNameAr : product.categoryNameEn;

  const specs = Object.entries(product.specs ?? {});
  const saving =
    product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price)
      ? Number(product.compareAtPrice) - Number(product.price)
      : 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nameEn,
    sku: product.sku,
    gtin13: product.barcode ?? undefined,
    brand: product.brandName ? { "@type": "Brand", name: product.brandName } : undefined,
    description: product.descEn.slice(0, 300),
    offers: {
      "@type": "Offer",
      priceCurrency: "QAR",
      price: product.price,
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${site.url}/product/${product.slug}`,
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-ink-400">
        <Link href="/" className="hover:text-brand-700">
          {t("nav.home")}
        </Link>
        <span>/</span>
        <Link href={`/category/${product.categorySlug}`} className="hover:text-brand-700">
          {categoryName}
        </Link>
        <span>/</span>
        <span className="line-clamp-1 text-ink-600">{name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="card aspect-square overflow-hidden p-6">
          <ProductImage name={product.nameEn} images={product.images} seed={product.sku} />
        </div>

        <div>
          {product.brandName && (
            <Link
              href={`/shop?brand=${product.brandName.toLowerCase()}`}
              className="text-sm font-semibold tracking-wide text-brand-700 uppercase"
            >
              {product.brandName}
            </Link>
          )}
          <h1 className="mt-1 text-2xl leading-snug font-bold text-ink-950 sm:text-3xl">{name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Price value={product.price} compareAt={product.compareAtPrice} size="lg" />
            <StockBadge stock={product.stock} threshold={product.lowStockThreshold} />
          </div>
          {saving > 0 && (
            <p className="mt-1 text-sm font-semibold text-emerald-700">
              {t("product.save")} {formatMoney(saving, locale)}
            </p>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="text-ink-400">{t("product.sku")}:</dt>
              <dd className="font-medium text-ink-700">{product.sku}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-400">{t("product.warranty")}:</dt>
              <dd className="font-medium text-ink-700">
                {product.warrantyMonths} {t("product.months")}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <AddToCart
              line={{
                productId: product.id,
                slug: product.slug,
                sku: product.sku,
                nameEn: product.nameEn,
                nameAr: product.nameAr,
                price: product.price,
                stock: product.stock,
                image: product.images?.[0],
                categorySlug: product.categorySlug,
              }}
            />
          </div>

          <a
            href={whatsappLink(`Hello, I'd like to ask about ${product.nameEn} (${product.sku})`)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            <MessageCircle size={16} />
            Ask about this on WhatsApp
          </a>

          <div className="card mt-6 divide-y divide-ink-100">
            {[
              { icon: Truck, title: t("usp.delivery.title"), sub: t("usp.delivery.sub") },
              { icon: ShieldCheck, title: t("usp.warranty.title"), sub: t("usp.warranty.sub") },
              {
                icon: RotateCcw,
                title: "7-day exchange",
                sub: "Unopened items in original packaging",
              },
            ].map((row) => (
              <div key={row.title} className="flex items-start gap-3 p-3.5">
                <row.icon size={18} className="mt-0.5 shrink-0 text-brand-700" />
                <div>
                  <p className="text-sm font-semibold text-ink-900">{row.title}</p>
                  <p className="text-xs text-ink-500">{row.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink-950">{t("product.description")}</h2>
          <div className="card p-5 text-sm leading-relaxed whitespace-pre-line text-ink-600">
            {desc}
          </div>
        </section>

        {specs.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-bold text-ink-950">{t("product.specs")}</h2>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-ink-100">
                  {specs.map(([k, v]) => (
                    <tr key={k}>
                      <th className="w-2/5 bg-ink-50/60 px-4 py-2.5 text-start font-medium text-ink-500">
                        {k}
                      </th>
                      <td className="px-4 py-2.5 text-ink-800">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <SectionHeading title={t("product.related")} />
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
