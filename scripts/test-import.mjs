/**
 * Tests for the spreadsheet reader and the import parser.
 *
 * These are the pure, database-free halves of the import, so they can run with
 * nothing installed:  node --experimental-strip-types scripts/test-import.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const tmp = "/tmp/nt-test";

// The app uses the "@/..." path alias; rewrite it so plain node can resolve it.
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });
for (const name of ["sheet.ts", "product-import-parse.ts"]) {
  const src = fs.readFileSync(path.join(root, "src/lib", name), "utf8");
  fs.writeFileSync(path.join(tmp, name), src.replaceAll('from "@/lib/sheet"', 'from "./sheet.ts"'));
}

const { readSheets, parseCsv } = await import(`${tmp}/sheet.ts`);
const { parseRows, resolveRow, pickSheet, findHeaderRow } = await import(
  `${tmp}/product-import-parse.ts`
);

/* ------------------------------------------------------------ harness */

let passed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) passed++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

function equal(name, actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  check(name, a === b, `got ${a}, wanted ${b}`);
}

/* ------------------------------------------------------------ fixtures */

const CATEGORIES = [
  ["cat_lap", "Laptops", "laptops"],
  ["cat_aud", "Audio & Headphones", "audio"],
  ["cat_mob", "Mobile Phones", "mobile-phones"],
];
const BRANDS = [
  ["br_hp", "HP"],
  ["br_jbl", "JBL"],
];

const lookup = {
  categoryByKey: new Map(),
  brandByName: new Map(),
  nameById: new Map(),
  categoryNames: CATEGORIES.map((c) => c[1]),
};
const key = (v) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
for (const [id, nameEn, slug] of CATEGORIES) {
  lookup.categoryByKey.set(key(nameEn), { id, nameEn });
  lookup.categoryByKey.set(key(slug), { id, nameEn });
  lookup.nameById.set(id, nameEn);
}
for (const [id, name] of BRANDS) {
  lookup.brandByName.set(key(name), { id, name });
  lookup.nameById.set(id, name);
}

function resolveAll(rows) {
  const { parsed, recognised, ignored, errors } = parseRows(rows);
  const newBrands = new Map();
  const resolved = parsed.map((p) => resolveRow(p, lookup, newBrands, errors));
  return { parsed, recognised, ignored, errors, resolved, newBrands };
}

/* --------------------------------------------------------------- tests */

// 1. Loose header matching
{
  const rows = [
    ["Serial No", "Product Name", "Selling Price", "DISCOUNT %", "item type", "Qty"],
    ["nt-lap-1", "HP Pavilion", "1000", "10", "laptops", "3"],
  ];
  const { recognised, resolved, errors } = resolveAll(rows);
  equal("header aliases recognised", recognised.length, 6);
  equal("errors on clean row", errors, []);
  equal("sku uppercased", resolved[0].sku, "NT-LAP-1");
  equal("category by slug", resolved[0].values.categoryId, "cat_lap");
  equal("stock parsed", resolved[0].stock, 3);
}

// 2. Discount maths
{
  const rows = [
    ["SKU", "Price", "Discount %"],
    ["A", "1000", "10"],
    ["B", "999.99", "15"],
    ["C", "500", ""],
    ["D", "1,299.50", "0"],
  ];
  const { resolved } = resolveAll(rows);
  equal("10% off 1000", [resolved[0].values.price, resolved[0].values.compareAtPrice], ["900.00", "1000.00"]);
  equal("15% off 999.99", [resolved[1].values.price, resolved[1].values.compareAtPrice], ["849.99", "999.99"]);
  equal("no discount clears was-price", [resolved[2].values.price, resolved[2].values.compareAtPrice], ["500.00", null]);
  equal("thousands separator and 0%", resolved[3].values.price, "1299.50");
}

// 3. Sale price overrides a discount, and cannot exceed the price
{
  const rows = [
    ["SKU", "Price", "Discount %", "Sale price"],
    ["A", "1000", "10", "880"],
    ["B", "1000", "", "1200"],
  ];
  const { resolved, errors } = resolveAll(rows);
  equal("sale price wins", [resolved[0].values.price, resolved[0].values.compareAtPrice], ["880.00", "1000.00"]);
  check("sale above price rejected", resolved[1] === null && errors.some((e) => e.sku === "B"));
}

// 4. Bad values are reported, not guessed
{
  const rows = [
    ["SKU", "Price", "Discount %", "Active"],
    ["A", "eleven", "", ""],
    ["B", "100", "150", ""],
    ["C", "100", "", "maybe"],
    ["D", "-5", "", ""],
  ];
  const { resolved, errors } = resolveAll(rows);
  equal("all four rejected", resolved.filter(Boolean).length, 0);
  check("price not a number", errors.some((e) => e.sku === "A" && /not a number/.test(e.message)));
  check("discount over 99", errors.some((e) => e.sku === "B" && /above 99/.test(e.message)));
  check("active not yes/no", errors.some((e) => e.sku === "C" && /yes or no/.test(e.message)));
  check("negative price", errors.some((e) => e.sku === "D" && /below 0/.test(e.message)));
}

// 5. Unknown category, and a brand that needs creating
{
  const rows = [
    ["SKU", "Category", "Brand"],
    ["A", "Fridges", "HP"],
    ["B", "Laptops", "Acme"],
    ["C", "laptops", "ACME"],
  ];
  const { resolved, errors, newBrands } = resolveAll(rows);
  check("unknown category rejected", resolved[0] === null && errors.some((e) => /Fridges/.test(e.message)));
  equal("known brand mapped", resolved[2].values.brandId, undefined);
  equal("new brand collected once", [...newBrands.values()], ["Acme"]);
  equal("new brand recorded on row", resolved[1].newBrandName, "Acme");
}

// 6. Missing and duplicate SKUs
{
  const rows = [
    ["SKU", "Price"],
    ["A", "10"],
    ["", "20"],
    ["a", "30"],
  ];
  const { parsed, errors } = resolveAll(rows);
  equal("only the first A kept", parsed.length, 1);
  check("blank sku reported", errors.some((e) => /No SKU/.test(e.message)));
  check("duplicate reported case-insensitively", errors.some((e) => /Duplicate SKU/.test(e.message)));
}

// 7. Absent columns are left alone
{
  const rows = [
    ["SKU", "Price"],
    ["A", "10"],
  ];
  const { resolved } = resolveAll(rows);
  equal("only price and was-price set", Object.keys(resolved[0].values).sort(), [
    "compareAtPrice",
    "price",
    "sku",
  ]);
  equal("stock untouched", resolved[0].stock, null);
}

// 8. A blank cell in a present column is not a change
{
  const rows = [
    ["SKU", "Price", "Barcode", "Stock"],
    ["A", "10", "", ""],
  ];
  const { resolved } = resolveAll(rows);
  check("blank barcode not set", !("barcode" in resolved[0].values));
  equal("blank stock is null", resolved[0].stock, null);
}

// 9. Specs, images and yes/no
{
  const rows = [
    ["SKU", "Specs", "Images", "Active", "Featured"],
    ["A", "Storage: 512GB\nRAM: 16GB", "https://x.test/a.jpg, not-a-url", "YES", "no"],
  ];
  const { resolved } = resolveAll(rows);
  equal("specs split", resolved[0].values.specs, { Storage: "512GB", RAM: "16GB" });
  equal("only urls kept", resolved[0].values.images, ["https://x.test/a.jpg"]);
  equal("yes/no parsed", [resolved[0].values.active, resolved[0].values.featured], [true, false]);
}

// 10. A sheet with no SKU column at all
{
  const { errors, parsed } = resolveAll([
    ["Item", "Price"],
    ["Thing", "10"],
  ]);
  equal("nothing parsed", parsed.length, 0);
  check("explains the problem", errors.some((e) => /SKU column/.test(e.message)));
}

// 11. Headings not on row 1
{
  const rows = [
    ["Navkar Trading — price list"],
    [""],
    ["SKU", "Price"],
    ["A", "10"],
  ];
  equal("header found on row 3", findHeaderRow(rows.filter((r) => r.some((c) => c !== ""))), 1);
  const { resolved } = resolveAll(rows.filter((r) => r.some((c) => c !== "")));
  equal("row still parsed", resolved[0].sku, "A");
}

// 12. CSV round trip
{
  const csv = 'SKU,Name (EN),Price\nNT-1,"Cable, 2m",39\nNT-2,"He said ""hi""",12\n';
  const rows = parseCsv(csv);
  equal("csv quoting", rows[1], ["NT-1", "Cable, 2m", "39"]);
  equal("csv escaped quotes", rows[2], ["NT-2", 'He said "hi"', "12"]);
}

// 13. The real template: instructions tab must not be read as products
{
  const file = path.join(root, "public/navkar-product-template.xlsx");
  if (fs.existsSync(file)) {
    const bytes = fs.readFileSync(file);
    const sheets = readSheets(bytes, "navkar-product-template.xlsx");
    check("template has several sheets", sheets.length >= 2, `got ${sheets.length}`);
    check("first sheet is the guide", findHeaderRow(sheets[0].rows) < 0);

    const rows = pickSheet(bytes, "navkar-product-template.xlsx");
    const { parsed, resolved, errors, recognised, ignored } = resolveAll(rows);
    equal("three example rows", parsed.length, 3);
    equal("no unrecognised columns", ignored, []);
    equal("all 17 columns recognised", recognised.length, 17);
    equal("template rows are clean", errors, []);
    equal("first example price after 10% off", resolved[0].values.price, "2969.10");
    equal("first example was-price", resolved[0].values.compareAtPrice, "3299.00");
    equal("second example has no discount", resolved[1].values.compareAtPrice, null);
    equal("arabic name kept", resolved[1].values.nameAr, "سامسونج جالاكسي A55");
    equal("cost read", resolved[0].values.cost, "2750.00");
    equal("warranty read", resolved[0].values.warrantyMonths, 24);
    equal("stock read", resolved[0].stock, 6);
    equal("featured read", resolved[0].values.featured, true);
  } else {
    failures.push("template file missing — run scripts/make-template.py first");
  }
}

/* -------------------------------------------------------------- report */

console.log(`\n${passed} checks passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log("all good\n");
