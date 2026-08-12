import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __ntPool: Pool | undefined;
}

/**
 * TLS is driven by `sslmode` in the connection string (Neon: `verify-full`),
 * which is the properly verified mode. Only a local database gets SSL switched
 * off outright — passing an explicit `ssl` object here would override the URL
 * and quietly disable certificate checking.
 */
function makePool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and point it at your Neon database.",
    );
  }
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
  return new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 5),
    ...(isLocal ? { ssl: false as const } : {}),
  });
}

const pool = global.__ntPool ?? makePool();
if (process.env.NODE_ENV !== "production") global.__ntPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
export type Db = typeof db;
