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
import { Card, Sheet, btn } from "../ui";

const PLACEHOLDER_ID = "00000000-0000-4000-8000-000000000000";

function SessionList({ sessions, byId, showDate = false }: { sessions: Session[]; byId: Map<string, CourseSummary>; showDate?: boolean }) {
  return (
    <ul className="space-y-3">
      {sessions.map((s) => {
        const summary = byId.get(s.courseId);
        if (!summary) return null;
        return <SessionCard key={s.key} session={s} summary={summary} label={showDate ? formatDayShort(s.date) : undefined} />;
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

  let empty: React.ReactNode = null;
  if (todays.length === 0) {
    if (today < semester.startDate) empty = <p>Semester starts {formatDayShort(semester.startDate)}</p>;
    else if (today > semester.endDate)
      empty = (
        <div className="space-y-2">
          <p>Semester ended {formatDayShort(semester.endDate)}</p>
          <Link href={href("/courses")} className={btn.secondary}>
            See final results
          </Link>
        </div>
      );
    else empty = <p>{periodOn(today, snapshot.periods)?.label ?? "No classes today"}</p>;
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-muted">
          {formatDayShort(today)} · {semester.name}
        </p>
      </header>

      {pendingMakeups > 0 && (
        <section className="rounded-2xl border border-line bg-warn-bg p-3">
          <button
            type="button"
            aria-expanded={showMakeups}
            onClick={() => setShowMakeups((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between text-left font-bold text-warn"
          >
            <span data-testid="makeup-banner">
              {plural(pendingMakeups, "pending makeup")}
            </span>
            <span aria-hidden="true">{showMakeups ? "▲" : "▼"}</span>
          </button>
          {showMakeups && (
            <div className="mt-2">
              <MakeupList />
            </div>
          )}
        </section>
      )}

      {unmarked.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-3">
          <button
            type="button"
            aria-expanded={showUnmarked}
            onClick={() => setShowUnmarked((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between text-left font-bold"
          >
            <span data-testid="unmarked-prompt">
              {unmarked.length === 1 ? "1 class needs marking" : `${unmarked.length} classes need marking`}
            </span>
            <span aria-hidden="true">{showUnmarked ? "▲" : "▼"}</span>
          </button>
          {showUnmarked && (
            <div className="mt-3">
              <SessionList sessions={[...unmarked].reverse()} byId={byId} showDate />
            </div>
          )}
        </section>
      )}

      {empty ? (
        <Card>
          <div className="text-lg font-semibold" data-testid="empty-state">
            {empty}
          </div>
        </Card>
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
