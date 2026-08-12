import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Printer, MessageCircle } from "lucide-react";
import { getOrderById, STATUS_FLOW } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { StatusPill, PaymentPill, ChannelPill } from "@/components/admin-bits";
import { updateOrderStatusAction } from "@/app/admin/actions";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const wa = `https://wa.me/${order.customerPhone.replace(/[^0-9]/g, "").replace(/^0+/, "")}?text=${encodeURIComponent(
    `Hello ${order.customerName}, this is ${site.name} regarding your order ${order.orderNumber}.`,
  )}`;

  const nextStatuses = STATUS_FLOW.filter((s) => s !== order.status);

  return (
    <div className="space-y-5">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-brand-700"
      >
        <ChevronLeft size={16} /> Orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-950">{order.orderNumber}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ChannelPill channel={order.channel} />
            <StatusPill status={order.status} />
            <PaymentPill status={order.paymentStatus} />
            <span className="font-mono text-xs text-ink-400">{order.trackingToken}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost text-sm">
            <MessageCircle size={15} />
            WhatsApp
          </a>
          <Link href={`/admin/orders/${order.id}/invoice`} className="btn-ghost text-sm">
            <Printer size={15} />
            Invoice
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <h2 className="border-b border-ink-100 px-5 py-3 font-bold text-ink-950">Items</h2>
            <table className="w-full text-sm">
              <thead className="bg-ink-50/70 text-xs text-ink-400">
                <tr>
                  <th className="px-5 py-2 text-start font-medium">Product</th>
                  <th className="px-5 py-2 text-center font-medium">Qty</th>
                  <th className="px-5 py-2 text-end font-medium">Unit</th>
                  <th className="px-5 py-2 text-end font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-2.5">
                      <p className="text-ink-800">{item.nameEn}</p>
                      <p className="text-[11px] text-ink-400">{item.sku}</p>
                    </td>
                    <td className="px-5 py-2.5 text-center">{item.qty}</td>
                    <td className="px-5 py-2.5 text-end text-ink-500">
                      {formatMoney(item.unitPrice)}
                    </td>
                    <td className="px-5 py-2.5 text-end font-semibold">
                      {formatMoney(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-ink-100 text-sm">
                <tr>
                  <td colSpan={3} className="px-5 py-1.5 text-end text-ink-500">
                    Subtotal
                  </td>
                  <td className="px-5 py-1.5 text-end">{formatMoney(order.subtotal)}</td>
                </tr>
                {Number(order.discount) > 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-1.5 text-end text-ink-500">
                      Discount
                    </td>
                    <td className="px-5 py-1.5 text-end text-emerald-600">
                      −{formatMoney(order.discount)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td colSpan={3} className="px-5 py-1.5 text-end text-ink-500">
                    Delivery
                  </td>
                  <td className="px-5 py-1.5 text-end">{formatMoney(order.deliveryFee)}</td>
                </tr>
                <tr className="text-base font-bold">
                  <td colSpan={3} className="px-5 py-2.5 text-end">
                    Total
                  </td>
                  <td className="px-5 py-2.5 text-end text-brand-800">
                    {formatMoney(order.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-bold text-ink-950">Update status</h2>
            <form action={updateOrderStatusAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="orderId" value={order.id} />
              <label className="block min-w-44 flex-1">
                <span className="mb-1 block text-xs font-medium text-ink-500">New status</span>
                <select name="status" className="field" defaultValue="">
                  <option value="" disabled>
                    Choose…
                  </option>
                  {nextStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                  <option value="CANCELLED">CANCELLED (returns stock)</option>
                </select>
              </label>
              <label className="block min-w-44 flex-1">
                <span className="mb-1 block text-xs font-medium text-ink-500">Note (optional)</span>
                <input name="note" className="field" placeholder="Driver: Ravi, 4:30pm" />
              </label>
              <button type="submit" className="btn-primary">
                Save
              </button>
            </form>
            <p className="mt-3 text-xs text-ink-400">
              Cancelling returns every line back to stock and logs a RETURN movement.
            </p>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-bold text-ink-950">Timeline</h2>
            <ol className="space-y-3">
              {order.events.map((ev) => (
                <li key={ev.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-700" />
                  <div>
                    <p className="font-medium text-ink-800">{ev.status.replace(/_/g, " ")}</p>
                    <p className="text-xs text-ink-400">
                      {new Date(ev.createdAt).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {ev.note ? ` · ${ev.note}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-5">
          <section className="card p-5 text-sm">
            <h2 className="mb-3 font-bold text-ink-950">Customer</h2>
            <p className="font-medium text-ink-800">{order.customerName}</p>
            <p className="text-ink-500">{order.customerPhone}</p>
            {order.customerEmail && <p className="text-ink-500">{order.customerEmail}</p>}

            {order.channel === "ONLINE" && (
              <>
                <h3 className="mt-4 mb-1 text-xs font-semibold tracking-wide text-ink-400 uppercase">
                  Delivery address
                </h3>
                <p className="text-ink-600">
                  {[
                    order.buildingNumber && `Building ${order.buildingNumber}`,
                    order.streetNumber && `Street ${order.streetNumber}`,
                    order.zone && `Zone ${order.zone}`,
                    order.city,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {order.addressLine && <p className="text-ink-600">{order.addressLine}</p>}
              </>
            )}

            {order.notes && (
              <>
                <h3 className="mt-4 mb-1 text-xs font-semibold tracking-wide text-ink-400 uppercase">
                  Order notes
                </h3>
                <p className="text-ink-600">{order.notes}</p>
              </>
            )}
          </section>

          <section className="card p-5 text-sm">
            <h2 className="mb-3 font-bold text-ink-950">Payment</h2>
            <dl className="space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-ink-400">Method</dt>
                <dd className="font-medium">{order.paymentMethod}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-400">Status</dt>
                <dd>
                  <PaymentPill status={order.paymentStatus} />
                </dd>
              </div>
              {order.cashReceived && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-ink-400">Cash received</dt>
                    <dd>{formatMoney(order.cashReceived)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-400">Change given</dt>
                    <dd>{formatMoney(order.changeGiven ?? "0")}</dd>
                  </div>
                </>
              )}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
