"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Check, Minus, Plus } from "lucide-react";
import { useCart, type CartLine } from "./cart-context";
import { useLocale } from "@/i18n/client";

export function AddToCart({ line }: { line: Omit<CartLine, "qty"> }) {
  const { add } = useCart();
  const { t } = useLocale();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const soldOut = line.stock <= 0;

  function onAdd(buyNow = false) {
    if (soldOut) return;
    add(line, qty);
    if (buyNow) {
      router.push("/checkout");
      return;
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-ink-600">{t("cart.qty")}</span>
        <div className="inline-flex items-center rounded-lg border border-ink-200">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={soldOut || qty <= 1}
            className="grid h-9 w-9 place-items-center text-ink-600 disabled:opacity-30"
            aria-label="Decrease"
          >
            <Minus size={15} />
          </button>
          <span className="w-10 text-center text-sm font-semibold">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(line.stock, q + 1))}
            disabled={soldOut || qty >= line.stock}
            className="grid h-9 w-9 place-items-center text-ink-600 disabled:opacity-30"
            aria-label="Increase"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={() => onAdd(false)}
          disabled={soldOut}
          className="btn-primary flex-1 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
        >
          {added ? <Check size={18} /> : <ShoppingCart size={18} />}
          {soldOut ? t("product.outOfStock") : t("product.addToCart")}
        </button>
        <button
          onClick={() => onAdd(true)}
          disabled={soldOut}
          className="btn-ghost flex-1 border-brand-700 text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("product.buyNow")}
        </button>
      </div>
    </div>
  );
}
