"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";

/**
 * Stand-in for the bank's 3-D Secure page while PAYMENT_PROVIDER="mock".
 * It calls the same webhook a real gateway would, so the order lifecycle you
 * test here is the one that runs in production.
 */
function SimulatePayInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [busy, setBusy] = useState<"paid" | "failed" | null>(null);

  const orderId = params.get("order") ?? "";
  const amount = params.get("amount") ?? "0.00";
  const ref = params.get("ref") ?? "";

  async function finish(status: "PAID" | "FAILED") {
    setBusy(status === "PAID" ? "paid" : "failed");
    await fetch("/api/payments/mock/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, ref, status, amount }),
    });
    const res = await fetch(`/api/orders/${orderId}/token`);
    const data = (await res.json()) as { token?: string };
    router.push(data.token ? `/order/${data.token}` : "/");
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-ink-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-5 flex items-center gap-2 border-b border-ink-100 pb-4">
          <ShieldCheck className="text-brand-700" size={22} />
          <div>
            <p className="text-sm font-bold text-ink-950">Secure payment (test mode)</p>
            <p className="text-xs text-ink-400">No real card is charged</p>
          </div>
        </div>

        <div className="rounded-xl bg-ink-50 p-4">
          <p className="text-xs text-ink-400">Amount</p>
          <p className="text-2xl font-bold text-ink-950">QAR {Number(amount).toFixed(2)}</p>
          <p className="mt-1 text-xs text-ink-400">Ref: {ref}</p>
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2.5 text-sm text-ink-400">
            <CreditCard size={16} />
            •••• •••• •••• 4242
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => finish("PAID")}
            disabled={busy !== null}
            className="btn-primary flex-1 disabled:opacity-60"
          >
            {busy === "paid" && <Loader2 size={16} className="animate-spin" />}
            Approve payment
          </button>
          <button
            onClick={() => finish("FAILED")}
            disabled={busy !== null}
            className="btn-ghost flex-1 border-red-300 text-red-600 disabled:opacity-60"
          >
            {busy === "failed" && <Loader2 size={16} className="animate-spin" />}
            Decline
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-400">
          This page only exists while PAYMENT_PROVIDER is set to &quot;mock&quot;. Switch it to
          &quot;skipcash&quot; and add your merchant keys to go live.
        </p>
      </div>
    </div>
  );
}

export default function SimulatePayPage() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center">Loading…</div>}>
      <SimulatePayInner />
    </Suspense>
  );
}
