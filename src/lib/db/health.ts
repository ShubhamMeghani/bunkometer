import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "./client";

export async function checkDb(): Promise<void> {
  await getDb().execute(sql`select 1 from users limit 1`);
}
