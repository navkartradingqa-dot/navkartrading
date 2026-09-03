import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCategories, getBrands } from "@/lib/catalog";
import { ProductForm } from "@/components/product-form";
import { storageConfigured } from "@/lib/blob";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [categories, brands] = await Promise.all([getCategories(), getBrands()]);

  return (
    <div className="space-y-5">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-brand-700"
      >
        <ChevronLeft size={16} /> Products
      </Link>
      <h1 className="text-xl font-bold text-ink-950">New product</h1>

      <ProductForm
        categories={categories.map((c) => ({ id: c.id, label: c.nameEn }))}
        brands={brands.map((b) => ({ id: b.id, label: b.name }))}
        storageReady={storageConfigured()}
      />
    </div>
  );
}
