/**
 * Reading a product spreadsheet — the part with no database in it.
 *
 * Everything here is a pure function over strings, so it can be reasoned
 * about (and tested) on its own. `product-import.ts` supplies the categories
 * and brands and does the writing.
 */

import { readSheets } from "@/lib/sheet";

/* ------------------------------------------------------------- columns */

export const FIELDS = [
  "sku",
  "barcode",
  "nameEn",
  "nameAr",
  "category",
  "brand",
  "descEn",
  "descAr",
  "specs",
  "cost",
  "price",
  "discountPercent",
  "salePrice",
  "stock",
  "lowStockThreshold",
  "warrantyMonths",
  "active",
  "featured",
  "images",
] as const;

export type Field = (typeof FIELDS)[number];

/**
 * Heading text → field, compared after stripping everything but a-z0-9, so
 * "Selling Price", "selling price" and "SELLING_PRICE" all land in the same
 * place. Shop staff should not have to match a spec exactly.
 */
const ALIASES: Record<string, Field> = {
  sku: "sku",
  skucode: "sku",
  itemcode: "sku",
  productcode: "sku",
  serialno: "sku",
  serialnumber: "sku",
  barcode: "barcode",
  ean: "barcode",
  upc: "barcode",
  name: "nameEn",
  nameen: "nameEn",
  nameenglish: "nameEn",
  englishname: "nameEn",
  productname: "nameEn",
  namear: "nameAr",
  namearabic: "nameAr",
  arabicname: "nameAr",
  category: "category",
  categoryen: "category",
  type: "category",
  itemtype: "category",
  producttype: "category",
  brand: "brand",
  make: "brand",
  manufacturer: "brand",
  description: "descEn",
  descriptionen: "descEn",
  descen: "descEn",
  descriptionenglish: "descEn",
  details: "descEn",
  descriptionar: "descAr",
  descar: "descAr",
  descriptionarabic: "descAr",
  specs: "specs",
  spec: "specs",
  specifications: "specs",
  cost: "cost",
  costprice: "cost",
  purchaseprice: "cost",
  buyingprice: "cost",
  price: "price",
  sellingprice: "price",
  sellprice: "price",
  retailprice: "price",
  discount: "discountPercent",
  discountpercent: "discountPercent",
  discountpercentage: "discountPercent",
  discounttoapply: "discountPercent",
  saleprice: "salePrice",
  offerprice: "salePrice",
  discountedprice: "salePrice",
  stock: "stock",
  qty: "stock",
  quantity: "stock",
  openingstock: "stock",
  stockquantity: "stock",
  reorderat: "lowStockThreshold",
  reorderlevel: "lowStockThreshold",
  lowstock: "lowStockThreshold",
  lowstockthreshold: "lowStockThreshold",
  minimumstock: "lowStockThreshold",
  warranty: "warrantyMonths",
  warrantymonths: "warrantyMonths",
  active: "active",
  published: "active",
  visible: "active",
  showonwebsite: "active",
  featured: "featured",
  featureonhomepage: "featured",
  homepage: "featured",
  images: "images",
  imageurls: "images",
  imageurl: "images",
  photos: "images",
};

export function normaliseKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function slugify(v: string): string {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180);
}

/* --------------------------------------------------------------- values */

/**
 * "1,299.00", "QAR 1299", "1299 " → 1299. Empty → null (the cell was left
 * blank). Anything else → NaN, which the caller turns into a visible error —
 * a mistyped price must never be silently read as "no price given".
 */
function toNumber(raw: string): number | null {
  if (!raw.trim()) return null;
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  if (!cleaned) return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

const TRUTHY = new Set(["yes", "y", "true", "1", "on", "active", "show", "✓"]);
const FALSEY = new Set(["no", "n", "false", "0", "off", "hidden", "inactive"]);

function toBoolean(raw: string): boolean | null {
  const v = raw.toLowerCase().trim();
  if (!v) return null;
  if (TRUTHY.has(v)) return true;
  if (FALSEY.has(v)) return false;
  return null;
}

/** "Storage: 512GB" per line, or separated by "|". */
function toSpecs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/[\n|]/)) {
    const at = line.indexOf(":");
    if (at < 1) continue;
    const key = line.slice(0, at).trim();
    const value = line.slice(at + 1).trim();
    if (key && value) out[key] = value;
  }
  return out;
}

/** Only real URLs — photo files are handled by the Photos tab, not here. */
function toImages(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

function money(n: number): string {
  return n.toFixed(2);
}

/* ---------------------------------------------------------------- types */

export type RowError = { row: number; sku: string; message: string };
export type Change = { field: string; from: string; to: string };

export type PlannedRow = {
  row: number;
  sku: string;
  name: string;
  action: "create" | "update";
  changes: Change[];
};

export type ImportPlan = {
  fileName: string;
  totalRows: number;
  recognisedColumns: string[];
  ignoredColumns: string[];
  create: PlannedRow[];
  update: PlannedRow[];
  unchanged: number;
  errors: RowError[];
  brandsToCreate: string[];
  categoryNames: string[];
};

export type ImportResult = {
  created: number;
  updated: number;
  unchanged: number;
  brandsCreated: string[];
  errors: RowError[];
};

export type Parsed = {
  row: number;
  sku: string;
  present: Set<Field>;
  raw: Partial<Record<Field, string>>;
};

/** The product columns a row wants to set. Absent key = leave alone. */
export type Values = {
  sku: string;
  barcode?: string | null;
  nameEn?: string;
  nameAr?: string;
  descEn?: string;
  descAr?: string;
  categoryId?: string;
  brandId?: string | null;
  price?: string;
  compareAtPrice?: string | null;
  cost?: string;
  lowStockThreshold?: number;
  warrantyMonths?: number;
  images?: string[];
  specs?: Record<string, string>;
  active?: boolean;
  featured?: boolean;
};

export type Resolved = {
  row: number;
  sku: string;
  values: Values;
  stock: number | null;
  newBrandName: string | null;
};

/** Categories and brands, keyed the same loose way as headings. */
export type Lookup = {
  categoryByKey: Map<string, { id: string; nameEn: string }>;
  brandByName: Map<string, { id: string; name: string }>;
  nameById: Map<string, string>;
  categoryNames: string[];
};

/* -------------------------------------------------------------- reading */

/** How many distinct known columns a row names. */
function headerScore(row: string[]): number {
  const fields = new Set<Field>();
  for (const cell of row) {
    const field = ALIASES[normaliseKey(cell)];
    if (field) fields.add(field);
  }
  // A row is only a heading row if it names SKU *and* something else. An
  // instructions page that happens to have the word "SKU" in a column does
  // not qualify.
  return fields.has("sku") && fields.size >= 2 ? fields.size : 0;
}

/** Row index of the heading row, or -1. */
export function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    if (headerScore(rows[i]) > 0) return i;
  }
  return -1;
}

/**
 * The sheet to import from: whichever has the most convincing heading row, so
 * a template can keep its instructions on the first tab and a workbook people
 * also use for other things still imports cleanly.
 */
export function pickSheet(bytes: Buffer, fileName: string): string[][] {
  const sheets = readSheets(bytes, fileName);
  let best: { rows: string[][]; score: number } | null = null;

  for (const sheet of sheets) {
    const at = findHeaderRow(sheet.rows);
    if (at < 0) continue;
    const score = headerScore(sheet.rows[at]);
    if (!best || score > best.score) best = { rows: sheet.rows, score };
  }

  return best?.rows ?? sheets[0]?.rows ?? [];
}

export function parseRows(rows: string[][]): {
  parsed: Parsed[];
  recognised: string[];
  ignored: string[];
  errors: RowError[];
} {
  const errors: RowError[] = [];
  const headerRow = findHeaderRow(rows);

  if (headerRow < 0) {
    return {
      parsed: [],
      recognised: [],
      ignored: [],
      errors: [
        {
          row: 1,
          sku: "",
          message:
            "Could not find a SKU column. The first row of the sheet must be the column headings.",
        },
      ],
    };
  }

  const columns: (Field | null)[] = [];
  const recognised: string[] = [];
  const ignored: string[] = [];
  const seen = new Set<Field>();

  rows[headerRow].forEach((text) => {
    const field = ALIASES[normaliseKey(text)] ?? null;
    if (field && !seen.has(field)) {
      seen.add(field);
      recognised.push(text || field);
      columns.push(field);
    } else {
      if (text) ignored.push(text);
      columns.push(null);
    }
  });

  const parsed: Parsed[] = [];
  const skusInFile = new Map<string, number>();

  for (let i = headerRow + 1; i < rows.length; i++) {
    const cells = rows[i];
    const raw: Partial<Record<Field, string>> = {};
    const present = new Set<Field>();

    columns.forEach((field, index) => {
      if (!field) return;
      const value = (cells[index] ?? "").trim();
      raw[field] = value;
      if (value !== "") present.add(field);
    });

    const sku = (raw.sku ?? "").toUpperCase();
    const rowNumber = i + 1;

    if (!sku) {
      errors.push({ row: rowNumber, sku: "", message: "No SKU — row skipped." });
      continue;
    }
    if (skusInFile.has(sku)) {
      errors.push({
        row: rowNumber,
        sku,
        message: `Duplicate SKU — already used on row ${skusInFile.get(sku)}.`,
      });
      continue;
    }
    skusInFile.set(sku, rowNumber);
    parsed.push({ row: rowNumber, sku, present, raw });
  }

  return { parsed, recognised, ignored, errors };
}

/* ------------------------------------------------------------- resolving */

/**
 * One parsed row → database values. Errors are pushed rather than thrown, so
 * one bad row never stops the other two hundred. Returns null if the row
 * cannot be used at all.
 *
 * `newBrands` accumulates brands the sheet mentions that do not exist yet, so
 * the same new brand on twenty rows is only created once.
 */
export function resolveRow(
  p: Parsed,
  lookup: Lookup,
  newBrands: Map<string, string>,
  errors: RowError[],
): Resolved | null {
  const values: Values = { sku: p.sku };
  const fail = (message: string) => errors.push({ row: p.row, sku: p.sku, message });
  let bad = false;

  const num = (field: Field, label: string, opts: { min?: number; max?: number } = {}) => {
    if (!p.present.has(field)) return null;
    const n = toNumber(p.raw[field] ?? "");
    if (n === null) return null;
    if (Number.isNaN(n)) {
      fail(`${label} “${p.raw[field]}” is not a number.`);
      bad = true;
      return null;
    }
    if (opts.min !== undefined && n < opts.min) {
      fail(`${label} cannot be below ${opts.min}.`);
      bad = true;
      return null;
    }
    if (opts.max !== undefined && n > opts.max) {
      fail(`${label} cannot be above ${opts.max}.`);
      bad = true;
      return null;
    }
    return n;
  };

  if (p.present.has("nameEn")) values.nameEn = p.raw.nameEn!;
  if (p.present.has("nameAr")) values.nameAr = p.raw.nameAr!;
  if (p.present.has("barcode")) values.barcode = p.raw.barcode || null;
  if (p.present.has("descEn")) values.descEn = p.raw.descEn!;
  if (p.present.has("descAr")) values.descAr = p.raw.descAr!;
  if (p.present.has("specs")) values.specs = toSpecs(p.raw.specs!);
  if (p.present.has("images")) values.images = toImages(p.raw.images!);

  if (p.present.has("category")) {
    const hit = lookup.categoryByKey.get(normaliseKey(p.raw.category!));
    if (!hit) {
      fail(`Category “${p.raw.category}” does not exist.`);
      bad = true;
    } else values.categoryId = hit.id;
  }

  let newBrandName: string | null = null;
  if (p.present.has("brand")) {
    const key = normaliseKey(p.raw.brand!);
    const hit = lookup.brandByName.get(key);
    if (hit) values.brandId = hit.id;
    else {
      newBrandName = p.raw.brand!;
      if (!newBrands.has(key)) newBrands.set(key, newBrandName);
    }
  }

  const price = num("price", "Price", { min: 0 });
  const salePrice = num("salePrice", "Sale price", { min: 0 });
  const discount = num("discountPercent", "Discount %", { min: 0, max: 99 });
  const cost = num("cost", "Cost", { min: 0 });

  if (cost !== null) values.cost = money(cost);

  if (price !== null) {
    if (salePrice !== null) {
      if (salePrice > price) {
        fail("Sale price is higher than the price.");
        bad = true;
      } else {
        values.price = money(salePrice);
        values.compareAtPrice = salePrice < price ? money(price) : null;
      }
    } else if (discount !== null && discount > 0) {
      values.price = money(Math.round(price * (1 - discount / 100) * 100) / 100);
      values.compareAtPrice = money(price);
    } else {
      values.price = money(price);
      values.compareAtPrice = null;
    }
  } else if (salePrice !== null || (discount !== null && discount > 0)) {
    fail("A discount or sale price was given but no price.");
    bad = true;
  }

  const reorder = num("lowStockThreshold", "Reorder level", { min: 0 });
  if (reorder !== null) values.lowStockThreshold = Math.round(reorder);

  const warranty = num("warrantyMonths", "Warranty", { min: 0, max: 240 });
  if (warranty !== null) values.warrantyMonths = Math.round(warranty);

  if (p.present.has("active")) {
    const b = toBoolean(p.raw.active!);
    if (b === null) {
      fail(`“${p.raw.active}” is not yes or no for Active.`);
      bad = true;
    } else values.active = b;
  }
  if (p.present.has("featured")) {
    const b = toBoolean(p.raw.featured!);
    if (b === null) {
      fail(`“${p.raw.featured}” is not yes or no for Featured.`);
      bad = true;
    } else values.featured = b;
  }

  const stockNum = num("stock", "Stock", { min: 0 });
  const stock = stockNum === null ? null : Math.round(stockNum);

  return bad ? null : { row: p.row, sku: p.sku, values, stock, newBrandName };
}

/* -------------------------------------------------------------- display */

export const LABELS: Record<string, string> = {
  barcode: "Barcode",
  nameEn: "Name (EN)",
  nameAr: "Name (AR)",
  descEn: "Description (EN)",
  descAr: "Description (AR)",
  categoryId: "Category",
  brandId: "Brand",
  price: "Price",
  compareAtPrice: "Was-price",
  cost: "Cost",
  lowStockThreshold: "Reorder level",
  warrantyMonths: "Warranty",
  images: "Images",
  specs: "Specs",
  active: "Active",
  featured: "Featured",
  stock: "Stock",
};

export function describe(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) return value.length ? `${value.length} image(s)` : "—";
  if (typeof value === "object") return `${Object.keys(value as object).length} spec(s)`;
  return String(value);
}
