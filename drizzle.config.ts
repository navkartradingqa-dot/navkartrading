import "./scripts/load-env";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: (() => {
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error(
          "DATABASE_URL is not set. Put it in .env.local (Next.js and these scripts both read it).",
        );
      }
      return url;
    })(),
  },
  strict: false,
  verbose: true,
});
