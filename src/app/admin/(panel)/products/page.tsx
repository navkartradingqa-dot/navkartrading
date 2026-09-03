import Link from "next/link";
import { Plus, Download, Upload } from "lucide-react";
import { listProducts, getCategories } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { StockPill, EmptyState } from "@/components/admin-bits";
import { AdminSearch, AdminPagination } from "@/components/admin-table-bits";
import { toggleProductActive } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminProductsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(one(sp.page) ?? 1) || 1);

  const [result, categories] = await Promise.all([
    listProducts({
      q: one(sp.q),
      category: one(sp.category),
      page,
      perPage: 30,
      sort: "nameAsc",
      includeInactive: true,
    }),
    getCategories(),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-950">Products</h1>
          <p className="text-sm text-ink-500">{result.total} items in the catalogue</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/admin/export/products" className="btn-ghost text-sm">
            <Download size={16} />
            Export CSV
          </a>
          <Link href="/admin/import" className="btn-ghost text-sm">
            <Upload size={16} />
            Import
          </Link>
          <Link href="/admin/products/new" className="btn-primary text-sm">
            <Plus size={16} />
            New product
          </Link>
        </div>
      </div>

      <AdminSearch
        placeholder="Search by name, SKU or barcode…"
        filters={[
          {
            name: "category",
            label: "All categories",
            options: categories.map((c) => ({ value: c.slug, label: c.nameEn })),
          },
        ]}
      />

      {result.items.length === 0 ? (
        <EmptyState title="No products matched" sub="Try a different search term." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/70 text-xs text-ink-400">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">Product</th>
                  <th className="px-4 py-2.5 text-start font-medium">Category</th>
                  <th className="px-4 py-2.5 text-end font-medium">Cost</th>
                  <th className="px-4 py-2.5 text-end font-medium">Price</th>
                  <th className="px-4 py-2.5 text-center font-medium">Stock</th>
                  <th className="px-4 py-2.5 text-center font-medium">Live</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {result.items.map((p) => (
                  <tr key={p.id} className="hover:bg-ink-50/50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="font-medium text-ink-900 hover:text-brand-700"
                      >
                        {p.nameEn}
                      </Link>
                      <p className="text-[11px] text-ink-400">
                        {p.sku}
                        {p.barcode ? ` · ${p.barcode}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-ink-500">{p.categoryNameEn}</td>
                    <td className="px-4 py-2.5 text-end text-ink-500">{formatMoney(p.cost)}</td>
                    <td className="px-4 py-2.5 text-end font-semibold">{formatMoney(p.price)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <StockPill stock={p.stock} threshold={p.lowStockThreshold} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <form action={toggleProductActive}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            p.active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-ink-100 text-ink-500"
                          }`}
                        >
                          {p.active ? "Live" : "Hidden"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AdminPagination page={result.page} pages={result.pages} />
    </div>
  );
}
