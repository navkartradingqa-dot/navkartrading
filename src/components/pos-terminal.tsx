"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ScanBarcode,
  Search,
  Trash2,
  Plus,
  Minus,
  Banknote,
  CreditCard,
  SplitSquareHorizontal,
  Loader2,
  X,
  LogOut,
  LayoutDashboard,
  Wallet,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { completeSale, openShift, closeShift, type SaleResult } from "@/app/pos/actions";
import { logoutAction } from "@/app/auth-actions";
import { formatMoney, toFils, fromFils } from "@/lib/money";
import { Receipt } from "./receipt";

type PosProduct = {
  id: string;
  sku: string;
  barcode: string | null;
  nameEn: string;
  price: string;
  stock: number;
  brandName: string | null;
};

type Line = PosProduct & { qty: number };

type Shift = {
  id: string;
  openedAt: string;
  openingFloat: string;
  totals: { cash: string; card: string; gross: string; count: number };
};

const QUICK_CASH = [50, 100, 200, 500, 1000];

export function PosTerminal({
  user,
  categories,
  initialProducts,
  shift,
}: {
  user: { id: string; name: string; role: string };
  categories: { slug: string; name: string }[];
  initialProducts: PosProduct[];
  shift: Shift | null;
}) {
  const [products, setProducts] = useState<PosProduct[]>(initialProducts);
  const [category, setCategory] = useState<string>("");
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [payment, setPayment] = useState<"CASH" | "CARD_POS" | "SPLIT">("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<(SaleResult & { ok: true }) | null>(null);
  const [receiptLines, setReceiptLines] = useState<Line[]>([]);
  const [showShift, setShowShift] = useState(false);
  const [pending, startTransition] = useTransition();
  const [loadingList, setLoadingList] = useState(false);

  const scanRef = useRef<HTMLInputElement>(null);

  /* keep the scanner input focused — barcode guns type into whatever has focus */
  useEffect(() => {
    const id = setInterval(() => {
      const el = document.activeElement;
      const isField = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
      if (!isField && !receipt && !showShift) scanRef.current?.focus();
    }, 1200);
    return () => clearInterval(id);
  }, [receipt, showShift]);

  /* product list: search or category browse */
  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!query.trim() && !category) {
        setProducts(initialProducts);
        return;
      }
      setLoadingList(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category) params.set("category", category);
      const res = await fetch(`/api/pos/search?${params}`);
      const data = (await res.json()) as { products?: PosProduct[] };
      setProducts(data.products ?? []);
      setLoadingList(false);
    }, 220);
    return () => clearTimeout(handle);
  }, [query, category, initialProducts]);

  const subtotalFils = lines.reduce((sum, l) => sum + toFils(l.price) * l.qty, 0);
  const discountFils = Math.min(toFils(discount || "0"), subtotalFils);
  const totalFils = subtotalFils - discountFils;
  const total = fromFils(totalFils);

  const changeFils = Math.max(0, toFils(cashReceived || "0") - totalFils);
  const splitCashFils = Math.min(toFils(splitCash || "0"), totalFils);
  const splitCardFils = totalFils - splitCashFils;

  const canPay =
    lines.length > 0 &&
    (payment !== "CASH" || toFils(cashReceived || "0") >= totalFils) &&
    (payment !== "SPLIT" || splitCashFils >= 0);

  function addProduct(p: PosProduct, qty = 1) {
    setError(null);
    setLines((prev) => {
      const found = prev.find((l) => l.id === p.id);
      if (found) {
        if (found.qty + qty > p.stock) {
          setError(`Only ${p.stock} of ${p.nameEn} in stock.`);
          return prev;
        }
        return prev.map((l) => (l.id === p.id ? { ...l, qty: l.qty + qty } : l));
      }
      if (qty > p.stock) {
        setError(`${p.nameEn} is out of stock.`);
        return prev;
      }
      return [...prev, { ...p, qty }];
    });
  }

  async function onScan(e: React.FormEvent) {
    e.preventDefault();
    const code = scanRef.current?.value.trim();
    if (!code) return;
    const res = await fetch(`/api/pos/search?code=${encodeURIComponent(code)}`);
    const data = (await res.json()) as { product?: PosProduct | null };
    if (data.product) {
      addProduct(data.product);
      if (scanRef.current) scanRef.current.value = "";
    } else {
      setError(`No product found for “${code}”.`);
      if (scanRef.current) scanRef.current.select();
    }
  }

  function setQty(id: string, qty: number) {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.id !== id)
        : prev.map((l) => (l.id === id ? { ...l, qty: Math.min(qty, l.stock) } : l)),
    );
  }

  function clearSale() {
    setLines([]);
    setDiscount("");
    setCashReceived("");
    setSplitCash("");
    setCustomerName("");
    setCustomerPhone("");
    setError(null);
  }

  function pay() {
    setError(null);
    const snapshot = [...lines];
    startTransition(async () => {
      const result = await completeSale({
        lines: lines.map((l) => ({ productId: l.id, qty: l.qty })),
        payment,
        discount: discountFils ? fromFils(discountFils) : "0.00",
        cashReceived: payment === "CASH" ? cashReceived || total : undefined,
        cashAmount: payment === "SPLIT" ? fromFils(splitCashFils) : undefined,
        cardAmount: payment === "SPLIT" ? fromFils(splitCardFils) : undefined,
        customerName,
        customerPhone,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReceiptLines(snapshot);
      setReceipt(result);
      clearSale();
    });
  }

  const grid = useMemo(() => products.slice(0, 60), [products]);

  return (
    <div className="flex h-dvh flex-col bg-ink-100">
      {/* top bar */}
      <header className="flex shrink-0 items-center gap-3 bg-ink-950 px-4 py-2.5 text-white print:hidden">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-700 text-xs font-black">
          NT
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold">Counter POS</p>
          <p className="text-[10px] text-ink-400">{user.name}</p>
        </div>

        <form onSubmit={onScan} className="relative mx-auto w-full max-w-md">
          <ScanBarcode size={17} className="absolute start-3 top-2.5 text-ink-400" />
          <input
            ref={scanRef}
            autoFocus
            placeholder="Scan barcode or type SKU, then Enter"
            className="w-full rounded-lg bg-white/10 py-2 ps-10 pe-3 text-sm text-white placeholder:text-ink-400 focus:bg-white/15 focus:outline-none"
            autoComplete="off"
          />
        </form>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShift(true)}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
          >
            <Wallet size={14} className="inline" /> Shift
          </button>
          {user.role !== "CASHIER" && (
            <Link
              href="/admin"
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
            >
              <LayoutDashboard size={14} className="inline" /> Admin
            </Link>
          )}
          <form action={logoutAction}>
            <button className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">
              <LogOut size={14} className="inline" />
            </button>
          </form>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* product picker */}
        <section className="flex min-h-0 flex-1 flex-col p-3">
          <div className="mb-2 flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute start-3 top-2.5 text-ink-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products…"
                className="w-full rounded-lg border border-ink-200 bg-white py-2 ps-9 pe-3 text-sm outline-none focus:border-brand-400"
              />
            </div>
          </div>

          <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setCategory("")}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                category === "" ? "bg-brand-700 text-white" : "bg-white text-ink-600"
              }`}
            >
              Popular
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                onClick={() => setCategory(c.slug)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  category === c.slug ? "bg-brand-700 text-white" : "bg-white text-ink-600"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="grid h-40 place-items-center text-ink-400">
                <Loader2 className="animate-spin" />
              </div>
            ) : grid.length === 0 ? (
              <div className="grid h-40 place-items-center text-sm text-ink-400">
                Nothing matched that search.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {grid.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    disabled={p.stock <= 0}
                    className="flex flex-col rounded-xl border border-ink-200 bg-white p-3 text-start transition hover:border-brand-400 hover:shadow-sm disabled:opacity-40"
                  >
                    <span className="text-[10px] font-semibold tracking-wide text-ink-400 uppercase">
                      {p.brandName ?? p.sku}
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-xs leading-snug font-medium text-ink-900">
                      {p.nameEn}
                    </span>
                    <span className="mt-auto pt-2 text-sm font-bold text-brand-800">
                      {formatMoney(p.price)}
                    </span>
                    <span
                      className={`text-[10px] ${p.stock <= 3 ? "text-amber-600" : "text-ink-400"}`}
                    >
                      {p.stock} in stock
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* till */}
        <aside className="flex w-full shrink-0 flex-col border-t border-ink-200 bg-white lg:w-[400px] lg:border-t-0 lg:border-s print:hidden">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-2.5">
            <p className="font-bold text-ink-950">Current sale</p>
            {lines.length > 0 && (
              <button
                onClick={clearSale}
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-600"
              >
                <Trash2 size={13} /> Clear
              </button>
            )}
          </div>

          <div className="min-h-24 flex-1 overflow-y-auto">
            {lines.length === 0 ? (
              <p className="p-8 text-center text-sm text-ink-400">
                Scan an item or tap a product to start.
              </p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {lines.map((l) => (
                  <li key={l.id} className="flex items-start gap-2 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-xs font-medium text-ink-900">{l.nameEn}</p>
                      <p className="text-[10px] text-ink-400">
                        {l.sku} · {formatMoney(l.price)}
                      </p>
                      <div className="mt-1 inline-flex items-center rounded-lg border border-ink-200">
                        <button
                          onClick={() => setQty(l.id, l.qty - 1)}
                          className="grid h-6 w-6 place-items-center text-ink-500"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          value={l.qty}
                          onChange={(e) => setQty(l.id, Number(e.target.value))}
                          className="w-10 border-0 text-center text-xs font-semibold outline-none"
                        />
                        <button
                          onClick={() => setQty(l.id, l.qty + 1)}
                          disabled={l.qty >= l.stock}
                          className="grid h-6 w-6 place-items-center text-ink-500 disabled:opacity-30"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-ink-950">
                      {formatMoney(Number(l.price) * l.qty)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-ink-100 p-4">
            <div className="mb-3 grid grid-cols-2 gap-2">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer (optional)"
                className="field py-1.5 text-xs"
              />
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="field py-1.5 text-xs"
              />
            </div>

            <dl className="mb-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd>{formatMoney(fromFils(subtotalFils))}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-500">Discount</dt>
                <dd>
                  <input
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-24 rounded border border-ink-200 px-2 py-1 text-end text-sm outline-none focus:border-brand-400"
                  />
                </dd>
              </div>
              <div className="flex justify-between border-t border-ink-100 pt-2 text-xl font-bold">
                <dt>Total</dt>
                <dd className="text-brand-800">{formatMoney(total)}</dd>
              </div>
            </dl>

            <div className="mb-3 grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: "CASH", label: "Cash", icon: Banknote },
                  { id: "CARD_POS", label: "Card", icon: CreditCard },
                  { id: "SPLIT", label: "Split", icon: SplitSquareHorizontal },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPayment(m.id)}
                  className={`flex flex-col items-center gap-1 rounded-lg border py-2 text-xs font-semibold ${
                    payment === m.id
                      ? "border-brand-600 bg-brand-50 text-brand-800"
                      : "border-ink-200 text-ink-500"
                  }`}
                >
                  <m.icon size={16} />
                  {m.label}
                </button>
              ))}
            </div>

            {payment === "CASH" && (
              <div className="mb-3">
                <div className="mb-1.5 flex gap-1.5">
                  {QUICK_CASH.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setCashReceived(String(amount))}
                      className="flex-1 rounded border border-ink-200 py-1 text-xs font-semibold text-ink-600 hover:border-brand-400"
                    >
                      {amount}
                    </button>
                  ))}
                  <button
                    onClick={() => setCashReceived(total)}
                    className="flex-1 rounded border border-ink-200 py-1 text-xs font-semibold text-ink-600 hover:border-brand-400"
                  >
                    Exact
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    inputMode="decimal"
                    placeholder="Cash received"
                    className="field py-1.5 text-sm"
                  />
                  <div className="shrink-0 text-end">
                    <p className="text-[10px] text-ink-400">Change</p>
                    <p className="text-sm font-bold text-emerald-600">
                      {formatMoney(fromFils(changeFils))}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {payment === "SPLIT" && (
              <div className="mb-3 flex items-center gap-2">
                <input
                  value={splitCash}
                  onChange={(e) => setSplitCash(e.target.value)}
                  inputMode="decimal"
                  placeholder="Cash part"
                  className="field py-1.5 text-sm"
                />
                <div className="shrink-0 text-end">
                  <p className="text-[10px] text-ink-400">On card</p>
                  <p className="text-sm font-bold text-ink-900">
                    {formatMoney(fromFils(splitCardFils))}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}

            <button
              onClick={pay}
              disabled={!canPay || pending}
              className="w-full rounded-xl bg-brand-700 py-3.5 text-base font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400"
            >
              {pending ? (
                <Loader2 size={18} className="mx-auto animate-spin" />
              ) : (
                `Charge ${formatMoney(total)}`
              )}
            </button>
          </div>
        </aside>
      </div>

      {/* receipt */}
      {receipt && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4 print:static print:bg-white print:p-0">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 print:max-w-none print:rounded-none print:p-0">
            <div className="mb-3 flex items-center justify-between print:hidden">
              <p className="flex items-center gap-1.5 font-bold text-emerald-700">
                <CheckCircle2 size={18} /> Sale complete
              </p>
              <button onClick={() => setReceipt(null)} className="rounded p-1 hover:bg-ink-50">
                <X size={18} />
              </button>
            </div>

            <Receipt sale={receipt} lines={receiptLines} />

            <div className="mt-4 flex gap-2 print:hidden">
              <button onClick={() => window.print()} className="btn-primary flex-1 text-sm">
                Print receipt
              </button>
              <button onClick={() => setReceipt(null)} className="btn-ghost flex-1 text-sm">
                New sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* shift drawer */}
      {showShift && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 print:hidden">
          <div className="w-full max-w-md rounded-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-bold text-ink-950">Cash drawer / shift</p>
              <button onClick={() => setShowShift(false)} className="rounded p-1 hover:bg-ink-50">
                <X size={18} />
              </button>
            </div>

            {shift ? (
              <>
                <dl className="space-y-1.5 rounded-xl bg-ink-50 p-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Opened</dt>
                    <dd>{new Date(shift.openedAt).toLocaleString("en-GB")}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Opening float</dt>
                    <dd>{formatMoney(shift.openingFloat)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Sales</dt>
                    <dd>{shift.totals.count}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Cash taken</dt>
                    <dd>{formatMoney(shift.totals.cash)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Card taken</dt>
                    <dd>{formatMoney(shift.totals.card)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-ink-200 pt-2 font-bold">
                    <dt>Expected in drawer</dt>
                    <dd>
                      {formatMoney(
                        fromFils(toFils(shift.openingFloat) + toFils(shift.totals.cash)),
                      )}
                    </dd>
                  </div>
                </dl>

                <form action={closeShift} className="mt-4 space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-500">
                      Counted cash in drawer
                    </span>
                    <input name="countedCash" inputMode="decimal" className="field" required />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-500">Note</span>
                    <input name="note" className="field" />
                  </label>
                  <button className="btn-primary w-full text-sm">Close shift</button>
                </form>
              </>
            ) : (
              <form action={openShift} className="space-y-3">
                <p className="text-sm text-ink-500">
                  Start a shift so cash and card takings are grouped for the end-of-day count.
                </p>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-ink-500">
                    Opening float (cash in drawer now)
                  </span>
                  <input
                    name="openingFloat"
                    inputMode="decimal"
                    defaultValue="0"
                    className="field"
                  />
                </label>
                <button className="btn-primary w-full text-sm">Open shift</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
