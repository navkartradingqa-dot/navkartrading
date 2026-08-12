"use client";

import Link from "next/link";
import { ShoppingCart, Check } from "lucide-react";
import { useState } from "react";
import { ProductImage } from "./product-image";
import { Price, StockBadge } from "./ui";
import { useCart } from "./cart-context";
import { useLocale } from "@/i18n/client";

export type CardProduct = {
  id: string;
  slug: string;
  sku: string;
  nameEn: string;
  nameAr: string;
  price: string;
  compareAtPrice: string | null;
  stock: number;
  lowStockThreshold: number;
  images: string[];
  brandName: string | null;
  categorySlug?: string;
};

export function ProductCard({ product }: { product: CardProduct }) {
  const { locale, t } = useLocale();
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  const name = locale === "ar" ? product.nameAr : product.nameEn;
  const soldOut = product.stock <= 0;

  function onAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (soldOut) return;
    add({
      productId: product.id,
      slug: product.slug,
      sku: product.sku,
      nameEn: product.nameEn,
      nameAr: product.nameAr,
      price: product.price,
      stock: product.stock,
      image: product.images?.[0],
      categorySlug: product.categorySlug,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  const discount =
    product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price)
      ? Math.round(
          ((Number(product.compareAtPrice) - Number(product.price)) /
            Number(product.compareAtPrice)) *
            100,
        )
      : 0;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group card flex flex-col overflow-hidden transition hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-ink-50 p-3">
        <ProductImage name={product.nameEn} images={product.images} seed={product.sku} />
        {discount > 0 && (
          <span className="absolute start-3 top-3 rounded-md bg-brand-700 px-2 py-0.5 text-xs font-bold text-white">
            −{discount}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {product.brandName && (
          <span className="text-xs font-medium tracking-wide text-ink-400 uppercase">
            {product.brandName}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm leading-snug font-medium text-ink-900 group-hover:text-brand-700">
          {name}
        </h3>

        <div className="mt-auto flex flex-col gap-2 pt-1">
          <Price value={product.price} compareAt={product.compareAtPrice} />
          <StockBadge stock={product.stock} threshold={product.lowStockThreshold} />
          <button
            type="button"
            onClick={onAdd}
            disabled={soldOut}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
          >
            {added ? <Check size={16} /> : <ShoppingCart size={16} />}
            {soldOut ? t("product.outOfStock") : added ? "✓" : t("product.addToCart")}
          </button>
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: CardProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
