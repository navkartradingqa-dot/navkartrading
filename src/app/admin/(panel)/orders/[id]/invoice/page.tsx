import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderById } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { site } from "@/lib/site";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="text-sm font-medium text-brand-700">
          ← Back to order
        </Link>
        <PrintButton label="Print / save as PDF" />
      </div>

      <div className="card p-8 print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-ink-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-700 text-sm font-black text-white">
                NT
              </span>
              <div>
                <p className="text-lg font-bold text-ink-950">{site.name}</p>
                <p className="text-xs text-ink-400">{site.domain}</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              {site.address}
              <br />
              {site.phone}
              <br />
              {site.email}
            </p>
          </div>
          <div className="text-end">
            <p className="text-2xl font-bold tracking-tight text-ink-950">INVOICE</p>
            <p className="mt-1 text-sm font-semibold text-ink-700">{order.orderNumber}</p>
            <p className="text-xs text-ink-400">
              {new Date(order.createdAt).toLocaleString("en-GB", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
            <p className="mt-2 text-xs text-ink-400">
              Payment: {order.paymentMethod} · {order.paymentStatus}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-6">
          <div>
            <p className="mb-1 text-[10px] font-bold tracking-wider text-ink-400 uppercase">
              Billed to
            </p>
            <p className="text-sm font-medium text-ink-900">{order.customerName}</p>
            <p className="text-sm text-ink-500">{order.customerPhone}</p>
            {order.customerEmail && <p className="text-sm text-ink-500">{order.customerEmail}</p>}
          </div>
          {order.channel === "ONLINE" && (
            <div>
              <p className="mb-1 text-[10px] font-bold tracking-wider text-ink-400 uppercase">
                Delivery address
              </p>
              <p className="text-sm text-ink-600">
                {[
                  order.buildingNumber && `Building ${order.buildingNumber}`,
                  order.streetNumber && `Street ${order.streetNumber}`,
                  order.zone && `Zone ${order.zone}`,
                  order.city,
                ]
                  .filter(Boolean)
                  .join(", ")}
                {order.addressLine ? <><br />{order.addressLine}</> : null}
              </p>
            </div>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-ink-200 text-xs text-ink-500">
              <th className="py-2 text-start font-semibold">Description</th>
              <th className="py-2 text-center font-semibold">Qty</th>
              <th className="py-2 text-end font-semibold">Unit price</th>
              <th className="py-2 text-end font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2.5">
                  <p className="text-ink-800">{item.nameEn}</p>
                  <p className="text-[11px] text-ink-400">{item.sku}</p>
                </td>
                <td className="py-2.5 text-center">{item.qty}</td>
                <td className="py-2.5 text-end text-ink-600">{formatMoney(item.unitPrice)}</td>
                <td className="py-2.5 text-end font-medium">{formatMoney(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Subtotal</dt>
              <dd>{formatMoney(order.subtotal)}</dd>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-500">Discount</dt>
                <dd>−{formatMoney(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-500">Delivery</dt>
              <dd>{formatMoney(order.deliveryFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-ink-200 pt-2 text-base font-bold">
              <dt>Total ({order.currency})</dt>
              <dd>{formatMoney(order.total)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-10 border-t border-ink-200 pt-4 text-[11px] leading-relaxed text-ink-400">
          <p>
            Goods sold are covered by the manufacturer warranty stated on each item. Please keep
            this invoice — it is required for warranty service and exchanges.
          </p>
          <p className="mt-2">
            Add your commercial registration (CR) number and tax details here before issuing real
            invoices.
          </p>
        </div>
      </div>
    </div>
  );
}
