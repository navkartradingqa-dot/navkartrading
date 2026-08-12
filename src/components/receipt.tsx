"use client";

import { site } from "@/lib/site";

type Sale = {
  orderNumber: string;
  total: string;
  subtotal: string;
  discount: string;
  change: string;
  paidCash: string;
  paidCard: string;
  at: string;
  cashier: string;
};

type Line = { nameEn: string; sku: string; price: string; qty: number };

/** 80 mm thermal receipt. The @media print block in globals.css sizes it. */
export function Receipt({ sale, lines }: { sale: Sale; lines: Line[] }) {
  return (
    <div className="receipt mx-auto w-full max-w-[300px] text-[11px] leading-snug text-black">
      <div className="text-center">
        <p className="text-sm font-bold tracking-wide">{site.name.toUpperCase()}</p>
        <p>{site.address}</p>
        <p>{site.phone}</p>
        <p>{site.domain}</p>
      </div>

      <Divider />

      <div className="flex justify-between">
        <span>Receipt</span>
        <span className="font-bold">{sale.orderNumber}</span>
      </div>
      <div className="flex justify-between">
        <span>Date</span>
        <span>{new Date(sale.at).toLocaleString("en-GB")}</span>
      </div>
      <div className="flex justify-between">
        <span>Cashier</span>
        <span>{sale.cashier}</span>
      </div>

      <Divider />

      <table className="w-full">
        <tbody>
          {lines.map((l) => (
            <tr key={l.sku} className="align-top">
              <td className="py-0.5">
                <div className="pe-1">{l.nameEn}</div>
                <div className="text-[10px]">
                  {l.qty} x {Number(l.price).toFixed(2)}
                </div>
              </td>
              <td className="py-0.5 text-end whitespace-nowrap">
                {(Number(l.price) * l.qty).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Divider />

      <Row label="Subtotal" value={Number(sale.subtotal).toFixed(2)} />
      {Number(sale.discount) > 0 && (
        <Row label="Discount" value={`-${Number(sale.discount).toFixed(2)}`} />
      )}
      <div className="my-1 flex justify-between text-sm font-bold">
        <span>TOTAL (QAR)</span>
        <span>{Number(sale.total).toFixed(2)}</span>
      </div>
      {Number(sale.paidCash) > 0 && <Row label="Cash" value={Number(sale.paidCash).toFixed(2)} />}
      {Number(sale.paidCard) > 0 && <Row label="Card" value={Number(sale.paidCard).toFixed(2)} />}
      {Number(sale.change) > 0 && <Row label="Change" value={Number(sale.change).toFixed(2)} />}

      <Divider />

      <div className="text-center text-[10px] leading-relaxed">
        <p>Keep this receipt for warranty and exchange.</p>
        <p>Exchange within 7 days, unopened, with receipt.</p>
        <p className="mt-1 font-bold">Thank you — شكراً لتسوقكم معنا</p>
        <p className="mt-1">Track online: {site.domain}/track</p>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="my-1.5 border-t border-dashed border-black" />;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
