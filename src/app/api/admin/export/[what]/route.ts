import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, categories, brands, orders } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csv(rows: (string | number | null | undefined)[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell === null || cell === undefined ? "" : String(cell);
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(","),
    )
    .join("\n");
}

export async function GET(_req: Request, { params }: { params: Promise<{ what: string }> }) {
  const user = await requireRole("MANAGER");
  if (!user) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  const { what } = await params;
  const stamp = new Date().toISOString().slice(0, 10);

  if (what === "products") {
    const rows = await db
      .select({
        sku: products.sku,
        barcode: products.barcode,
        nameEn: products.nameEn,
        nameAr: products.nameAr,
        category: categories.nameEn,
        brand: brands.name,
        cost: products.cost,
        price: products.price,
        compareAt: products.compareAtPrice,
        stock: products.stock,
        reorderAt: products.lowStockThreshold,
        warranty: products.warrantyMonths,
        active: products.active,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .orderBy(products.sku);

    const body = csv([
      [
        "SKU",
        "Barcode",
        "Name (EN)",
        "Name (AR)",
        "Category",
        "Brand",
        "Cost",
        "Price",
        "Compare at",
        "Stock",
        "Reorder at",
        "Warranty (months)",
        "Active",
      ],
      ...rows.map((r) => [
        r.sku,
        r.barcode,
        r.nameEn,
        r.nameAr,
        r.category,
        r.brand,
        r.cost,
        r.price,
        r.compareAt,
        r.stock,
        r.reorderAt,
        r.warranty,
        r.active ? "yes" : "no",
      ]),
    ]);

    return new NextResponse("﻿" + body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="navkar-products-${stamp}.csv"`,
      },
    });
  }

  if (what === "orders") {
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5000);

    const body = csv([
      [
        "Order number",
        "Date",
        "Channel",
        "Status",
        "Payment method",
        "Payment status",
        "Customer",
        "Phone",
        "Zone",
        "Street",
        "Building",
        "Subtotal",
        "Delivery",
        "Discount",
        "Total",
        "Tracking code",
      ],
      ...rows.map((o) => [
        o.orderNumber,
        new Date(o.createdAt).toISOString(),
        o.channel,
        o.status,
        o.paymentMethod,
        o.paymentStatus,
        o.customerName,
        o.customerPhone,
        o.zone,
        o.streetNumber,
        o.buildingNumber,
        o.subtotal,
        o.deliveryFee,
        o.discount,
        o.total,
        o.trackingToken,
      ]),
    ]);

    return new NextResponse("﻿" + body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="navkar-orders-${stamp}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Unknown export" }, { status: 404 });
}
