"use server";

import { randomUUID } from "node:crypto";
import { signOut } from "@/lib/auth/auth";
import { diffSnapshots, isEmptyDiff } from "@/lib/data/diff";
import { applyMutation, validateMutation, validateNewSemester } from "@/lib/data/mutations";
import { LIMITS, mutationSchema, newSemesterSchema } from "@/lib/data/schemas";
import { countSemesters, insertSemester, loadSnapshot, setActiveSemester, writeDiff } from "@/lib/db/repo";
import { deleteUser } from "@/lib/db/users";
import { getCurrentUser, getToday } from "@/lib/server/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

const SIGNED_OUT: ActionResult = { ok: false, error: "You are signed out. Sign in again." };

/** Every change to the active semester goes through here (SPEC R3, R16–R19, R30, R34). */
export async function mutate(input: unknown): Promise<ActionResult> {
  const parsed = mutationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const user = await getCurrentUser();
  if (!user) return SIGNED_OUT;
  if (!user.activeSemesterId) return { ok: false, error: "Not found" };
  const before = await loadSnapshot(user.id, user.activeSemesterId);
  if (!before) return { ok: false, error: "Not found" };
  const error = validateMutation(before, parsed.data, await getToday());
  if (error) return { ok: false, error };
  const after = applyMutation(before, parsed.data, randomUUID);
  const diff = diffSnapshots(before, after);
  if (!isEmptyDiff(diff)) await writeDiff(user.id, before.semester.id, after, diff);
  return { ok: true };
}

/** Creates a complete semester (setup wizard) and makes it active (SPEC R7–R11). */
export async function createSemester(input: unknown): Promise<ActionResult> {
  const parsed = newSemesterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const cross = validateNewSemester(parsed.data);
  if (cross) return { ok: false, error: cross };
  const user = await getCurrentUser();
  if (!user) return SIGNED_OUT;
  if ((await countSemesters(user.id)) >= LIMITS.semestersPerUser)
    return { ok: false, error: `At most ${LIMITS.semestersPerUser} semesters` };
  await insertSemester(user.id, randomUUID(), parsed.data);
  return { ok: true };
}

export async function switchSemester(semesterId: unknown): Promise<ActionResult> {
  if (typeof semesterId !== "string") return { ok: false, error: "Not found" };
  const user = await getCurrentUser();
  if (!user) return SIGNED_OUT;
  return (await setActiveSemester(user.id, semesterId)) ? { ok: true } : { ok: false, error: "Not found" };
}

/** SPEC R6: typing DELETE removes the user and everything they own, then signs out. */
export async function deleteAccount(confirmation: unknown): Promise<ActionResult> {
  if (confirmation !== "DELETE") return { ok: false, error: "Type DELETE to confirm" };
  const user = await getCurrentUser();
  if (!user) return SIGNED_OUT;
  await deleteUser(user.id);
  await signOut({ redirectTo: "/" });
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
