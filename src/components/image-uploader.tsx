"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X, GripVertical } from "lucide-react";

/**
 * Product photos on the edit form.
 *
 * Uploads happen straight away so you can see the picture, but the list is
 * only written to the product when the form is saved — the hidden input keeps
 * the URLs, one per line, exactly as the server action already expects.
 */
export function ImageUploader({
  name,
  sku,
  initial,
  storageReady,
}: {
  name: string;
  sku: string;
  initial: string[];
  storageReady: boolean;
}) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function add(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    setError("");
    const added: string[] = [];
    for (const file of files) {
      const body = new FormData();
      body.set("file", file);
      body.set("sku", sku || "new");
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) setError(json.error ?? "Upload failed.");
        else added.push(json.url);
      } catch {
        setError("Could not reach the server.");
      }
    }
    if (added.length) setUrls((prev) => [...prev, ...added]);
    setBusy(false);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= urls.length) return;
    const next = [...urls];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setUrls(next);
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-ink-500">
        Photos — the first one is used on the shop grid
      </span>

      <input type="hidden" name={name} value={urls.join("\n")} />

      {urls.length > 0 && (
        <ul className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {urls.map((url, i) => (
            <li key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-ink-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-contain" />
              {i === 0 && (
                <span className="absolute start-1 top-1 rounded bg-ink-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Main
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink-950/70 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  title="Move earlier"
                  className="px-1.5 py-1 text-white disabled:opacity-30"
                >
                  <GripVertical size={12} className="rotate-90" />
                </button>
                <button
                  type="button"
                  onClick={() => setUrls(urls.filter((_, j) => j !== i))}
                  title="Remove"
                  className="px-1.5 py-1 text-white"
                >
                  <X size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void add(Array.from(e.dataTransfer.files));
        }}
        className="rounded-lg border-2 border-dashed border-ink-200 bg-ink-50 p-4 text-center"
      >
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy || !storageReady}
          className="btn-ghost disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
          Add photos
        </button>
        <p className="mt-1.5 text-xs text-ink-400">
          {storageReady ? "or drop them here — JPG, PNG or WebP, up to 8 MB each" : "Photo storage is not connected yet"}
        </p>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void add(Array.from(e.target.files ?? []))}
        />
      </div>

      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
