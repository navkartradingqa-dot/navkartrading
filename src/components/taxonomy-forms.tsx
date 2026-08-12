"use client";

import { useActionState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createCategory, createBrand, type ActionState } from "@/app/admin/actions";

type Option = { id: string; label: string };

export function TaxonomyForms({
  categories,
  brands,
}: {
  categories: Option[];
  brands: Option[];
}) {
  const [catState, catAction, catPending] = useActionState<ActionState, FormData>(
    createCategory,
    {},
  );
  const [brandState, brandAction, brandPending] = useActionState<ActionState, FormData>(
    createBrand,
    {},
  );

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card p-5">
        <h2 className="mb-1 font-bold text-ink-950">Categories</h2>
        <p className="mb-4 text-xs text-ink-400">{categories.length} categories</p>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <span
              key={c.id}
              className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600"
            >
              {c.label}
            </span>
          ))}
        </div>

        <form action={catAction} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input name="nameEn" placeholder="Name (English)" className="field" required />
          <input name="nameAr" placeholder="الاسم (عربي)" className="field" dir="rtl" />
          <button disabled={catPending} className="btn-primary text-sm disabled:opacity-60">
            {catPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Add
          </button>
        </form>
        {catState.error && <p className="mt-2 text-xs text-red-600">{catState.error}</p>}
        {catState.ok && <p className="mt-2 text-xs text-emerald-600">{catState.message}</p>}
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-bold text-ink-950">Brands</h2>
        <p className="mb-4 text-xs text-ink-400">{brands.length} brands</p>

        <div className="mb-4 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
          {brands.map((b) => (
            <span
              key={b.id}
              className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600"
            >
              {b.label}
            </span>
          ))}
        </div>

        <form action={brandAction} className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input name="name" placeholder="Brand name" className="field" required />
          <button disabled={brandPending} className="btn-primary text-sm disabled:opacity-60">
            {brandPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Add
          </button>
        </form>
        {brandState.error && <p className="mt-2 text-xs text-red-600">{brandState.error}</p>}
        {brandState.ok && <p className="mt-2 text-xs text-emerald-600">{brandState.message}</p>}
      </section>
    </div>
  );
}
