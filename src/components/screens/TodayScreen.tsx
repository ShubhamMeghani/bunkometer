"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDayShort } from "@/lib/engine/dates";
import { periodOn, unmarkedPast } from "@/lib/engine/sessions";
import type { CourseSummary } from "@/lib/engine/summary";
import type { Session } from "@/lib/engine/types";
import { plural } from "@/lib/ui/format";
import { MakeupList, SessionCard } from "../attendance";
import { useData } from "../data/DataProvider";
import { ExtraClassForm } from "../forms";
import { EmptyState, PageHeader, Sheet, btn } from "../ui";

const PLACEHOLDER_ID = "00000000-0000-4000-8000-000000000000";

function SessionList({ sessions, byId, showDate = false }: { sessions: Session[]; byId: Map<string, CourseSummary>; showDate?: boolean }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {sessions.map((s, i) => {
        const summary = byId.get(s.courseId);
        if (!summary) return null;
        return <SessionCard key={s.key} session={s} summary={summary} index={i} label={showDate ? formatDayShort(s.date) : undefined} />;
      })}
    </ul>
  );
}

/** SPEC R15–R21, R31. */
export function TodayScreen() {
  const { snapshot, today, sessions, summaries, href, run } = useData();
  const [showUnmarked, setShowUnmarked] = useState(false);
  const [showMakeups, setShowMakeups] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const { semester } = snapshot;
  const byId = new Map(summaries.map((s) => [s.course.id, s]));
  const todays = sessions.filter((s) => s.date === today);
  const unmarked = unmarkedPast(sessions, today);
  const pendingMakeups = summaries.reduce((n, s) => n + s.lab.pending, 0);

  const marked = todays.filter((s) => s.status !== null).length;
  let empty: React.ReactNode = null;
  if (todays.length === 0) {
    const period = periodOn(today, snapshot.periods);
    if (today < semester.startDate)
      empty = <EmptyState icon="🗓️" title={`Semester starts ${formatDayShort(semester.startDate)}`} hint="Your timetable is ready. Come back on day one to start marking." />;
    else if (today > semester.endDate)
      empty = (
        <EmptyState icon="🎓" title={`Semester ended ${formatDayShort(semester.endDate)}`} hint="That's a wrap. Your final numbers are on Courses.">
          <Link href={href("/courses")} className={btn.secondary}>
            See final results
          </Link>
        </EmptyState>
      );
    else if (period)
      empty = <EmptyState icon={period.kind === "exam" ? "📝" : "🎉"} title={period.label} hint={period.kind === "exam" ? "No classes during exams. Good luck!" : "No classes today. Enjoy the break."} />;
    else
      empty = (
        <EmptyState icon="☕" title="No classes today" hint="Nothing to mark. Planning a day off soon? Check it first.">
          <Link href={href("/plan")} className={btn.secondary}>
            Plan a trip
          </Link>
        </EmptyState>
      );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={formatDayShort(today)}
        title="Today"
        subtitle={
          todays.length > 0
            ? `${todays.length === 1 ? "1 class" : `${todays.length} classes`} · ${marked} marked · ${semester.name}`
            : semester.name
        }
      />

      {pendingMakeups > 0 && (
        <section className="motion-safe:animate-fade-up rounded-2xl border border-line bg-warn-bg px-3 py-1">
          <button
            type="button"
            aria-expanded={showMakeups}
            onClick={() => setShowMakeups((v) => !v)}
            className="flex min-h-11 w-full items-center gap-2 text-left font-bold text-warn"
          >
            <span aria-hidden="true">🧪</span>
            <span data-testid="makeup-banner" className="flex-1">
              {plural(pendingMakeups, "pending makeup")}
            </span>
            <span className="text-sm font-semibold underline underline-offset-2">{showMakeups ? "Hide" : "Review"}</span>
          </button>
          {showMakeups && (
            <div className="mb-2 mt-1">
              <MakeupList />
            </div>
          )}
        </section>
      )}

      {unmarked.length > 0 && (
        <section className="motion-safe:animate-fade-up rounded-2xl border border-line bg-surface px-3 py-1">
          <button
            type="button"
            aria-expanded={showUnmarked}
            onClick={() => setShowUnmarked((v) => !v)}
            className="flex min-h-11 w-full items-center gap-2 text-left font-bold"
          >
            <span aria-hidden="true">📝</span>
            <span data-testid="unmarked-prompt" className="flex-1">
              {unmarked.length === 1 ? "1 class needs marking" : `${unmarked.length} classes need marking`}
            </span>
            <span className="text-sm font-semibold text-accent underline underline-offset-2">{showUnmarked ? "Hide" : "Mark now"}</span>
          </button>
          {showUnmarked && (
            <div className="mb-3 mt-1">
              <SessionList sessions={[...unmarked].reverse()} byId={byId} showDate />
            </div>
          )}
        </section>
      )}

      {empty ? (
        empty
      ) : (
        <SessionList sessions={todays} byId={byId} />
      )}

      {snapshot.courses.length > 0 && (
        <button type="button" className={`${btn.secondary} w-full`} onClick={() => setExtraOpen(true)}>
          Add extra class
        </button>
      )}
      <Sheet open={extraOpen} title="Add extra class" onClose={() => setExtraOpen(false)}>
        <ExtraClassForm
          initial={{
            id: PLACEHOLDER_ID,
            courseId: snapshot.courses[0]?.id ?? "",
            date: today >= semester.startDate && today <= semester.endDate ? today : semester.startDate,
            startTime: "10:00",
            durationMin: 60,
            kind: "lecture",
            status: null,
          }}
          courses={snapshot.courses}
          today={today}
          submitLabel="Add class"
          onSubmit={async (extra) => {
            const ok = await run({ type: "saveExtra", extra: { ...extra, id: crypto.randomUUID() } });
            if (ok) setExtraOpen(false);
            return ok;
          }}
        />
      </Sheet>
    </div>
  );
}
