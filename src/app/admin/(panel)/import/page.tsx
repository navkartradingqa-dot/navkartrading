import { redirect } from "next/navigation";
import Link from "next/link";
import { Download, FileSpreadsheet, Info } from "lucide-react";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { storageConfigured } from "@/lib/blob";
import { ImportWizard } from "@/components/import-wizard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Import products · Navkar Trading" };

export default async function ImportPage() {
  const user = await requireRole("MANAGER");
  if (!user) redirect("/admin/login");

  const cats = await db
    .select({ nameEn: categories.nameEn })
    .from(categories)
    .orderBy(categories.sortOrder);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-ink-950">Import products</h1>
        <p className="mt-1 text-sm text-ink-500">
          Add or update many products at once from a spreadsheet, and attach their photos.
          Nothing is saved until you have seen exactly what will change.
        </p>
      </header>

      <section className="card flex flex-wrap items-center gap-3 p-4">
        <a href="/navkar-product-template.xlsx" download className="btn-primary">
          <Download size={16} />
          Blank Excel template
        </a>
        <a href="/api/admin/export/products" className="btn-ghost">
          <FileSpreadsheet size={16} />
          Export current products
        </a>
        <p className="w-full text-xs text-ink-500 sm:w-auto sm:flex-1">
          Editing what is already there? Export first, change it in Excel, then import it back —
          the SKUs and category names will already be right.
        </p>
      </section>

      <ImportWizard storageReady={storageConfigured()} />

      <section className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Info size={16} className="text-ink-400" />
          <h2 className="font-bold text-ink-950">How the columns work</h2>
        </div>
        <dl className="space-y-2.5 text-sm">
          <Row term="SKU">
            The only column that must be there. It is how a row finds its product — same SKU means
            update, new SKU means a new product. Also what the barcode scanner at the till reads.
          </Row>
          <Row term="Name (EN), Name (AR)">
            English name is required for a new product. Leave the Arabic blank and the English name
            is used on the Arabic site too.
          </Row>
          <Row term="Category">
            Must match one you already have: {cats.map((c) => c.nameEn).join(", ")}. Add new ones in
            Settings first.
          </Row>
          <Row term="Brand">
            A brand that does not exist yet is created for you — it is listed in the preview before
            anything is saved.
          </Row>
          <Row term="Price and Discount %">
            Put the normal price in Price. Add a Discount % and the website shows the old price
            struck through with the new one beside it. Leave the discount blank for no offer.
          </Row>
          <Row term="Stock">
            Changing stock here is logged as a stock movement, the same as changing it in Inventory,
            so the audit trail stays complete.
          </Row>
          <Row term="Anything else">
            Leave a column out entirely and that field is left alone. A sheet with just SKU and
            Price changes prices and nothing else.
          </Row>
        </dl>
        <p className="mt-4 text-xs text-ink-400">
          Column headings are matched loosely — &ldquo;Selling Price&rdquo;, &ldquo;price&rdquo; and
          &ldquo;Retail Price&rdquo; all mean the same thing. Columns that are not recognised are
          listed in the preview and ignored.
        </p>
      </section>

      <p className="text-xs text-ink-400">
        Looking for one product at a time?{" "}
        <Link href="/admin/products/new" className="font-semibold text-brand-700 hover:underline">
          Add a product
        </Link>
        .
      </p>
    </div>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="font-semibold text-ink-950">{term}</dt>
      <dd className="text-ink-600">{children}</dd>
    </div>
  );
}
