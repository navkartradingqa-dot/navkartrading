import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  Boxes,
  ArrowRight,
  Store,
  ScanBarcode,
} from "lucide-react";
import { getDashboardStats } from "@/lib/analytics";
import { formatMoney } from "@/lib/money";
import { StatusPill, ChannelPill } from "@/components/admin-bits";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const s = await getDashboardStats();
  const maxRevenue = Math.max(...s.series.map((d) => d.revenue), 1);

  const cards = [
    {
      label: "Sales today",
      value: formatMoney(s.today.revenue),
      sub: `${s.today.count} orders`,
      icon: TrendingUp,
      tone: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Last 7 days",
      value: formatMoney(s.week.revenue),
      sub: `${s.week.count} orders`,
      icon: ShoppingBag,
      tone: "text-brand-700 bg-brand-50",
    },
    {
      label: "Stock on hand",
      value: `${s.inventory.units.toLocaleString()} units`,
      sub: `${s.inventory.skus} active SKUs · ${formatMoney(s.inventory.retailValue)} retail`,
      icon: Boxes,
      tone: "text-blue-600 bg-blue-50",
    },
    {
      label: "Needs attention",
      value: `${s.inventory.lowStock + s.inventory.outOfStock}`,
      sub: `${s.inventory.lowStock} low · ${s.inventory.outOfStock} out of stock`,
      icon: AlertTriangle,
      tone: "text-amber-600 bg-amber-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-950">Dashboard</h1>
          <p className="text-sm text-ink-500">Live figures from the shop and the website.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/pos" className="btn-primary text-sm">
            <ScanBarcode size={16} />
            Open POS
          </Link>
          <Link href="/" className="btn-ghost text-sm">
            <Store size={16} />
            Storefront
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium text-ink-400">{c.label}</p>
              <span className={`grid h-8 w-8 place-items-center rounded-lg ${c.tone}`}>
                <c.icon size={16} />
              </span>
            </div>
            <p className="mt-2 text-xl font-bold text-ink-950">{c.value}</p>
            <p className="mt-0.5 text-xs text-ink-400">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 14-day chart */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-1 font-bold text-ink-950">Sales, last 14 days</h2>
          <p className="mb-5 text-xs text-ink-400">Online and counter combined</p>
          <div className="flex h-44 items-end gap-1.5">
            {s.series.map((d) => (
              <div key={d.day} className="group relative flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-brand-600 transition group-hover:bg-brand-700"
                  style={{ height: `${Math.max(2, (d.revenue / maxRevenue) * 100)}%` }}
                />
                <span className="text-[9px] text-ink-400">{d.day.slice(8)}</span>
                <span className="pointer-events-none absolute -top-8 hidden rounded bg-ink-950 px-2 py-1 text-[10px] whitespace-nowrap text-white group-hover:block">
                  {formatMoney(d.revenue)} · {d.count}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4">
            {s.channels.map((c) => (
              <div key={c.channel}>
                <p className="text-xs text-ink-400">
                  {c.channel === "POS" ? "Counter sales" : "Website sales"} (30d)
                </p>
                <p className="text-sm font-bold text-ink-900">{formatMoney(c.revenue)}</p>
                <p className="text-xs text-ink-400">{c.count} orders</p>
              </div>
            ))}
          </div>
        </div>

        {/* low stock */}
        <div className="card flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-ink-950">Low stock</h2>
            <Link href="/admin/inventory" className="text-xs font-semibold text-brand-700">
              Manage →
            </Link>
          </div>
          {s.lowStock.length === 0 ? (
            <p className="text-sm text-ink-400">Everything is above its reorder level.</p>
          ) : (
            <ul className="divide-y divide-ink-100 text-sm">
              {s.lowStock.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-xs font-medium text-ink-800">{p.nameEn}</p>
                    <p className="text-[11px] text-ink-400">{p.sku}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      p.stock === 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {p.stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
            <h2 className="font-bold text-ink-950">Recent orders</h2>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700"
            >
              All orders <ArrowRight size={13} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/60 text-xs text-ink-400">
                <tr>
                  <th className="px-4 py-2 text-start font-medium">Order</th>
                  <th className="px-4 py-2 text-start font-medium">Customer</th>
                  <th className="px-4 py-2 text-start font-medium">Status</th>
                  <th className="px-4 py-2 text-end font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {s.recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-ink-50/50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                      <div className="mt-0.5">
                        <ChannelPill channel={o.channel} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-ink-600">{o.customerName}</td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={o.status} />
                    </td>
                    <td className="px-4 py-2.5 text-end font-semibold">{formatMoney(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-bold text-ink-950">Best sellers (30d)</h2>
          {s.topProducts.length === 0 ? (
            <p className="text-sm text-ink-400">No sales in the last 30 days yet.</p>
          ) : (
            <ol className="space-y-2.5">
              {s.topProducts.map((p, i) => (
                <li key={p.sku} className="flex items-start gap-3">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-ink-100 text-[10px] font-bold text-ink-500">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-xs font-medium text-ink-800">{p.name}</p>
                    <p className="text-[11px] text-ink-400">
                      {p.units} units · {formatMoney(p.revenue)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
