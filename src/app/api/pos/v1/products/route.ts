import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { listProducts, findByCode } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/pos/v1/products
 *
 * Catalogue feed for an external POS terminal.
 *
 *   ?code=6280010001234   look up one item by barcode or SKU
 *   ?q=iphone             search
 *   ?category=laptops     filter
 *   ?page=1&perPage=200   page through everything
 *
 * Auth: Authorization: Bearer <key issued in Admin → Settings>
 */
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (code) {
    const product = await findByCode(code);
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ product: shape(product) });
  }

  const result = await listProducts({
    q: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    page: Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1),
    perPage: Math.min(500, Number(url.searchParams.get("perPage") ?? 200) || 200),
    sort: "nameAsc",
  });

  return NextResponse.json({
    products: result.items.map(shape),
    page: result.page,
    pages: result.pages,
    total: result.total,
  });
}

function shape(p: {
  id: string;
  sku: string;
  barcode: string | null;
  nameEn: string;
  nameAr: string;
  price: string;
  stock: number;
  categorySlug: string;
  brandName: string | null;
}) {
  return {
    id: p.id,
    sku: p.sku,
    barcode: p.barcode,
    name: p.nameEn,
    nameAr: p.nameAr,
    price: p.price,
    currency: "QAR",
    stock: p.stock,
    category: p.categorySlug,
    brand: p.brandName,
  };
}
