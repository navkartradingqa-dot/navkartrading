/**
 * Loads environment variables for CLI scripts.
 *
 * Next.js reads `.env.local` automatically, but plain Node scripts and
 * drizzle-kit do not — dotenv defaults to `.env` only. That mismatch silently
 * left DATABASE_URL undefined for `db:push` and `db:seed` while `next dev`
 * worked fine. Load `.env.local` first (it wins), then `.env` as a fallback.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });
