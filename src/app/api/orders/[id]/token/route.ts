import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Used by the test-gateway page to bounce the shopper to their tracking URL. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db
    .select({ token: orders.trackingToken })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ token: row.token });
}
