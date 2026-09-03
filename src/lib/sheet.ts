/**
 * Minimal spreadsheet reader — .xlsx and .csv, no dependencies.
 *
 * An .xlsx file is a zip of XML parts. We only need enough of it to pull a
 * rectangle of text out of the first (or named) worksheet, so this reads the
 * zip central directory, inflates the parts it needs, and walks the cell XML.
 * Everything comes back as trimmed strings — the import layer decides what a
 * given column means.
 */

import { inflateRawSync } from "node:zlib";

/* ------------------------------------------------------------------- zip */

function findEndOfCentralDirectory(buf: Buffer): number {
  // The EOCD record is at most 22 + 65535 bytes from the end.
  const min = Math.max(0, buf.length - 22 - 0xffff);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) return i;
  }
  return -1;
}

/** Returns the zip's entries as name → uncompressed bytes. */
function unzip(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  const eocd = findEndOfCentralDirectory(buf);
  if (eocd < 0) throw new Error("Not a valid .xlsx file (no zip directory found).");

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    p += 46 + nameLen + extraLen + commentLen;

    if (buf.readUInt32LE(localOffset) !== 0x04034b50) continue;
    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLen + localExtraLen;
    const raw = buf.subarray(start, start + compressedSize);

    try {
      out.set(name, method === 0 ? Buffer.from(raw) : inflateRawSync(raw));
    } catch {
      // A part we can't read is a part we don't need — keep going.
    }
  }
  return out;
}

/* ------------------------------------------------------------------- xml */

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
};

function decodeXml(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (m) => ENTITIES[m] ?? m);
}

/** All <t> text inside a chunk, concatenated — handles rich-text runs. */
function textOf(chunk: string): string {
  let out = "";
  const re = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(chunk))) out += decodeXml(m[1]);
  return out;
}

/** "BC" → 54 (1-based column number). */
function columnNumber(ref: string): number {
  const letters = ref.replace(/[^A-Za-z]/g, "").toUpperCase();
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

/* ----------------------------------------------------------------- xlsx */

function sharedStrings(parts: Map<string, Buffer>): string[] {
  const xml = parts.get("xl/sharedStrings.xml")?.toString("utf8");
  if (!xml) return [];
  const out: string[] = [];
  const re = /<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1] ? textOf(m[1]) : "");
  return out;
}

/** Every worksheet in workbook order, as name → part path. */
function sheetPaths(parts: Map<string, Buffer>): { name: string; path: string }[] {
  const workbook = parts.get("xl/workbook.xml")?.toString("utf8") ?? "";
  const rels = parts.get("xl/_rels/workbook.xml.rels")?.toString("utf8") ?? "";

  const targets = new Map<string, string>();
  const relRe = /<Relationship\b[^>]*\/>/g;
  let r: RegExpExecArray | null;
  while ((r = relRe.exec(rels))) {
    const id = /Id="([^"]+)"/.exec(r[0])?.[1];
    const target = /Target="([^"]+)"/.exec(r[0])?.[1];
    if (id && target) targets.set(id, target.replace(/^\/?xl\//, "").replace(/^\//, ""));
  }

  const sheets: { name: string; path: string }[] = [];
  const sheetRe = /<sheet\b[^>]*\/>/g;
  let s: RegExpExecArray | null;
  while ((s = sheetRe.exec(workbook))) {
    const name = decodeXml(/name="([^"]*)"/.exec(s[0])?.[1] ?? "");
    const rid = /r:id="([^"]+)"/.exec(s[0])?.[1] ?? "";
    const target = targets.get(rid);
    if (target) sheets.push({ name, path: `xl/${target}` });
  }

  const usable = sheets.filter((s) => parts.has(s.path));
  if (usable.length) return usable;

  // Fall back to the conventional paths if the workbook part was unreadable.
  return [...parts.keys()]
    .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .sort()
    .map((path) => ({ name: path, path }));
}

function cellsFrom(xml: string, strings: string[]): string[][] {
  const rows: string[][] = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>|<row\b[^>]*\/>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRe.exec(xml))) {
    const body = rowMatch[1] ?? "";
    const cells: string[] = [];
    const cellRe = /<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellRe.exec(body))) {
      const attrs = cellMatch[1] ?? "";
      const inner = cellMatch[2] ?? "";
      const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
      const type = /t="([^"]+)"/.exec(attrs)?.[1] ?? "n";

      let value = "";
      if (type === "s") {
        const index = Number(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? "-1");
        value = strings[index] ?? "";
      } else if (type === "inlineStr") {
        value = textOf(inner);
      } else if (type === "b") {
        value = /<v>1<\/v>/.test(inner) ? "TRUE" : "FALSE";
      } else {
        const raw = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        value = raw ? decodeXml(raw) : textOf(inner);
      }

      const index = ref ? columnNumber(ref) - 1 : cells.length;
      while (cells.length < index) cells.push("");
      cells[index] = value.trim();
    }
    rows.push(cells);
  }
  return rows;
}

/* ------------------------------------------------------------------ csv */

export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

/* --------------------------------------------------------------- public */

export type Sheet = { name: string; rows: string[][] };

/**
 * Every sheet in the file, in workbook order, as rows of trimmed strings.
 * Fully blank rows are dropped. A .csv comes back as a single sheet.
 *
 * The caller picks which sheet it wants — a template can put instructions on
 * the first tab without the import reading the instructions as products.
 */
export function readSheets(bytes: Buffer, filename: string): Sheet[] {
  const clean = (rows: string[][]) => rows.filter((r) => r.some((c) => c !== ""));

  if (/\.(csv|txt|tsv)$/i.test(filename)) {
    return [{ name: "csv", rows: clean(parseCsv(bytes.toString("utf8"))) }];
  }

  const parts = unzip(bytes);
  const strings = sharedStrings(parts);
  const sheets = sheetPaths(parts);
  if (!sheets.length) throw new Error("No worksheet found in the file.");

  return sheets.map(({ name, path }) => ({
    name,
    rows: clean(cellsFrom(parts.get(path)!.toString("utf8"), strings)),
  }));
}

/** The first sheet's rows — used by the tests and anything that wants one grid. */
export function readTable(bytes: Buffer, filename: string): string[][] {
  return readSheets(bytes, filename)[0]?.rows ?? [];
}
