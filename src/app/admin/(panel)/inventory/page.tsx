import Link from "next/link";
import { AlertTriangle, Boxes, Coins, TrendingDown } from "lucide-react";
import { and, asc, eq, gt, sql, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { products, categories, brands } from "@/db/schema";
import { getCategories } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { StockPill, EmptyState } from "@/components/admin-bits";
import { AdminSearch, AdminPagination } from "@/components/admin-table-bits";
import { StockAdjuster, QuickStock } from "@/components/stock-adjuster";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function InventoryPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(one(sp.page) ?? 1) || 1);
  const perPage = 40;
  const view = one(sp.view) ?? "all";
  const q = one(sp.q);
  const category = one(sp.category);

  const conditions = [eq(products.active, true)];
  if (view === "low") conditions.push(sql`${products.stock} <= ${products.lowStockThreshold}`);
  if (view === "out") conditions.push(eq(products.stock, 0));
  if (view === "in") conditions.push(gt(products.stock, 0));
  if (category) conditions.push(eq(categories.slug, category));
  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(
      or(ilike(products.nameEn, term), ilike(products.sku, term), ilike(products.barcode, term))!,
    );
  }
  const where = and(...conditions);

  const [rows, [countRow], [totals], categoryList] = await Promise.all([
    db
      .select({
        id: products.id,
        sku: products.sku,
        nameEn: products.nameEn,
        stock: products.stock,
        threshold: products.lowStockThreshold,
        price: products.price,
        cost: products.cost,
        category: categories.nameEn,
        brand: brands.name,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(where)
      .orderBy(asc(products.stock), asc(products.nameEn))
      .limit(perPage)
      .offset((page - 1) * perPage),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(where),

    db
      .select({
        skus: sql<number>`count(*)::int`,
        units: sql<number>`coalesce(sum(${products.stock}), 0)::int`,
        retail: sql<string>`coalesce(sum(${products.stock} * ${products.price}), 0)::text`,
        cost: sql<string>`coalesce(sum(${products.stock} * ${products.cost}), 0)::text`,
        low: sql<number>`count(*) filter (where ${products.stock} > 0 and ${products.stock} <= ${products.lowStockThreshold})::int`,
        out: sql<number>`count(*) filter (where ${products.stock} = 0)::int`,
      })
      .from(products)
      .where(eq(products.active, true)),

    getCategories(),
  ]);

  const pages = Math.max(1, Math.ceil(countRow.count / perPage));
  const margin = Number(totals.retail) - Number(totals.cost);

  const tabs = [
    { id: "all", label: "All stock" },
    { id: "low", label: `Low & out (${totals.low + totals.out})` },
    { id: "out", label: `Out of stock (${totals.out})` },
    { id: "in", label: "In stock" },
  ];

  const stats = [
    { label: "Units on hand", value: totals.units.toLocaleString(), icon: Boxes },
    { label: "Retail value", value: formatMoney(totals.retail), icon: Coins },
    { label: "Cost value", value: formatMoney(totals.cost), icon: TrendingDown },
    { label: "Potential margin", value: formatMoney(margin), icon: AlertTriangle },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink-950">Inventory</h1>
        <p className="text-sm text-ink-500">
          Every change here is written to the stock movement log.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-ink-400">{s.label}</p>
            <p className="mt-1 text-lg font-bold text-ink-950">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/admin/inventory?view=${tab.id}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              view === tab.id
                ? "bg-brand-700 text-white"
                : "border border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <AdminSearch
        placeholder="Search by name, SKU or barcode…"
        filters={[
          {
            name: "category",
            label: "All categories",
            options: categoryList.map((c) => ({ value: c.slug, label: c.nameEn })),
          },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState title="Nothing to show" sub="Try a different filter." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/70 text-xs text-ink-400">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">Product</th>
                  <th className="px-4 py-2.5 text-start font-medium">Category</th>
                  <th className="px-4 py-2.5 text-center font-medium">Stock</th>
                  <th className="px-4 py-2.5 text-center font-medium">Reorder at</th>
                  <th className="px-4 py-2.5 text-end font-medium">Stock value</th>
                  <th className="px-4 py-2.5 text-center font-medium">Quick</th>
                  <th className="px-4 py-2.5 text-end font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-ink-50/50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="line-clamp-1 font-medium text-ink-900 hover:text-brand-700"
                      >
                        {p.nameEn}
                      </Link>
                      <p className="text-[11px] text-ink-400">
                        {p.sku}
                        {p.brand ? ` · ${p.brand}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-ink-500">{p.category}</td>
                    <td className="px-4 py-2.5 text-center">
                      <StockPill stock={p.stock} threshold={p.threshold} />
                    </td>
                    <td className="px-4 py-2.5 text-center text-ink-400">{p.threshold}</td>
                    <td className="px-4 py-2.5 text-end text-ink-600">
                      {formatMoney(Number(p.price) * p.stock)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <QuickStock productId={p.id} />
                    </td>
                    <td className="px-4 py-2.5 text-end">
                      <StockAdjuster productId={p.id} stock={p.stock} name={p.nameEn} />
                    </td>
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
