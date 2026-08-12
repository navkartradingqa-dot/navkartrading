import "server-only";
import { and, asc, desc, eq, gt, gte, ilike, inArray, lte, or, sql, ne } from "drizzle-orm";
import { db } from "@/db";
import { brands, categories, products, type Product } from "@/db/schema";

export type ProductWithMeta = Product & {
  categorySlug: string;
  categoryNameEn: string;
  categoryNameAr: string;
  brandName: string | null;
};

export async function getCategories() {
  return db
    .select()
    .from(categories)
    .where(eq(categories.active, true))
    .orderBy(asc(categories.sortOrder));
}

export async function getCategoryCounts() {
  const rows = await db
    .select({ categoryId: products.categoryId, count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.active, true))
    .groupBy(products.categoryId);
  return new Map(rows.map((r) => [r.categoryId, r.count]));
}

export async function getBrands() {
  return db.select().from(brands).orderBy(asc(brands.name));
}

export async function getCategoryBySlug(slug: string) {
  const [row] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return row ?? null;
}

function baseSelect() {
  return db
    .select({
      id: products.id,
      sku: products.sku,
      barcode: products.barcode,
      slug: products.slug,
      nameEn: products.nameEn,
      nameAr: products.nameAr,
      descEn: products.descEn,
      descAr: products.descAr,
      categoryId: products.categoryId,
      brandId: products.brandId,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      cost: products.cost,
      stock: products.stock,
      lowStockThreshold: products.lowStockThreshold,
      warrantyMonths: products.warrantyMonths,
      images: products.images,
      specs: products.specs,
      active: products.active,
      featured: products.featured,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      categorySlug: categories.slug,
      categoryNameEn: categories.nameEn,
      categoryNameAr: categories.nameAr,
      brandName: brands.name,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id));
}

export type ListParams = {
  q?: string;
  category?: string;
  brand?: string;
  min?: number;
  max?: number;
  inStock?: boolean;
  sort?: "newest" | "priceAsc" | "priceDesc" | "nameAsc" | "relevance";
  page?: number;
  perPage?: number;
  includeInactive?: boolean;
};

export async function listProducts(params: ListParams) {
  const {
    q,
    category,
    brand,
    min,
    max,
    inStock,
    sort = "newest",
    page = 1,
    perPage = 24,
    includeInactive = false,
  } = params;

  const conditions = [];
  if (!includeInactive) conditions.push(eq(products.active, true));
  if (category) conditions.push(eq(categories.slug, category));
  if (brand) conditions.push(eq(brands.slug, brand));
  if (typeof min === "number" && !Number.isNaN(min))
    conditions.push(gte(products.price, String(min)));
  if (typeof max === "number" && !Number.isNaN(max))
    conditions.push(lte(products.price, String(max)));
  if (inStock) conditions.push(gt(products.stock, 0));
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(products.nameEn, term),
        ilike(products.nameAr, term),
        ilike(products.sku, term),
        ilike(products.barcode, term),
        ilike(brands.name, term),
      )!,
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const orderBy = {
    newest: [desc(products.createdAt)],
    priceAsc: [asc(products.price)],
    priceDesc: [desc(products.price)],
    nameAsc: [asc(products.nameEn)],
    relevance: [desc(products.featured), desc(products.stock)],
  }[sort];

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(where);

  const rows = await baseSelect()
    .where(where)
    .orderBy(...orderBy)
    .limit(perPage)
    .offset((page - 1) * perPage);

  return {
    items: rows as ProductWithMeta[],
    total: count,
    page,
    perPage,
    pages: Math.max(1, Math.ceil(count / perPage)),
  };
}

export async function getProductBySlug(slug: string) {
  const rows = await baseSelect().where(eq(products.slug, slug)).limit(1);
  return (rows[0] as ProductWithMeta | undefined) ?? null;
}

export async function getProductById(id: string) {
  const rows = await baseSelect().where(eq(products.id, id)).limit(1);
  return (rows[0] as ProductWithMeta | undefined) ?? null;
}

export async function getFeatured(limit = 8) {
  const rows = await baseSelect()
    .where(and(eq(products.active, true), eq(products.featured, true), gt(products.stock, 0)))
    .orderBy(desc(products.createdAt))
    .limit(limit);
  return rows as ProductWithMeta[];
}

export async function getNewArrivals(limit = 8) {
  const rows = await baseSelect()
    .where(and(eq(products.active, true), gt(products.stock, 0)))
    .orderBy(desc(products.createdAt))
    .limit(limit);
  return rows as ProductWithMeta[];
}

export async function getDeals(limit = 8) {
  const rows = await baseSelect()
    .where(
      and(
        eq(products.active, true),
        gt(products.stock, 0),
        sql`${products.compareAtPrice} is not null and ${products.compareAtPrice} > ${products.price}`,
      ),
    )
    .orderBy(desc(sql`${products.compareAtPrice} - ${products.price}`))
    .limit(limit);
  return rows as ProductWithMeta[];
}

export async function getRelated(product: ProductWithMeta, limit = 6) {
  const rows = await baseSelect()
    .where(
      and(
        eq(products.active, true),
        eq(products.categoryId, product.categoryId),
        ne(products.id, product.id),
      ),
    )
    .orderBy(desc(products.featured), desc(products.stock))
    .limit(limit);
  return rows as ProductWithMeta[];
}

export async function getProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  const rows = await baseSelect().where(inArray(products.id, ids));
  return rows as ProductWithMeta[];
}

/** Barcode or SKU lookup for the POS scanner. */
export async function findByCode(code: string) {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const rows = await baseSelect()
    .where(
      and(
        eq(products.active, true),
        or(eq(products.barcode, trimmed), eq(products.sku, trimmed.toUpperCase()))!,
      ),
    )
    .limit(1);
  return (rows[0] as ProductWithMeta | undefined) ?? null;
}

/** Quick type-ahead used by the POS and the header search. */
export async function quickSearch(q: string, limit = 12) {
  const term = `%${q.trim()}%`;
  if (!q.trim()) return [];
  const rows = await baseSelect()
    .where(
      and(
        eq(products.active, true),
        or(
          ilike(products.nameEn, term),
          ilike(products.nameAr, term),
          ilike(products.sku, term),
          ilike(products.barcode, term),
        )!,
      ),
    )
    .orderBy(desc(products.stock))
    .limit(limit);
  return rows as ProductWithMeta[];
}
