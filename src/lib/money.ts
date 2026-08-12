/**
 * All money in this app is stored as a Postgres numeric(10,2) and travels as a
 * string. These helpers keep the arithmetic in integer fils (1 QAR = 100 fils)
 * so we never hit float rounding on a customer's bill.
 */

export const CURRENCY = "QAR";

export function toFils(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  return Math.round(Number(value) * 100);
}

export function fromFils(fils: number): string {
  return (fils / 100).toFixed(2);
}

export function addMoney(...values: (string | number)[]): string {
  return fromFils(values.reduce<number>((sum, v) => sum + toFils(v), 0));
}

export function multiplyMoney(value: string | number, qty: number): string {
  return fromFils(toFils(value) * qty);
}

export function subtractMoney(a: string | number, b: string | number): string {
  return fromFils(toFils(a) - toFils(b));
}

/** Format for display, e.g. "QAR 1,299.00" or "١٬٢٩٩٫٠٠ ر.ق" */
export function formatMoney(value: string | number | null | undefined, locale: "en" | "ar" = "en") {
  const n = Number(value ?? 0);
  if (locale === "ar") {
    return new Intl.NumberFormat("ar-QA", {
      style: "currency",
      currency: CURRENCY,
      minimumFractionDigits: 2,
    }).format(n);
  }
  return `QAR ${new Intl.NumberFormat("en-QA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)}`;
}

/** Short form for tight UI, e.g. "1,299" */
export function formatMoneyShort(value: string | number | null | undefined) {
  return new Intl.NumberFormat("en-QA", { maximumFractionDigits: 0 }).format(Number(value ?? 0));
}
