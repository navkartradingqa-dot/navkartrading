import Link from "next/link";
import { Download } from "lucide-react";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { formatMoney } from "@/lib/money";
import { StatusPill, PaymentPill, ChannelPill, EmptyState } from "@/components/admin-bits";
import { AdminSearch, AdminPagination } from "@/components/admin-table-bits";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminOrdersPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(one(sp.page) ?? 1) || 1);
  const perPage = 30;

  const conditions = [];
  const status = one(sp.status);
  const channel = one(sp.channel);
  const q = one(sp.q);

  if (status) conditions.push(eq(orders.status, status as never));
  if (channel) conditions.push(eq(orders.channel, channel as never));
  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(orders.orderNumber, term),
        ilike(orders.customerName, term),
        ilike(orders.customerPhone, term),
        ilike(orders.trackingToken, term),
      )!,
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [countRow], [sum]] = await Promise.all([
    db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(perPage).offset((page - 1) * perPage),
    db.select({ count: sql<number>`count(*)::int` }).from(orders).where(where),
    db
      .select({ total: sql<string>`coalesce(sum(${orders.total}), 0)::text` })
      .from(orders)
      .where(where),
  ]);

  const pages = Math.max(1, Math.ceil(countRow.count / perPage));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-950">Orders</h1>
          <p className="text-sm text-ink-500">
            {countRow.count} orders · {formatMoney(sum.total)} total
          </p>
        </div>
        <a href="/api/admin/export/orders" className="btn-ghost text-sm">
          <Download size={16} />
          Export CSV
        </a>
      </div>

      <AdminSearch
        placeholder="Search order number, name, phone or tracking code…"
        filters={[
          {
            name: "status",
            label: "All statuses",
            options: [
              "PENDING",
              "CONFIRMED",
              "PACKED",
              "OUT_FOR_DELIVERY",
              "DELIVERED",
              "COMPLETED",
              "CANCELLED",
            ].map((s) => ({ value: s, label: s.replace(/_/g, " ") })),
          },
          {
            name: "channel",
            label: "All channels",
            options: [
              { value: "ONLINE", label: "Website" },
              { value: "POS", label: "Counter" },
            ],
          },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState title="No orders found" sub="Try clearing the filters." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/70 text-xs text-ink-400">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">Order</th>
                  <th className="px-4 py-2.5 text-start font-medium">Date</th>
                  <th className="px-4 py-2.5 text-start font-medium">Customer</th>
                  <th className="px-4 py-2.5 text-start font-medium">Status</th>
                  <th className="px-4 py-2.5 text-start font-medium">Payment</th>
                  <th className="px-4 py-2.5 text-end font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-ink-50/50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <ChannelPill channel={o.channel} />
                        <span className="font-mono text-[10px] text-ink-400">
                          {o.trackingToken}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-ink-500">
                      {new Date(o.createdAt).toLocaleString("en-GB", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-ink-800">{o.customerName}</p>
                      <p className="text-[11px] text-ink-400">{o.customerPhone}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={o.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <PaymentPill status={o.paymentStatus} />
                      <p className="mt-0.5 text-[10px] text-ink-400">{o.paymentMethod}</p>
                    </td>
                    <td className="px-4 py-2.5 text-end font-semibold">{formatMoney(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AdminPagination page={page} pages={pages} />
    </div>
  );
}
