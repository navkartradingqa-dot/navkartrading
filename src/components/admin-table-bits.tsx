"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export function AdminSearch({
  placeholder = "Search…",
  filters = [],
}: {
  placeholder?: string;
  filters?: { name: string; label: string; options: { value: string; label: string }[] }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        className="relative min-w-56 flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          update({ q: String(data.get("q") ?? "") });
        }}
      >
        <input
          name="q"
          defaultValue={params.get("q") ?? ""}
          placeholder={placeholder}
          className="field ps-9"
        />
        <Search size={15} className="absolute start-3 top-2.5 text-ink-400" />
      </form>

      {filters.map((f) => (
        <select
          key={f.name}
          value={params.get(f.name) ?? ""}
          onChange={(e) => update({ [f.name]: e.target.value })}
          className="field w-auto"
        >
          <option value="">{f.label}</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}

export function AdminPagination({ page, pages }: { page: number; pages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (pages <= 1) return null;

  function go(p: number) {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(p));
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <p className="text-ink-400">
        Page {page} of {pages}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Previous
        </button>
        <button
          onClick={() => go(page + 1)}
          disabled={page >= pages}
          className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
