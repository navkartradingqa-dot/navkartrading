import type { OrderStatus, PaymentStatus } from "@/db/schema";

const STATUS_TONE: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-blue-50 text-blue-700",
  PACKED: "bg-indigo-50 text-indigo-700",
  OUT_FOR_DELIVERY: "bg-purple-50 text-purple-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-50 text-red-700",
  REFUNDED: "bg-ink-100 text-ink-600",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${STATUS_TONE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const PAY_TONE: Record<PaymentStatus, string> = {
  UNPAID: "bg-ink-100 text-ink-600",
  PENDING: "bg-amber-50 text-amber-700",
  PAID: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-red-50 text-red-700",
  REFUNDED: "bg-ink-100 text-ink-600",
};

export function PaymentPill({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${PAY_TONE[status]}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function ChannelPill({ channel }: { channel: "ONLINE" | "POS" }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
        channel === "POS" ? "bg-ink-950 text-white" : "bg-ink-100 text-ink-600"
      }`}
    >
      {channel === "POS" ? "COUNTER" : "ONLINE"}
    </span>
  );
}

export function StockPill({ stock, threshold }: { stock: number; threshold: number }) {
  const tone =
    stock === 0
      ? "bg-red-50 text-red-700"
      : stock <= threshold
        ? "bg-amber-50 text-amber-700"
        : "bg-emerald-50 text-emerald-700";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>
      {stock}
    </span>
  );
}

export function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="card p-12 text-center">
      <p className="font-medium text-ink-700">{title}</p>
      {sub && <p className="mt-1 text-sm text-ink-400">{sub}</p>}
    </div>
  );
}
