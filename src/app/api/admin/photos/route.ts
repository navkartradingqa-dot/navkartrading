/**
 * Bulk product photos.
 *
 * Send a batch of image files named after their SKU. Each one is matched to a
 * product, uploaded to Blob storage and appended to that product's images.
 * Files that match nothing come back in the response so the person uploading
 * can see exactly which photos were ignored and why.
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import {
  uploadProductImage,
  skuCandidates,
  storageConfigured,
  type PhotoOutcome,
} from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await requireRole("MANAGER");
  if (!user) {
    return NextResponse.json({ error: "You do not have permission to add photos." }, { status: 403 });
  }
  if (!storageConfigured()) {
    return NextResponse.json(
      {
        error:
          "Photo storage is not set up yet. In Vercel → Storage, create a Blob store and connect it to this project, then redeploy.",
      },
      { status: 400 },
    );
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const replace = String(form.get("replace") ?? "") === "yes";

  if (!files.length) {
    return NextResponse.json({ error: "No photos in the upload." }, { status: 400 });
  }

  const rows = await db.select({ id: products.id, sku: products.sku, images: products.images }).from(products);
  const bySku = new Map(rows.map((r) => [r.sku.toUpperCase(), r]));

  // Group by product first so several photos of one product are written once,
  // in the order the files were chosen.
  const matched = new Map<string, { productId: string; files: File[] }>();
  const results: PhotoOutcome[] = [];

  for (const file of files) {
    const hit = skuCandidates(file.name).find((c) => bySku.has(c));
    if (!hit) {
      results.push({
        file: file.name,
        error: "No product with a matching SKU. Name the file after the SKU, e.g. NT-LAP-0012.jpg",
      });
      continue;
    }
    const product = bySku.get(hit)!;
    const bucket = matched.get(hit) ?? { productId: product.id, files: [] as File[] };
    bucket.files.push(file);
    matched.set(hit, bucket);
  }

  for (const [sku, { productId, files: batch }] of matched) {
    const existing = bySku.get(sku)?.images ?? [];
    const urls: string[] = [];

    for (const file of batch.sort((a, b) => a.name.localeCompare(b.name))) {
      const outcome = await uploadProductImage(file, sku);
      if (outcome.ok) {
        urls.push(outcome.url);
        results.push({ file: file.name, sku, url: outcome.url });
      } else {
        results.push({ file: file.name, sku, error: outcome.error });
      }
    }

    if (!urls.length) continue;
    const images = replace ? urls : [...existing, ...urls];
    await db
      .update(products)
      .set({ images, updatedAt: new Date() })
      .where(eq(products.id, productId));
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");

  return NextResponse.json({
    results,
    attached: results.filter((r) => r.url).length,
    failed: results.filter((r) => r.error).length,
    products: matched.size,
  });
}
