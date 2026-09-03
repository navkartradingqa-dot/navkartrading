"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Save, Loader2, ExternalLink } from "lucide-react";
import { saveProduct, type ActionState } from "@/app/admin/actions";
import { ImageUploader } from "@/components/image-uploader";
import type { Product } from "@/db/schema";

type Option = { id: string; label: string };

export function ProductForm({
  product,
  categories,
  brands,
  storageReady = false,
}: {
  product?: Product | null;
  categories: Option[];
  brands: Option[];
  storageReady?: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveProduct,
    {},
  );

  const specsText = product?.specs
    ? Object.entries(product.specs)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")
    : "";

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={product?.id ?? ""} />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="mb-4 font-bold text-ink-950">Basics</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name (English) *" className="sm:col-span-2">
                <input
                  name="nameEn"
                  defaultValue={product?.nameEn ?? ""}
                  className="field"
                  required
                />
              </Field>
              <Field label="Name (Arabic)" className="sm:col-span-2">
                <input
                  name="nameAr"
                  defaultValue={product?.nameAr ?? ""}
                  className="field"
                  dir="rtl"
                />
              </Field>
              <Field label="SKU *">
                <input
                  name="sku"
                  defaultValue={product?.sku ?? ""}
                  className="field"
                  required
                />
              </Field>
              <Field label="Barcode (EAN/UPC)">
                <input
                  name="barcode"
                  defaultValue={product?.barcode ?? ""}
                  className="field"
                />
              </Field>
              <Field label="Category *">
                <select
                  name="categoryId"
                  defaultValue={product?.categoryId ?? ""}
                  className="field"
                  required
                >
                  <option value="">Choose…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Brand">
                <select
                  name="brandId"
                  defaultValue={product?.brandId ?? ""}
                  className="field"
                >
                  <option value="">—</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-bold text-ink-950">Description</h2>
            <div className="space-y-3">
              <Field label="English">
                <textarea
                  name="descEn"
                  defaultValue={product?.descEn ?? ""}
                  className="field min-h-32"
                />
              </Field>
              <Field label="Arabic">
                <textarea
                  name="descAr"
                  defaultValue={product?.descAr ?? ""}
                  className="field min-h-24"
                  dir="rtl"
                />
              </Field>
              <Field label="Specifications — one per line, “Key: value”">
                <textarea
                  name="specs"
                  defaultValue={specsText}
                  className="field min-h-32 font-mono text-xs"
                  placeholder={'Display: 6.1" OLED\nStorage: 256GB'}
                />
              </Field>
              {/* <Field label="Image URLs — one per line">
                <textarea
                  name="images"
                  defaultValue={(product?.images ?? []).join("\n")}
                  className="field min-h-20 font-mono text-xs"
                  placeholder="https://…/photo.jpg"
                />
              </Field> */}
              <Field label="Product Images">
                <input
                  name="images"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="field"
                />

                <p className="mt-1 text-xs text-ink-400">
                  Upload JPG, PNG, or WebP images. You can select multiple
                  images.
                </p>
              </Field>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="mb-4 font-bold text-ink-950">Pricing (QAR)</h2>
            <div className="space-y-3">
              <Field label="Selling price *">
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={product?.price ?? ""}
                  className="field"
                  required
                />
              </Field>
              <Field label="Compare-at price (strike-through)">
                <input
                  name="compareAtPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={product?.compareAtPrice ?? ""}
                  className="field"
                />
              </Field>
              <Field label="Cost price (for margin reports)">
                <input
                  name="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={product?.cost ?? "0"}
                  className="field"
                />
              </Field>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-bold text-ink-950">Stock</h2>
            <div className="space-y-3">
              {product ? (
                <div className="rounded-lg bg-ink-50 p-3 text-sm">
                  <p className="text-ink-500">Current stock</p>
                  <p className="text-2xl font-bold text-ink-950">
                    {product.stock}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">
                    Change it from{" "}
                    <Link
                      href="/admin/inventory"
                      className="font-semibold text-brand-700"
                    >
                      Inventory
                    </Link>{" "}
                    so the movement is logged.
                  </p>
                </div>
              ) : (
                <Field label="Opening stock">
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    defaultValue="0"
                    className="field"
                  />
                </Field>
              )}
              <Field label="Reorder level (low-stock alert)">
                <input
                  name="lowStockThreshold"
                  type="number"
                  min="0"
                  defaultValue={product?.lowStockThreshold ?? 5}
                  className="field"
                />
              </Field>
              <Field label="Warranty (months)">
                <input
                  name="warrantyMonths"
                  type="number"
                  min="0"
                  defaultValue={product?.warrantyMonths ?? 12}
                  className="field"
                />
              </Field>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-bold text-ink-950">Visibility</h2>
            <label className="flex items-center gap-2 py-1 text-sm">
              <input
                type="checkbox"
                name="active"
                defaultChecked={product?.active ?? true}
                className="h-4 w-4 accent-brand-700"
              />
              Show on the website
            </label>
            <label className="flex items-center gap-2 py-1 text-sm">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={product?.featured ?? false}
                className="h-4 w-4 accent-brand-700"
              />
              Feature on the home page
            </label>

            {product && (
              <Link
                href={`/product/${product.slug}`}
                target="_blank"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
              >
                View on storefront <ExternalLink size={13} />
              </Link>
            )}
          </section>
        </div>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && state.message && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.message}
        </p>
      )}

      <div className="sticky bottom-0 flex gap-3 border-t border-ink-200 bg-white/90 py-3 backdrop-blur">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary disabled:opacity-60"
        >
          {pending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {product ? "Save changes" : "Create product"}
        </button>
        <Link href="/admin/products" className="btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-ink-500">
        {label}
      </span>
      {children}
    </label>
  );
}
