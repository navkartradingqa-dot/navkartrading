import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";

/**
 * Authenticates an external POS terminal.
 *
 * Terminals send `Authorization: Bearer ntk_…`. Keys are stored hashed, so we
 * narrow by the plain-text prefix first and only bcrypt-compare that one row.
 */
export async function authenticateApiKey(req: Request): Promise<{ ok: boolean; label?: string }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false };

  // Bootstrap key from the environment, handy for the first terminal.
  const envKey = process.env.POS_API_KEY;
  if (envKey && token === envKey) return { ok: true, label: "Environment key" };

  const prefix = token.slice(0, 12);
  const candidates = await db.select().from(apiKeys).where(eq(apiKeys.prefix, prefix));

  for (const row of candidates) {
    if (!row.active) continue;
    if (await bcrypt.compare(token, row.keyHash)) {
      await db.update(apiKeys).set({ lastUsed: new Date() }).where(eq(apiKeys.id, row.id));
      return { ok: true, label: row.label };
    }
  }

  return { ok: false };
}
