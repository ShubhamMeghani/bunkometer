import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Loads .env.local locally; on Vercel the environment already has DATABASE_URL.
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
