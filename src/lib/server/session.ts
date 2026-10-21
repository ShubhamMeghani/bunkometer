import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth/auth";
import { E2E_TODAY_COOKIE, resolveToday } from "@/lib/auth/test-mode";
import { findUser } from "@/lib/db/users";

/** Today in Asia/Kolkata, decided on the server (SPEC R28). */
export const getToday = cache(async () => {
  const jar = await cookies();
  return resolveToday(jar.get(E2E_TODAY_COOKIE)?.value, new Date());
});

/** The signed-in user, or null. A session whose user was deleted counts as signed out (SPEC R6). */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return findUser(id);
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}
