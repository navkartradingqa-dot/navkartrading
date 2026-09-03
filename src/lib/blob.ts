/**
 * Product photo storage — Vercel Blob.
 *
 * The store is created in the Vercel dashboard (Storage → Blob) and connected
 * to this project, which sets BLOB_READ_WRITE_TOKEN automatically. Without it
 * uploads fail with a message that says exactly that, rather than a stack
 * trace about a missing token.
 */

import "server-only";
import { put } from "@vercel/blob";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB — a generous phone photo

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

export function storageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function extensionFor(type: string, fallbackName: string): string {
  const fromName = /\.([a-z0-9]+)$/i.exec(fallbackName)?.[1]?.toLowerCase();
  if (fromName) return fromName;
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/avif") return "avif";
  if (type === "image/gif") return "gif";
  return "jpg";
}

export type UploadOutcome = { ok: true; url: string } | { ok: false; error: string };

/** One line of the bulk-photo report shown after an upload. */
export type PhotoOutcome = {
  file: string;
  sku?: string;
  url?: string;
  error?: string;
};

/** Uploads one image and returns its public URL. */
export async function uploadProductImage(file: File, sku: string): Promise<UploadOutcome> {
  if (!storageConfigured()) {
    return {
      ok: false,
      error:
        "Photo storage is not set up yet. In Vercel → Storage, create a Blob store and connect it to this project.",
    };
  }
  if (!ALLOWED.has(file.type)) {
    return { ok: false, error: `${file.name} is not a JPG, PNG, WebP, AVIF or GIF.` };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 8 MB.`,
    };
  }

  const safeSku = sku.toLowerCase().replace(/[^a-z0-9-]/g, "") || "misc";
  const pathname = `products/${safeSku}/${Date.now()}.${extensionFor(file.type, file.name)}`;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });
    return { ok: true, url: blob.url };
  } catch (err) {
    return { ok: false, error: `Upload failed for ${file.name}: ${(err as Error).message}` };
  }
}

/**
 * Candidate SKUs for a photo file name, best guess first.
 *
 * "NT-LAP-0012.jpg" is the product's first photo; "NT-LAP-0012-2.jpg",
 * "NT-LAP-0012_2.jpg" and "NT-LAP-0012 (2).jpg" are later photos of the same
 * product. The whole name is tried before any suffix is stripped, so a SKU
 * that genuinely ends in a small number is never mangled.
 */
export function skuCandidates(fileName: string): string[] {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "").trim();
  const out = [base];
  const withoutParen = base.replace(/[\s_-]*\(\d{1,2}\)$/, "").trim();
  if (withoutParen && withoutParen !== base) out.push(withoutParen);
  const withoutSuffix = base.replace(/[\s_-]\d{1,2}$/, "").trim();
  if (withoutSuffix && !out.includes(withoutSuffix)) out.push(withoutSuffix);
  return out.map((s) => s.toUpperCase());
}
