"use client";

import Link from "next/link";
import { useState } from "react";
import type { WindowBudget } from "@/lib/engine/budget";
import { formatDayShort } from "@/lib/engine/dates";
import { isOverdueMakeup } from "@/lib/engine/labs";
import type { CourseSummary } from "@/lib/engine/summary";
import type { Course, Session, Status } from "@/lib/engine/types";
import type { Target } from "@/lib/data/schemas";
import { KIND_LABEL, STATUS_LABEL, plural, timeRange } from "@/lib/ui/format";
import { useData } from "./data/DataProvider";
import { AttendanceMeter, Card, ColourDot, Metric, STATUS_FILL, STATUS_TEXT, StatusChip, btn, enter, inputClass } from "./ui";
import { COLOUR_HEX } from "@/lib/ui/format";

export function targetOf(s: Session): Target {
  return s.slotId ? { by: "slot", slotId: s.slotId, date: s.date } : { by: "row", rowId: s.rowId! };
}

const STATUSES: Status[] = ["present", "absent", "medical", "cancelled"];
const ICONS: Record<Status, string> = { present: "✓", absent: "✕", medical: "✚", cancelled: "⊘" };
const SELECTED: Record<Status, string> = {
  present: "bg-[var(--safe-strong)] text-[var(--safe-on)] border-transparent",
  absent: "bg-[var(--danger-strong)] text-[var(--danger-on)] border-transparent",
  medical: "bg-[var(--medical-strong)] text-[var(--medical-on)] border-transparent",
  cancelled: "bg-[var(--cancel-strong)] text-[var(--cancel-on)] border-transparent",
};

/** One-tap Present / Absent / Medical / Cancelled; tapping the selected one clears it (SPEC R15, R16, R19). */
export function MarkControl({ session, course }: { session: Session; course: Course }) {
  const { run, today, online } = useData();
  const future = session.date > today;
  return (
    <div
      role="group"
      aria-label={`Mark ${course.code} ${KIND_LABEL[session.kind].toLowerCase()} at ${session.startTime} on ${formatDayShort(session.date)}`}
      className="grid grid-cols-4 gap-1.5"
    >
      {STATUSES.map((st) => {
        const selected = session.status === st;
        const disabled = !online || (st === "present" && future);
        return (
          <button
            key={st}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            title={st === "present" && future ? "You can't mark a future class present" : undefined}
            onClick={() => void run({ type: "mark", target: targetOf(session), status: selected ? null : st })}
            className={`press flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl border px-1 text-[13px] font-semibold disabled:opacity-40 ${
              selected ? `${SELECTED[st]} shadow-sm` : "border-line bg-surface-2 text-ink hover:border-accent"
            }`}
          >
            <span aria-hidden="true" className="text-base leading-none">
              {ICONS[st]}
            </span>
            {STATUS_LABEL[st]}
          </button>
        );
      })}
    </div>
  );
}

export function labLine(summary: CourseSummary): string {
  const { lab } = summary;
  const parts = [`${lab.done} done`];
  if (lab.pending) parts.push(plural(lab.pending, "pending makeup"));
  if (lab.overdue) parts.push(`${lab.overdue} overdue`);
  return `Labs: ${parts.join(" · ")}`;
}

/** A class on Today or in a day editor: course, time, kind, the course's headline and the mark control. */
export function SessionCard({
  session,
  summary,
  label,
  index = 0,
}: {
  session: Session;
  summary: CourseSummary;
  label?: string;
  index?: number;
}) {
  const { course } = summary;
  const counted = session.kind === "lecture" || (session.kind === "tutorial" && course.countTutorials);
  const line =
    session.kind === "lab"
      ? labLine(summary)
      : counted
        ? summary.current.headline
        : "Tutorials don't count for this course";
  const lineStatus = session.kind === "lab" ? summary.lab.status : counted ? summary.current.status : "none";
  const anim = enter(index);
  return (
    <li data-testid="session" data-course={course.code} data-date={session.date} data-kind={session.kind} className={anim.className} style={anim.style}>
      {label && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>}
      <Card className="relative h-full space-y-3 overflow-hidden pl-5">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ background: COLOUR_HEX[course.colour] ?? "#64748b" }} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ColourDot colour={course.colour} />
              <span className="font-bold">{course.code}</span>
              <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs font-semibold text-muted">
                {KIND_LABEL[session.kind]}
              </span>
              {session.isExtra && (
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs font-semibold text-muted">Extra</span>
              )}
            </div>
            <p className="truncate text-sm text-muted">{course.name}</p>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-muted">
            {timeRange(session.startTime, session.durationMin)}
          </span>
        </div>
        <p className={`flex items-center gap-2 text-sm font-bold ${STATUS_TEXT[lineStatus]}`}>
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: STATUS_FILL[lineStatus] }} />
          {line}
        </p>
        <MarkControl session={session} course={course} />
      </Card>
    </li>
  );
}

export function WindowBlock({ budget, compact = false, showLabel }: { budget: WindowBudget; compact?: boolean; showLabel: boolean }) {
  if (compact) {
    return (
      <p className="text-sm text-muted" data-testid="other-window">
        <span className="font-semibold text-ink">{budget.window.label}</span> · {budget.headline}
      </p>
    );
  }
  return (
    <div className="space-y-3" data-testid="current-window">
      {showLabel && <p className="text-xs font-semibold uppercase tracking-wide text-muted">{budget.window.label}</p>}
      <p className={`text-2xl font-bold leading-tight tracking-tight ${STATUS_TEXT[budget.status]}`} data-testid="headline">
        {budget.headline}
      </p>
      {budget.H + budget.R > 0 && <AttendanceMeter A={budget.A} H={budget.H} p={budget.p} status={budget.status} />}
      <div className="grid grid-cols-5 divide-x divide-[var(--border)] rounded-xl bg-surface-2">
        <Metric label="Held" value={budget.H} />
        <Metric label="Attended" value={budget.A} />
        <Metric label="Now" value={budget.cur} />
        <Metric label="Left" value={budget.R} />
        <Metric label="Max" value={budget.best} />
      </div>
      <p className="text-xs text-muted">
        Needs {budget.p}%{budget.medical > 0 ? ` · incl. ${plural(budget.medical, "medical")}` : ""}
        {budget.overCap > 0 ? ` · ${budget.overCap} over medical cap` : ""}
        {budget.U > 0 ? ` · ${budget.U} unmarked` : ""}
      </p>
    </div>
  );
}

/** A course card on Courses (SPEC R29): status text + icon, current window first, other window beneath. */
export function CourseCard({ summary, index = 0 }: { summary: CourseSummary; index?: number }) {
  const { href } = useData();
  const { course, windows, lab, hasPercentage } = summary;
  const split = windows.length > 1;
  const anim = enter(index);
  return (
    <li data-testid="course-card" data-course={course.code} data-status={summary.status} className={anim.className} style={anim.style}>
      <Card className="relative h-full space-y-3 overflow-hidden pl-5">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ background: STATUS_FILL[summary.status] }} />
        <div className="flex items-start justify-between gap-3">
          <Link href={href(`/courses/${course.id}`)} className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <ColourDot colour={course.colour} />
              <span className="text-lg font-bold underline-offset-2 hover:underline">{course.code}</span>
              <span aria-hidden="true" className="text-muted">›</span>
            </div>
            <p className="truncate text-sm text-muted">{course.name}</p>
          </Link>
          <StatusChip status={summary.status} />
        </div>
        {hasPercentage && (
          <>
            <WindowBlock budget={windows[0]} showLabel={split} />
            {windows.slice(1).map((w) => (
              <WindowBlock key={w.window.id} budget={w} compact showLabel />
            ))}
          </>
        )}
        {lab.status !== "none" && (
          <p className={`flex items-center gap-2 text-sm font-semibold ${lab.pending ? "text-warn" : ""}`} data-testid="lab-line">
            <span aria-hidden="true">🧪</span>
            {labLine(summary)}
          </p>
        )}
      </Card>
    </li>
  );
}

/** Pending makeups with a date field and "Mark completed" (SPEC R30, R31). */
export function MakeupList({ courseId }: { courseId?: string }) {
  const { summaries, run, today } = useData();
  const items = summaries
    .filter((s) => !courseId || s.course.id === courseId)
    .flatMap((s) => s.lab.pendingSessions.map((session) => ({ session, course: s.course })))
    .sort((a, b) => (a.session.date < b.session.date ? -1 : 1));
  if (items.length === 0) return <p className="text-sm text-muted">No pending makeups.</p>;
  return (
    <ul className="space-y-2" data-testid="makeup-list">
      {items.map(({ session, course }) => (
        <MakeupItem key={session.key} session={session} course={course} today={today} run={run} />
      ))}
    </ul>
  );
}

function MakeupItem({
  session,
  course,
  today,
  run,
}: {
  session: Session;
  course: Course;
  today: string;
  run: ReturnType<typeof useData>["run"];
}) {
  const [date, setDate] = useState(session.makeupDate ?? "");
  const overdue = isOverdueMakeup(session, today);
  return (
    <li data-testid="makeup" className="rounded-xl border border-line bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ColourDot colour={course.colour} />
          <span className="font-semibold">{course.code} lab</span>
          <span className="text-sm text-muted">missed {formatDayShort(session.date)}</span>
        </div>
        {overdue && <StatusChip status="danger" label="Overdue" />}
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-sm font-semibold">
          Makeup date
          <input
            type="date"
            className={`${inputClass} mt-1`}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              void run({
                type: "makeup",
                target: targetOf(session),
                makeupDate: e.target.value || null,
                makeupDone: false,
              });
            }}
          />
        </label>
        <button
          type="button"
          className={btn.primary}
          onClick={() => void run({ type: "makeup", target: targetOf(session), makeupDate: date || null, makeupDone: true })}
        >
          Mark completed
        </button>
      </div>
    </li>
  );
}
