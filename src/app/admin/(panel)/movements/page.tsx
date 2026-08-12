import Link from "next/link";
import { desc, eq, sql, and, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { stockMovements, products, users } from "@/db/schema";
import { AdminSearch, AdminPagination } from "@/components/admin-table-bits";
import { EmptyState } from "@/components/admin-bits";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const TYPE_TONE: Record<string, string> = {
  PURCHASE: "bg-emerald-50 text-emerald-700",
  INITIAL: "bg-blue-50 text-blue-700",
  SALE: "bg-brand-50 text-brand-700",
  POS_SALE: "bg-ink-950 text-white",
  RETURN: "bg-amber-50 text-amber-700",
  ADJUSTMENT: "bg-ink-100 text-ink-600",
  DAMAGE: "bg-red-50 text-red-700",
};

export default async function MovementsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(one(sp.page) ?? 1) || 1);
  const perPage = 50;
  const type = one(sp.type);
  const q = one(sp.q);

  const conditions = [];
  if (type) conditions.push(eq(stockMovements.type, type as never));
  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(products.nameEn, term),
        ilike(products.sku, term),
        ilike(stockMovements.reference, term),
      )!,
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        id: stockMovements.id,
        delta: stockMovements.delta,
        balance: stockMovements.balance,
        type: stockMovements.type,
        reference: stockMovements.reference,
        note: stockMovements.note,
        createdAt: stockMovements.createdAt,
        productId: products.id,
        sku: products.sku,
        name: products.nameEn,
        user: users.name,
      })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .leftJoin(users, eq(stockMovements.userId, users.id))
      .where(where)
      .orderBy(desc(stockMovements.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .where(where),
  ]);

  const pages = Math.max(1, Math.ceil(countRow.count / perPage));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink-950">Stock movements</h1>
        <p className="text-sm text-ink-500">
          Full audit trail — every sale, delivery and correction, newest first.
        </p>
      </div>

      <AdminSearch
        placeholder="Search product, SKU or reference…"
        filters={[
          {
            name: "type",
            label: "All types",
            options: [
              "PURCHASE",
              "SALE",
              "POS_SALE",
              "RETURN",
              "ADJUSTMENT",
              "DAMAGE",
              "INITIAL",
            ].map((t) => ({ value: t, label: t.replace("_", " ") })),
          },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState title="No movements found" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/70 text-xs text-ink-400">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">When</th>
                  <th className="px-4 py-2.5 text-start font-medium">Product</th>
                  <th className="px-4 py-2.5 text-start font-medium">Type</th>
                  <th className="px-4 py-2.5 text-end font-medium">Change</th>
                  <th className="px-4 py-2.5 text-end font-medium">Balance</th>
                  <th className="px-4 py-2.5 text-start font-medium">Reference</th>
                  <th className="px-4 py-2.5 text-start font-medium">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((m) => (
                  <tr key={m.id} className="hover:bg-ink-50/50">
                    <td className="px-4 py-2.5 whitespace-nowrap text-ink-500">
                      {new Date(m.createdAt).toLocaleString("en-GB", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/products/${m.productId}`}
                        className="line-clamp-1 font-medium text-ink-800 hover:text-brand-700"
                      >
                        {m.name}
                      </Link>
                      <p className="text-[11px] text-ink-400">{m.sku}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          TYPE_TONE[m.type] ?? "bg-ink-100 text-ink-600"
                        }`}
                      >
                        {m.type.replace("_", " ")}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-2.5 text-end font-semibold ${
                        m.delta >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {m.delta > 0 ? "+" : ""}
                      {m.delta}
                    </td>
                    <td className="px-4 py-2.5 text-end text-ink-600">{m.balance}</td>
                    <td className="px-4 py-2.5 text-ink-400">{m.reference ?? m.note ?? "—"}</td>
                    <td className="px-4 py-2.5 text-ink-400">{m.user ?? "System"}</td>
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
