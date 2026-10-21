import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../../src/lib/db/schema";

// The Playwright process talks to the dev branch directly to build fixtures (SPEC C11, PLAN rule 11).
// .env.local is loaded by @next/env; nothing here prints it.
loadEnvConfig(process.cwd());

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function testDb() {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL missing for E2E");
    db = drizzle(neon(url), { schema });
  }
  return db;
}

export async function deleteTestUser(email: string): Promise<void> {
  if (!email.endsWith("@e2e.test")) throw new Error("refusing to delete a non-test user");
  await testDb().delete(schema.users).where(eq(schema.users.googleId, `test:${email.toLowerCase()}`));
}
