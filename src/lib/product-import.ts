/**
 * Spreadsheet → product catalogue.
 *
 * Two passes, deliberately. `planImport` reads the sheet and works out what
 * *would* happen without touching anything; `applyImport` runs the same parse
 * again and commits it. Nothing is written until someone has seen the plan and
 * pressed the button.
 *
 * Only columns actually present in the sheet are considered, so a sheet with
 * just SKU and Price changes prices and leaves everything else alone.
 */

import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products, categories, brands, stockMovements } from "@/db/schema";
import { createId } from "@/lib/id";
import {
  pickSheet,
  parseRows,
  resolveRow,
  normaliseKey,
  slugify,
  describe,
  LABELS,
  type Change,
  type ImportPlan,
  type ImportResult,
  type Lookup,
  type Resolved,
} from "@/lib/product-import-parse";

export type {
  Change,
  ImportPlan,
  ImportResult,
  PlannedRow,
  RowError,
} from "@/lib/product-import-parse";

async function loadLookups(): Promise<Lookup> {
  const [cats, brs] = await Promise.all([
    db
      .select({ id: categories.id, nameEn: categories.nameEn, slug: categories.slug })
      .from(categories),
    db.select({ id: brands.id, name: brands.name }).from(brands),
  ]);

  const categoryByKey = new Map<string, { id: string; nameEn: string }>();
  const nameById = new Map<string, string>();
  for (const c of cats) {
    categoryByKey.set(normaliseKey(c.nameEn), { id: c.id, nameEn: c.nameEn });
    categoryByKey.set(normaliseKey(c.slug), { id: c.id, nameEn: c.nameEn });
    nameById.set(c.id, c.nameEn);
  }

  const brandByName = new Map<string, { id: string; name: string }>();
  for (const b of brs) {
    brandByName.set(normaliseKey(b.name), b);
    nameById.set(b.id, b.name);
  }

  return { categoryByKey, brandByName, nameById, categoryNames: cats.map((c) => c.nameEn) };
}

/* ----------------------------------------------------------------- plan */

export async function planImport(bytes: Buffer, fileName: string): Promise<ImportPlan> {
  const { parsed, recognised, ignored, errors } = parseRows(pickSheet(bytes, fileName));
  const lookup = await loadLookups();
  const newBrands = new Map<string, string>();

  const plan: ImportPlan = {
    fileName,
    totalRows: parsed.length,
    recognisedColumns: recognised,
    ignoredColumns: ignored,
    create: [],
    update: [],
    unchanged: 0,
    errors,
    brandsToCreate: [],
    categoryNames: lookup.categoryNames,
  };
  if (!parsed.length) return plan;

  const existing = await db.select().from(products);
  const bySku = new Map(existing.map((p) => [p.sku.toUpperCase(), p]));

  for (const p of parsed) {
    const resolved = resolveRow(p, lookup, newBrands, plan.errors);
    if (!resolved) continue;

    const current = bySku.get(p.sku);
    const name = resolved.values.nameEn ?? current?.nameEn ?? "(no name given)";

    if (!current) {
      const missing: string[] = [];
      if (!resolved.values.nameEn) missing.push("a name");
      if (!resolved.values.categoryId) missing.push("a category");
      if (resolved.values.price === undefined) missing.push("a price");
      if (missing.length) {
        plan.errors.push({
          row: p.row,
          sku: p.sku,
          message: `New product needs ${missing.join(", ")}.`,
        });
        continue;
      }
      plan.create.push({
        row: p.row,
        sku: p.sku,
        name,
        action: "create",
        changes: [
          { field: "Price", from: "—", to: resolved.values.price! },
          { field: "Stock", from: "—", to: String(resolved.stock ?? 0) },
        ],
      });
      continue;
    }

    const changes: Change[] = [];
    for (const [key, next] of Object.entries(resolved.values)) {
      if (key === "sku") continue;
      const before = (current as unknown as Record<string, unknown>)[key];
      if (JSON.stringify(before ?? null) === JSON.stringify(next ?? null)) continue;

      if (key === "categoryId" || key === "brandId") {
        changes.push({
          field: LABELS[key],
          from: typeof before === "string" ? lookup.nameById.get(before) ?? "—" : "—",
          to: typeof next === "string" ? lookup.nameById.get(next) ?? "—" : "—",
        });
        continue;
      }
      changes.push({ field: LABELS[key] ?? key, from: describe(before), to: describe(next) });
    }

    if (resolved.newBrandName) {
      const from = current.brandId ? lookup.nameById.get(current.brandId) ?? "—" : "—";
      if (from !== resolved.newBrandName) {
        changes.push({ field: "Brand", from, to: `${resolved.newBrandName} (new)` });
      }
    }

    if (resolved.stock !== null && resolved.stock !== current.stock) {
      changes.push({ field: "Stock", from: String(current.stock), to: String(resolved.stock) });
    }

    if (!changes.length) plan.unchanged++;
    else plan.update.push({ row: p.row, sku: p.sku, name, action: "update", changes });
  }

  plan.brandsToCreate = [...newBrands.values()].sort();
  return plan;
}

/* ---------------------------------------------------------------- apply */

export async function applyImport(
  bytes: Buffer,
  fileName: string,
  userId: string,
): Promise<ImportResult> {
  const { parsed, errors } = parseRows(pickSheet(bytes, fileName));
  const lookup = await loadLookups();
  const newBrands = new Map<string, string>();

  const result: ImportResult = {
    created: 0,
    updated: 0,
    unchanged: 0,
    brandsCreated: [],
    errors,
  };
  if (!parsed.length) return result;

  const rows: Resolved[] = [];
  for (const p of parsed) {
    const resolved = resolveRow(p, lookup, newBrands, result.errors);
    if (resolved) rows.push(resolved);
  }

  // Create brands the sheet mentioned for the first time, then point the rows
  // that wanted them at the new ids.
  const createdBrandIds = new Map<string, string>();
  for (const [key, name] of newBrands) {
    const id = createId();
    await db.insert(brands).values({ id, slug: slugify(name), name });
    createdBrandIds.set(key, id);
    result.brandsCreated.push(name);
  }
  for (const r of rows) {
    if (r.newBrandName) {
      const id = createdBrandIds.get(normaliseKey(r.newBrandName));
      if (id) r.values.brandId = id;
    }
  }

  const existing = await db.select().from(products);
  const bySku = new Map(existing.map((p) => [p.sku.toUpperCase(), p]));

  for (const r of rows) {
    const current = bySku.get(r.sku);

    if (!current) {
      if (!r.values.nameEn || !r.values.categoryId || r.values.price === undefined) {
        result.errors.push({
          row: r.row,
          sku: r.sku,
          message: "New product needs a name, a category and a price.",
        });
        continue;
      }
      const id = createId();
      const stock = r.stock ?? 0;
      try {
        await db.insert(products).values({
          id,
          sku: r.sku,
          slug: `${slugify(r.values.nameEn)}-${r.sku.toLowerCase()}`,
          nameEn: r.values.nameEn,
          nameAr: r.values.nameAr || r.values.nameEn,
          descEn: r.values.descEn ?? "",
          descAr: r.values.descAr ?? "",
          categoryId: r.values.categoryId,
          brandId: r.values.brandId ?? null,
          barcode: r.values.barcode ?? null,
          price: r.values.price,
          compareAtPrice: r.values.compareAtPrice ?? null,
          cost: r.values.cost ?? "0",
          stock,
          lowStockThreshold: r.values.lowStockThreshold ?? 5,
          warrantyMonths: r.values.warrantyMonths ?? 12,
          images: r.values.images ?? [],
          specs: r.values.specs ?? {},
          active: r.values.active ?? true,
          featured: r.values.featured ?? false,
        });
        if (stock > 0) {
          await db.insert(stockMovements).values({
            id: createId(),
            productId: id,
            delta: stock,
            balance: stock,
            type: "INITIAL",
            reference: "IMPORT",
            userId,
          });
        }
        result.created++;
      } catch (err) {
        result.errors.push({
          row: r.row,
          sku: r.sku,
          message: (err as Error).message.includes("duplicate key")
            ? "SKU or barcode already used by another product."
            : "Could not save this row.",
        });
      }
      continue;
    }

    const patch: Record<string, unknown> = {};
    for (const [key, next] of Object.entries(r.values)) {
      if (key === "sku") continue;
      const before = (current as unknown as Record<string, unknown>)[key];
      if (JSON.stringify(before ?? null) !== JSON.stringify(next ?? null)) patch[key] = next;
    }

    const fieldsChanged = Object.keys(patch).length > 0;
    const stockChanged = r.stock !== null && r.stock !== current.stock;
    if (!fieldsChanged && !stockChanged) {
      result.unchanged++;
      continue;
    }
    patch.updatedAt = new Date();

    try {
      await db.transaction(async (tx) => {
        if (fieldsChanged) {
          await tx.update(products).set(patch).where(eq(products.id, current.id));
        }
        if (stockChanged) {
          const balance = r.stock!;
          await tx
            .update(products)
            .set({ stock: balance, updatedAt: new Date() })
            .where(eq(products.id, current.id));
          await tx.insert(stockMovements).values({
            id: createId(),
            productId: current.id,
            delta: balance - current.stock,
            balance,
            type: "ADJUSTMENT",
            reference: "IMPORT",
            note: `Set from spreadsheet row ${r.row}`,
            userId,
          });
        }
      });
      result.updated++;
    } catch (err) {
      result.errors.push({
        row: r.row,
        sku: r.sku,
        message: (err as Error).message.includes("duplicate key")
          ? "Barcode already used by another product."
          : "Could not save this row.",
      });
    }
  }

  return result;
}
