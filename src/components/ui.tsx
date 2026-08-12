"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { useLocale } from "@/i18n/client";

export function Price({
  value,
  compareAt,
  size = "md",
}: {
  value: string | number;
  compareAt?: string | number | null;
  size?: "sm" | "md" | "lg";
}) {
  const { locale } = useLocale();
  const cls = {
    sm: "text-sm font-semibold",
    md: "text-base font-bold",
    lg: "text-2xl font-bold",
  }[size];

  const hasDiscount = compareAt != null && Number(compareAt) > Number(value);

  return (
    <span className="flex flex-wrap items-baseline gap-2">
      <span className={`${cls} text-ink-950`}>{formatMoney(value, locale)}</span>
      {hasDiscount && (
        <span className="text-xs text-ink-400 line-through">{formatMoney(compareAt, locale)}</span>
      )}
    </span>
  );
}

export function StockBadge({ stock, threshold = 5 }: { stock: number; threshold?: number }) {
  const { t } = useLocale();
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-500">
        {t("product.outOfStock")}
      </span>
    );
  }
  if (stock <= threshold) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        {t("product.lowStock", { n: stock })}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      {t("product.inStock")}
    </span>
  );
}

export function SectionHeading({
  title,
  href,
  cta,
}: {
  title: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-xl font-bold text-ink-950 sm:text-2xl">{title}</h2>
      {href && cta && (
        <Link href={href} className="text-sm font-semibold text-brand-700 hover:underline">
          {cta} →
        </Link>
      )}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden
    />
  );
}
