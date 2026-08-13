/** Drops the public schema so `db:push` can rebuild it from scratch. */
import "./load-env";
import { Pool } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
  const pool = new Pool({
    connectionString,
    ...(isLocal ? { ssl: false as const } : {}),
  });
  await pool.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  console.log("→ Schema reset.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
