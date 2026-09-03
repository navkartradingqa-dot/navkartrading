/**
 * Single image upload, used by the drag-and-drop box on the product form.
 * Returns the public URL; the form keeps the list and saves it with the rest
 * of the product, so an upload on its own never changes a product.
 */

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { uploadProductImage } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await requireRole("MANAGER");
  if (!user) {
    return NextResponse.json({ error: "You do not have permission to upload." }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const sku = String(form.get("sku") ?? "new");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file in the upload." }, { status: 400 });
  }

  const outcome = await uploadProductImage(file, sku);
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 400 });
  return NextResponse.json({ url: outcome.url });
}
