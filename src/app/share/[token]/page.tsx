import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { importShareAction } from "@/app/actions";
import { signIn } from "@/lib/auth/auth";
import { loadTemplate } from "@/lib/db/share";
import { formatDayLong, formatDayShort } from "@/lib/engine/dates";
import { getCurrentUser } from "@/lib/server/session";
import { COLOUR_HEX, KIND_LABEL, WEEKDAY_NAMES, timeRange } from "@/lib/ui/format";

export const dynamic = "force-dynamic";

/** Public, read-only preview of a shared timetable: no marks, no owner name or email (SPEC R39–R41). */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const template = await loadTemplate(token);
  if (!template) notFound();
  const user = await getCurrentUser().catch(() => null);
  const { semester, courses, slots, periods } = template;

  async function importIt() {
    "use server";
    const res = await importShareAction(token);
    if (res.ok) redirect("/today");
  }

  async function signInToImport() {
    "use server";
    await signIn("google", { redirectTo: `/share/${token}` });
  }

  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">Bunk-o-Meter · shared timetable</p>
      <header>
        <h1 className="text-2xl font-bold">{semester.name}</h1>
        <p className="text-muted">
          {formatDayLong(semester.startDate)} – {formatDayLong(semester.endDate)} · midsem {formatDayShort(semester.midsemDate)}
        </p>
      </header>

      {user ? (
        <form action={importIt}>
          <button type="submit" className="min-h-12 w-full rounded-2xl bg-accent px-5 font-semibold text-accent-ink">
            Import as my semester
          </button>
        </form>
      ) : (
        <form action={signInToImport}>
          <button type="submit" className="min-h-12 w-full rounded-2xl bg-accent px-5 font-semibold text-accent-ink">
            Sign in with Google to import
          </button>
        </form>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Courses</h2>
        <ul className="space-y-2">
          {courses.map((c) => (
            <li key={c.id} className="rounded-2xl border border-line bg-surface p-4" data-testid="template-course">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="size-3 rounded-full" style={{ background: COLOUR_HEX[c.colour] }} />
                <span className="font-bold">{c.code}</span>
                <span className="text-muted">{c.name}</span>
              </div>
              <p className="mt-1 text-sm text-muted">
                Needs {c.requiredPct}% · {c.windowMode === "split" ? "midsem + endsem windows" : "whole semester"} · tutorials{" "}
                {c.countTutorials ? "count" : "don't count"}
                {c.medicalCap !== null ? ` · medical cap ${c.medicalCap}` : ""}
              </p>
              <ul className="mt-2 space-y-0.5 text-sm">
                {slots
                  .filter((s) => s.courseId === c.id)
                  .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime))
                  .map((s) => (
                    <li key={s.id}>
                      {WEEKDAY_NAMES[s.weekday - 1]} {timeRange(s.startTime, s.durationMin)} · {KIND_LABEL[s.kind]}
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      {periods.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold">Holidays &amp; exams</h2>
          <ul className="rounded-2xl border border-line bg-surface p-4 text-sm">
            {periods.map((p) => (
              <li key={p.id}>
                <span className="font-semibold">{p.label}</span> · {formatDayShort(p.startDate)}
                {p.endDate !== p.startDate ? ` – ${formatDayShort(p.endDate)}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
      <Link href="/" className="inline-block font-semibold text-accent">
        What is Bunk-o-Meter?
      </Link>
    </main>
  );
}
