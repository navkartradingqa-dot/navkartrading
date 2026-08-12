"use client";

import { useActionState, useState } from "react";
import { Loader2, Check, Plus, Minus, ClipboardList } from "lucide-react";
import { adjustStock, type ActionState } from "@/app/admin/actions";

export function StockAdjuster({
  productId,
  stock,
  name,
}: {
  productId: string;
  stock: number;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(adjustStock, {});

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:border-brand-400 hover:text-brand-700"
      >
        Adjust
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-bold text-ink-950">Adjust stock</h3>
            <p className="mt-0.5 line-clamp-2 text-sm text-ink-500">{name}</p>
            <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-sm">
              Current stock: <strong className="text-ink-950">{stock}</strong>
            </p>

            <form action={action} className="mt-4 space-y-3">
              <input type="hidden" name="productId" value={productId} />

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-ink-500">Mode</span>
                  <select name="mode" className="field" defaultValue="delta">
                    <option value="delta">Add / remove</option>
                    <option value="set">Set to exact count</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-ink-500">Quantity</span>
                  <input
                    name="amount"
                    type="number"
                    step="1"
                    defaultValue="0"
                    className="field"
                    autoFocus
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-500">Reason</span>
                <select name="type" className="field" defaultValue="PURCHASE">
                  <option value="PURCHASE">Goods received from supplier</option>
                  <option value="ADJUSTMENT">Stock count correction</option>
                  <option value="RETURN">Customer return</option>
                  <option value="DAMAGE">Damaged / written off</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-500">
                  Note (invoice number, supplier…)
                </span>
                <input name="note" className="field" />
              </label>

              <p className="flex items-start gap-1.5 text-[11px] text-ink-400">
                <ClipboardList size={13} className="mt-0.5 shrink-0" />
                Use a negative number with “Add / remove” to take stock out.
              </p>

              {state.error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
              )}
              {state.ok && state.message && (
                <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <Check size={13} />
                  {state.message}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={pending} className="btn-primary flex-1 text-sm">
                  {pending && <Loader2 size={15} className="animate-spin" />}
                  Save movement
                </button>
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm">
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/** One-tap +1 / −1 used on the inventory list for quick counter corrections. */
export function QuickStock({ productId }: { productId: string }) {
  const [, action, pending] = useActionState<ActionState, FormData>(adjustStock, {});

  return (
    <form action={action} className="inline-flex items-center gap-1">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="mode" value="delta" />
      <input type="hidden" name="type" value="ADJUSTMENT" />
      <input type="hidden" name="note" value="Quick adjust from inventory list" />
      <button
        name="amount"
        value="-1"
        disabled={pending}
        className="grid h-7 w-7 place-items-center rounded border border-ink-200 text-ink-500 hover:border-red-300 hover:text-red-600 disabled:opacity-40"
        aria-label="Remove one"
      >
        <Minus size={13} />
      </button>
      <button
        name="amount"
        value="1"
        disabled={pending}
        className="grid h-7 w-7 place-items-center rounded border border-ink-200 text-ink-500 hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-40"
        aria-label="Add one"
      >
        <Plus size={13} />
      </button>
    </form>
  );
}
