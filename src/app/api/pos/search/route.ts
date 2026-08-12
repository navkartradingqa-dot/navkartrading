import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { quickSearch, findByCode, listProducts } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Type-ahead and barcode lookup for the browser POS. Session-authenticated. */
export async function GET(req: Request) {
  const user = await requireRole("CASHIER");
  if (!user) return NextResponse.json({ error: "Not authorised" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const code = url.searchParams.get("code");
  const category = url.searchParams.get("category") ?? undefined;

  if (code) {
    const product = await findByCode(code);
    return NextResponse.json({ product: product ?? null });
  }

  if (!q.trim() && category) {
    const result = await listProducts({
      category,
      inStock: false,
      perPage: 40,
      sort: "nameAsc",
    });
    return NextResponse.json({ products: result.items });
  }

  const products = await quickSearch(q, 30);
  return NextResponse.json({ products });
}
