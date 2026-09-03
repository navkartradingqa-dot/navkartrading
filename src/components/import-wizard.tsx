"use client";

import { useRef, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  Images,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  X,
} from "lucide-react";
import type { ImportPlan, ImportResult } from "@/lib/product-import";
import type { PhotoOutcome } from "@/lib/blob";

type Tab = "data" | "photos";

export function ImportWizard({ storageReady }: { storageReady: boolean }) {
  const [tab, setTab] = useState<Tab>("data");

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-xl bg-ink-100 p-1">
        <TabButton active={tab === "data"} onClick={() => setTab("data")} icon={FileSpreadsheet}>
          Product data
        </TabButton>
        <TabButton active={tab === "photos"} onClick={() => setTab("photos")} icon={Images}>
          Photos
        </TabButton>
      </div>

      {tab === "data" ? <DataImport /> : <PhotoImport storageReady={storageReady} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof FileSpreadsheet;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-white text-ink-950 shadow-sm" : "text-ink-500 hover:text-ink-700"
      }`}
    >
      <Icon size={15} />
      {children}
    </button>
  );
}

/* ------------------------------------------------------------ data tab */

function DataImport() {
  const [file, setFile] = useState<File | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "preview" | "apply">("");

  async function send(mode: "preview" | "apply") {
    if (!file) return;
    setBusy(mode);
    setError("");
    const body = new FormData();
    body.set("file", file);
    body.set("mode", mode);
    try {
      const res = await fetch("/api/admin/import", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong reading the file.");
      } else if (mode === "preview") {
        setPlan(json.plan);
        setResult(null);
      } else {
        setResult(json.result);
        setPlan(null);
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy("");
    }
  }

  function reset() {
    setFile(null);
    setPlan(null);
    setResult(null);
    setError("");
  }

  if (result) {
    return (
      <section className="card space-y-4 p-5">
        <div className="flex items-center gap-2 text-emerald-700">
          <CheckCircle2 size={20} />
          <h2 className="text-lg font-bold">Import finished</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Products added" value={result.created} />
          <Stat label="Products updated" value={result.updated} />
          <Stat label="Left unchanged" value={result.unchanged} />
        </div>
        {result.brandsCreated.length > 0 && (
          <p className="text-sm text-ink-600">
            New brands created: {result.brandsCreated.join(", ")}
          </p>
        )}
        {result.errors.length > 0 && <ErrorList errors={result.errors} />}
        <div className="flex gap-3 pt-1">
          <a href="/admin/products" className="btn-primary">
            See the products
          </a>
          <button type="button" onClick={reset} className="btn-ghost">
            Import another file
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <h2 className="font-bold text-ink-950">1. Choose your spreadsheet</h2>
        <p className="mt-1 text-sm text-ink-500">
          An .xlsx or .csv file. The first row must be the column headings, and there must be a
          SKU column — that is what tells the website which product each row is.
        </p>

        <FilePicker
          accept=".xlsx,.csv,.tsv,.txt"
          label="Choose spreadsheet"
          hint="or drop the file here"
          files={file ? [file] : []}
          onFiles={(list) => {
            setFile(list[0] ?? null);
            setPlan(null);
            setError("");
          }}
        />

        {file && (
          <button
            type="button"
            onClick={() => send("preview")}
            disabled={busy !== ""}
            className="btn-primary mt-4 disabled:opacity-60"
          >
            {busy === "preview" ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            Check the file
          </button>
        )}
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {plan && <PlanReview plan={plan} busy={busy === "apply"} onApply={() => send("apply")} />}
    </div>
  );
}

function PlanReview({
  plan,
  busy,
  onApply,
}: {
  plan: ImportPlan;
  busy: boolean;
  onApply: () => void;
}) {
  const nothingToDo = plan.create.length === 0 && plan.update.length === 0;

  return (
    <section className="card space-y-5 p-5">
      <div>
        <h2 className="font-bold text-ink-950">2. Check what will happen</h2>
        <p className="mt-1 text-sm text-ink-500">
          Nothing has been saved yet. {plan.totalRows} row{plan.totalRows === 1 ? "" : "s"} read
          from {plan.fileName}.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="New products" value={plan.create.length} />
        <Stat label="Products changed" value={plan.update.length} />
        <Stat label="Already correct" value={plan.unchanged} />
        <Stat label="Rows with problems" value={plan.errors.length} tone={plan.errors.length ? "warn" : "plain"} />
      </div>

      <div className="text-xs text-ink-500">
        <p>
          <span className="font-semibold text-ink-700">Columns used:</span>{" "}
          {plan.recognisedColumns.join(", ") || "none"}
        </p>
        {plan.ignoredColumns.length > 0 && (
          <p className="mt-1">
            <span className="font-semibold text-ink-700">Columns ignored:</span>{" "}
            {plan.ignoredColumns.join(", ")}
          </p>
        )}
        {plan.brandsToCreate.length > 0 && (
          <p className="mt-1">
            <span className="font-semibold text-ink-700">New brands to create:</span>{" "}
            {plan.brandsToCreate.join(", ")}
          </p>
        )}
      </div>

      {plan.errors.length > 0 && <ErrorList errors={plan.errors} />}

      {plan.create.length > 0 && (
        <RowTable title={`${plan.create.length} product(s) will be added`} rows={plan.create} />
      )}
      {plan.update.length > 0 && (
        <RowTable title={`${plan.update.length} product(s) will change`} rows={plan.update} />
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-ink-100 pt-4">
        <button
          type="button"
          onClick={onApply}
          disabled={busy || nothingToDo}
          className="btn-primary disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {nothingToDo ? "Nothing to import" : "Apply these changes"}
        </button>
        {plan.errors.length > 0 && !nothingToDo && (
          <span className="text-xs text-ink-500">
            Rows with problems are skipped — everything else still goes in.
          </span>
        )}
      </div>
    </section>
  );
}

function RowTable({
  title,
  rows,
}: {
  title: string;
  rows: ImportPlan["create"];
}) {
  const [open, setOpen] = useState(rows.length <= 15);
  const shown = open ? rows : rows.slice(0, 5);

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-ink-950">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-ink-100">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="bg-ink-50 text-left text-xs text-ink-500">
            <tr>
              <th className="px-3 py-2 font-medium">Row</th>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">What changes</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={`${r.row}-${r.sku}`} className="border-t border-ink-100 align-top">
                <td className="px-3 py-2 text-ink-400">{r.row}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.sku}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">
                  <ul className="space-y-0.5">
                    {r.changes.map((c, i) => (
                      <li key={i} className="text-xs">
                        <span className="text-ink-500">{c.field}:</span>{" "}
                        {r.action === "create" ? (
                          <span className="font-medium text-ink-950">{c.to}</span>
                        ) : (
                          <>
                            <span className="text-ink-400 line-through">{c.from}</span>{" "}
                            <span className="font-medium text-ink-950">{c.to}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 text-xs font-semibold text-brand-700 hover:underline"
        >
          Show all {rows.length}
        </button>
      )}
    </div>
  );
}

function ErrorList({ errors }: { errors: { row: number; sku: string; message: string }[] }) {
  const [open, setOpen] = useState(errors.length <= 8);
  const shown = open ? errors : errors.slice(0, 5);
  return (
    <div className="rounded-lg bg-amber-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800">
        <AlertTriangle size={16} />
        {errors.length} row{errors.length === 1 ? "" : "s"} need attention
      </div>
      <ul className="space-y-1 text-sm text-amber-900">
        {shown.map((e, i) => (
          <li key={i}>
            <span className="font-mono text-xs">
              Row {e.row}
              {e.sku ? ` · ${e.sku}` : ""}
            </span>{" "}
            — {e.message}
          </li>
        ))}
      </ul>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 text-xs font-semibold text-amber-800 hover:underline"
        >
          Show all {errors.length}
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- photos tab */

function PhotoImport({ storageReady }: { storageReady: boolean }) {
  const [files, setFiles] = useState<File[]>([]);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<{
    results: PhotoOutcome[];
    attached: number;
    failed: number;
    products: number;
  } | null>(null);

  async function upload() {
    if (!files.length) return;
    setBusy(true);
    setError("");
    const body = new FormData();
    for (const f of files) body.append("files", f);
    if (replace) body.set("replace", "yes");
    try {
      const res = await fetch("/api/admin/photos", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Upload failed.");
      else {
        setOutcome(json);
        setFiles([]);
      }
    } catch {
      setError("Could not reach the server. Try a smaller batch.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {!storageReady && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Photo storage is not connected yet. In Vercel go to <b>Storage → Create → Blob</b>, connect
          it to this project, then redeploy. Until then photos cannot be uploaded.
        </p>
      )}

      <section className="card p-5">
        <h2 className="font-bold text-ink-950">Upload product photos</h2>
        <p className="mt-1 text-sm text-ink-500">
          Name each file after the product&rsquo;s SKU — <code className="font-mono text-xs">NT-LAP-0012.jpg</code>.
          For a second or third photo of the same product add a number:{" "}
          <code className="font-mono text-xs">NT-LAP-0012-2.jpg</code>. No folders needed; select
          them all at once.
        </p>

        <FilePicker
          accept="image/*"
          multiple
          label="Choose photos"
          hint="or drop them here"
          files={files}
          onFiles={(list) => {
            setFiles(list);
            setOutcome(null);
            setError("");
          }}
        />

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
            className="h-4 w-4 accent-brand-700"
          />
          Replace the product&rsquo;s existing photos instead of adding to them
        </label>

        {files.length > 0 && (
          <button
            type="button"
            onClick={upload}
            disabled={busy || !storageReady}
            className="btn-primary mt-4 disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Upload {files.length} photo{files.length === 1 ? "" : "s"}
          </button>
        )}
      </section>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {outcome && (
        <section className="card space-y-4 p-5">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={20} />
            <h2 className="text-lg font-bold">
              {outcome.attached} photo{outcome.attached === 1 ? "" : "s"} attached to{" "}
              {outcome.products} product{outcome.products === 1 ? "" : "s"}
            </h2>
          </div>
          {outcome.failed > 0 && (
            <div className="rounded-lg bg-amber-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800">
                <AlertTriangle size={16} />
                {outcome.failed} photo{outcome.failed === 1 ? "" : "s"} not used
              </div>
              <ul className="space-y-1 text-sm text-amber-900">
                {outcome.results
                  .filter((r) => r.error)
                  .map((r, i) => (
                    <li key={i}>
                      <span className="font-mono text-xs">{r.file}</span> — {r.error}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- shared */

function FilePicker({
  accept,
  multiple = false,
  label,
  hint,
  files,
  onFiles,
}: {
  accept: string;
  multiple?: boolean;
  label: string;
  hint: string;
  files: File[];
  onFiles: (files: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div className="mt-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const dropped = Array.from(e.dataTransfer.files);
          onFiles(multiple ? dropped : dropped.slice(0, 1));
        }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
          over ? "border-brand-500 bg-brand-50" : "border-ink-200 bg-ink-50"
        }`}
      >
        <Upload size={22} className="mx-auto mb-2 text-ink-400" />
        <button type="button" onClick={() => input.current?.click()} className="btn-ghost">
          {label}
        </button>
        <p className="mt-2 text-xs text-ink-400">{hint}</p>
        <input
          ref={input}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => onFiles(Array.from(e.target.files ?? []))}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {files.slice(0, 8).map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-ink-600">
              <FileSpreadsheet size={13} className="shrink-0 text-ink-400" />
              <span className="truncate">{f.name}</span>
              <span className="ms-auto shrink-0 text-xs text-ink-400">
                {(f.size / 1024).toFixed(0)} KB
              </span>
            </li>
          ))}
          {files.length > 8 && (
            <li className="text-xs text-ink-400">and {files.length - 8} more</li>
          )}
          <li>
            <button
              type="button"
              onClick={() => onFiles([])}
              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-800"
            >
              <X size={12} /> Clear
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: number;
  tone?: "plain" | "warn";
}) {
  return (
    <div className={`rounded-lg p-3 ${tone === "warn" ? "bg-amber-50" : "bg-ink-50"}`}>
      <p className="text-xs text-ink-500">{label}</p>
      <p className={`text-2xl font-bold ${tone === "warn" ? "text-amber-800" : "text-ink-950"}`}>
        {value}
      </p>
    </div>
  );
}
