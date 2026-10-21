import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { users } from "./schema";

/** Stores only Google ID, email and name (SPEC C4, R2). Returns the user's id. */
export async function upsertUser(input: { googleId: string; email: string; name: string }): Promise<string> {
  const [row] = await getDb()
    .insert(users)
    .values(input)
    .onConflictDoUpdate({ target: users.googleId, set: { email: input.email, name: input.name } })
    .returning({ id: users.id });
  return row.id;
}

export async function findUser(id: string) {
  const [row] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

/** One statement; cascades to every semester, course, slot, session and no-class period (SPEC R6). */
export async function deleteUser(id: string): Promise<void> {
  await getDb().delete(users).where(eq(users.id, id));
}
