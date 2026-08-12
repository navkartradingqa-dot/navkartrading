import { randomUUID, randomBytes } from "node:crypto";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Short, URL-safe, roughly time-sortable id used for all primary keys. */
export function createId(): string {
  const time = Date.now().toString(36).padStart(8, "0");
  const rand = randomUUID().replace(/-/g, "").slice(0, 14);
  return (time + rand)
    .split("")
    .map((c) => (ALPHABET.includes(c) ? c : "0"))
    .join("");
}

/** Customer-facing tracking token, e.g. "NT-7K2M-9QX4". */
export function createTrackingToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  const pick = (n: number) =>
    Array.from(randomBytes(n))
      .map((b) => chars[b % chars.length])
      .join("");
  return `NT-${pick(4)}-${pick(4)}`;
}

/** Sequential-ish human order number: NT-YYMMDD-XXXX */
export function createOrderNumber(prefix = "NT"): string {
  const d = new Date();
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const seq = Array.from(randomBytes(2))
    .map((b) => b.toString(10).padStart(3, "0"))
    .join("")
    .slice(0, 4);
  return `${prefix}-${yy}${mm}${dd}-${seq}`;
}

export function createApiKey(): { key: string; prefix: string } {
  const raw = randomBytes(24).toString("base64url");
  const prefix = raw.slice(0, 8);
  return { key: `ntk_${raw}`, prefix: `ntk_${prefix}` };
}
