/**
 * Product spreadsheet import.
 *
 * POST with mode=preview to get a plan back and change nothing.
 * POST with mode=apply to run the same parse and commit it.
 *
 * The file is sent twice on purpose — the browser keeps the same File object
 * between the two calls, so what gets applied is exactly what was previewed,
 * and the server never trusts a client-supplied plan.
 */

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { planImport, applyImport } from "@/lib/product-import";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await requireRole("MANAGER");
  if (!user) {
    return NextResponse.json({ error: "You do not have permission to import products." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  const file = form.get("file");
  const mode = String(form.get("mode") ?? "preview");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a spreadsheet to upload." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That file is over 5 MB. Split it into a few smaller sheets." },
      { status: 400 },
    );
  }
  if (!/\.(xlsx|csv|txt|tsv)$/i.test(file.name)) {
    return NextResponse.json(
      { error: "Upload an .xlsx or .csv file. Old .xls files must be saved as .xlsx first." },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    if (mode === "apply") {
      const result = await applyImport(bytes, file.name, user.id);
      revalidatePath("/admin/products");
      revalidatePath("/admin/inventory");
      revalidatePath("/shop");
      revalidatePath("/");
      return NextResponse.json({ result });
    }
    const plan = await planImport(bytes, file.name);
    return NextResponse.json({ plan });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
