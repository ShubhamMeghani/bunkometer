import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth/auth";
import { getCurrentUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function Landing() {
  const user = await getCurrentUser().catch(() => null);
  if (user) redirect("/today");

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/today" });
  }

  return (
    <>
      <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-lg flex-col justify-center gap-8 px-4 py-10">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Bunk-o-Meter</p>
          <h1 className="text-4xl font-bold leading-tight">Know exactly how many classes you can skip.</h1>
          <p className="text-lg text-muted">
            Track attendance per class, follow your college&apos;s exact rules, and see your bunk budget for every
            course, with no rounding up.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="min-h-12 w-full rounded-2xl bg-accent px-5 text-base font-semibold text-accent-ink"
            >
              Sign in with Google
            </button>
          </form>
          <Link
            href="/demo"
            className="flex min-h-12 items-center justify-center rounded-2xl border border-line bg-surface px-5 text-base font-semibold"
          >
            Try the demo
          </Link>
        </div>
        <p className="text-sm text-muted">We keep only your name, email and Google ID, plus the attendance you record. Delete everything any time.</p>
      </main>
      <footer className="mx-auto flex h-16 max-w-lg items-center border-t border-line px-4 text-sm">
        <Link href="/privacy" className="inline-flex min-h-11 items-center font-semibold text-accent">
          Privacy
        </Link>
      </footer>
    </>
  );
}
