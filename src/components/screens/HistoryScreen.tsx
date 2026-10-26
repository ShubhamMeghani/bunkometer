"use client";

import { useMemo, useState } from "react";
import { buildCsv, csvFilename } from "@/lib/engine/csv";
import { addDays, formatDayShort, monthName, weekdayOf, type ISODate } from "@/lib/engine/dates";
import { periodOn } from "@/lib/engine/sessions";
import { mostSkippedWeekday, streaks } from "@/lib/engine/stats";
import type { Session } from "@/lib/engine/types";
import { COLOUR_HEX, WEEKDAY_NAMES } from "@/lib/ui/format";
import { SessionCard } from "../attendance";
import { useData } from "../data/DataProvider";
import { Card, PageHeader, btn } from "../ui";

function monthStart(date: ISODate): ISODate {
  return `${date.slice(0, 7)}-01`;
}

function shiftMonth(first: ISODate, by: number): ISODate {
  const [y, m] = first.split("-").map(Number);
  const total = y * 12 + (m - 1) + by;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}

function daysIn(first: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = first; d.slice(0, 7) === first.slice(0, 7); d = addDays(d, 1)) out.push(d);
  return out;
}

/** History calendar, day editor, statistics and CSV export (SPEC R35, R37, R38). */
export function HistoryScreen({ rangeAction }: { rangeAction?: React.ReactNode }) {
  const { snapshot, sessions, summaries, today } = useData();
  const { semester } = snapshot;
  const initial = today < semester.startDate ? semester.startDate : today > semester.endDate ? semester.endDate : today;
  const [month, setMonth] = useState(monthStart(initial));
  const [selected, setSelected] = useState<ISODate>(initial);
  const colourOf = new Map(snapshot.courses.map((c) => [c.id, c.colour]));
  const byId = new Map(summaries.map((s) => [s.course.id, s]));

  const byDate = useMemo(() => {
    const map = new Map<ISODate, Session[]>();
    for (const s of sessions) map.set(s.date, [...(map.get(s.date) ?? []), s]);
    return map;
  }, [sessions]);

  const days = daysIn(month);
  const lead = weekdayOf(days[0]) - 1;
  const canPrev = month > monthStart(semester.startDate);
  const canNext = month < monthStart(semester.endDate);
  const daySessions = byDate.get(selected) ?? [];
  const skipped = mostSkippedWeekday(sessions);
  const streak = streaks(sessions);
  const [y, m] = month.split("-").map(Number);

  return (
    <div className="space-y-4">
      <PageHeader title="History" subtitle="Tap a day to see or fix its marks." action={rangeAction} />

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <button type="button" className={btn.ghost} disabled={!canPrev} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
            ‹
          </button>
          <h2 className="font-bold" aria-live="polite">
            {monthName(m)} {y}
          </h2>
          <button type="button" className={btn.ghost} disabled={!canNext} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted" aria-hidden="true">
          {WEEKDAY_NAMES.map((d) => (
            <span key={d}>{d.slice(0, 2)}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1" role="group" aria-label={`${monthName(m)} ${y}`}>
          {Array.from({ length: lead }, (_, i) => (
            <span key={`pad-${i}`} />
          ))}
          {days.map((d) => {
            const list = byDate.get(d) ?? [];
            const absent = list.some((s) => s.status === "absent");
            const unmarked = d < today && list.some((s) => s.status === null);
            const colours = [...new Set(list.map((s) => s.courseId))].slice(0, 3).map((id) => colourOf.get(id) ?? "slate");
            const parts = [`${formatDayShort(d)}: ${list.length === 1 ? "1 class" : `${list.length} classes`}`];
            if (absent) parts.push("has an absence");
            if (unmarked) parts.push("needs marking");
            return (
              <button
                key={d}
                type="button"
                data-date={d}
                data-sessions={list.length}
                data-absent={absent || undefined}
                data-unmarked={unmarked || undefined}
                aria-pressed={d === selected}
                aria-label={parts.join(", ")}
                onClick={() => setSelected(d)}
                className={`flex min-h-11 flex-col items-center justify-center rounded-lg text-sm tabular-nums ${
                  d === selected ? "bg-accent font-bold text-accent-ink" : d === today ? "border border-accent" : "bg-surface-2"
                } ${d < semester.startDate || d > semester.endDate ? "text-muted" : ""}`}
              >
                <span>{Number(d.slice(8))}</span>
                <span className="flex h-2 items-center gap-0.5" aria-hidden="true">
                  {colours.map((c, i) => (
                    <span key={i} className="size-1.5 rounded-full" style={{ background: COLOUR_HEX[c] }} />
                  ))}
                  {absent && <span className="text-[9px] font-black leading-none text-danger">✕</span>}
                  {unmarked && <span className="size-1.5 rounded-full border border-[var(--warn)]" />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted">Dots: courses with classes · ✕ an absence · ring: needs marking</p>
      </Card>

      <section className="space-y-2" aria-labelledby="day-h">
        <h2 id="day-h" className="text-lg font-bold">
          {formatDayShort(selected)}
        </h2>
        {daySessions.length === 0 ? (
          <Card className="flex items-center gap-3">
            <span aria-hidden="true" className="text-2xl">
              {periodOn(selected, snapshot.periods) ? "🎉" : "☕"}
            </span>
            <p className="text-muted">{periodOn(selected, snapshot.periods)?.label ?? "No classes"}</p>
          </Card>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2" data-testid="day-editor">
            {daySessions.map((s, i) => {
              const summary = byId.get(s.courseId);
              return summary ? <SessionCard key={s.key} session={s} summary={summary} index={i} /> : null;
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2" aria-labelledby="stats-h">
        <h2 id="stats-h" className="text-lg font-bold">
          Stats
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center" >
            <p className="text-2xl font-bold tabular-nums" data-testid="streaks">
              🔥 {streak.current}
            </p>
            <p className="text-xs font-medium text-muted">Current streak</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold tabular-nums">{streak.longest}</p>
            <p className="text-xs font-medium text-muted">Longest streak</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="truncate text-2xl font-bold" data-testid="most-skipped">
              {skipped === null ? "—" : WEEKDAY_NAMES[skipped - 1].slice(0, 3)}
            </p>
            <p className="text-xs font-medium text-muted">{skipped === null ? "No skips yet" : "Most-skipped day"}</p>
          </Card>
        </div>
        <p className="text-xs text-muted">A streak counts classes attended in a row; an absence resets it.</p>
      </section>

      <button
        type="button"
        className={`${btn.secondary} w-full`}
        onClick={() => {
          const csv = buildCsv(semester, snapshot.courses, sessions, today);
          const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
          const a = document.createElement("a");
          a.href = url;
          a.download = csvFilename(semester.name, today);
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}
      >
        Export CSV
      </button>
    </div>
  );
}
