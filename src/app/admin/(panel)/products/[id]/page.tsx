import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { products, stockMovements } from "@/db/schema";
import { getCategories, getBrands } from "@/lib/catalog";
import { ProductForm } from "@/components/product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [[product], categories, brands, movements] = await Promise.all([
    db.select().from(products).where(eq(products.id, id)).limit(1),
    getCategories(),
    getBrands(),
    db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, id))
      .orderBy(desc(stockMovements.createdAt))
      .limit(15),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-5">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-brand-700"
      >
        <ChevronLeft size={16} /> Products
      </Link>
      <div>
        <h1 className="text-xl font-bold text-ink-950">{product.nameEn}</h1>
        <p className="text-sm text-ink-400">{product.sku}</p>
      </div>

      <ProductForm
        product={product}
        categories={categories.map((c) => ({ id: c.id, label: c.nameEn }))}
        brands={brands.map((b) => ({ id: b.id, label: b.name }))}
      />

      <section className="card overflow-hidden">
        <h2 className="border-b border-ink-100 px-5 py-3 font-bold text-ink-950">
          Recent stock movements
        </h2>
        {movements.length === 0 ? (
          <p className="p-5 text-sm text-ink-400">No movements recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50/70 text-xs text-ink-400">
              <tr>
                <th className="px-4 py-2 text-start font-medium">When</th>
                <th className="px-4 py-2 text-start font-medium">Type</th>
                <th className="px-4 py-2 text-end font-medium">Change</th>
                <th className="px-4 py-2 text-end font-medium">Balance</th>
                <th className="px-4 py-2 text-start font-medium">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-ink-500">
                    {new Date(m.createdAt).toLocaleString("en-GB", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-2 text-ink-600">{m.type}</td>
                  <td
                    className={`px-4 py-2 text-end font-semibold ${
                      m.delta >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {m.delta > 0 ? "+" : ""}
                    {m.delta}
                  </td>
                  <td className="px-4 py-2 text-end">{m.balance}</td>
                  <td className="px-4 py-2 text-ink-400">{m.reference ?? m.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
