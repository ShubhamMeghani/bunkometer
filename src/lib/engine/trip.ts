import { budgetFromCounts, courseWindowBudgets, isCountable, type Budget, type WindowBudget } from "./budget";
import { maxDate, minDate, type ISODate } from "./dates";
import { STATUS_RANK } from "./summary";
import type { BudgetStatus, Course, Semester, Session } from "./types";

// SPEC §4.5. Simulates every unmarked, non-cancelled session in the effective range as absent; saves nothing.

export type Verdict = "go" | "careful" | "nogo";

export interface TripWindow {
  before: WindowBudget;
  missed: number;
  after: Budget;
}

export interface TripCourse {
  course: Course;
  missed: number;
  windows: TripWindow[];
  labs: Session[];
  status: BudgetStatus;
}

export type TripPlan =
  | { ok: false; error: string }
  | {
      ok: true;
      from: ISODate;
      to: ISODate;
      clipped: boolean;
      affected: TripCourse[];
      unaffected: Course[];
      labsNeeded: number;
      verdict: Verdict;
    };

export function planTrip(
  semester: Semester,
  courses: Course[],
  sessions: Session[],
  today: ISODate,
  from: ISODate,
  to: ISODate,
): TripPlan {
  if (from > to) return { ok: false, error: "Start date must be on or before end date" };
  const effFrom = maxDate(from, today);
  const effTo = minDate(to, semester.endDate);
  if (effFrom > effTo || effTo < semester.startDate)
    return { ok: false, error: "Pick dates from today up to the end of the semester" };
  const lo = maxDate(effFrom, semester.startDate);

  const affected: TripCourse[] = [];
  const unaffected: Course[] = [];
  for (const course of courses) {
    const own = sessions.filter((s) => s.courseId === course.id);
    const inRange = own.filter((s) => s.date >= lo && s.date <= effTo && s.status === null);
    const windows: TripWindow[] = [];
    for (const before of courseWindowBudgets(course, semester, own, today)) {
      const missed = inRange.filter(
        (s) => isCountable(s, course) && s.date >= before.window.start && s.date <= before.window.end,
      ).length;
      if (missed === 0) continue;
      windows.push({ before, missed, after: budgetFromCounts({ H: before.H + missed, A: before.A, R: before.R - missed, p: before.p }) });
    }
    const labs = inRange.filter((s) => s.kind === "lab");
    if (windows.length === 0 && labs.length === 0) {
      unaffected.push(course);
      continue;
    }
    const status = windows.reduce<BudgetStatus>(
      (worst, w) => (STATUS_RANK[w.after.status] > STATUS_RANK[worst] ? w.after.status : worst),
      labs.length > 0 ? "warning" : "none",
    );
    affected.push({ course, missed: windows.reduce((n, w) => n + w.missed, 0), windows, labs, status });
  }

  const all = affected.flatMap((c) => c.windows);
  const labsNeeded = affected.reduce((n, c) => n + c.labs.length, 0);
  const verdict: Verdict = all.some((w) => w.after.K < 0)
    ? "nogo"
    : all.some((w) => w.after.status === "warning" || w.after.status === "danger") || labsNeeded > 0
      ? "careful"
      : "go";
  affected.sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || a.course.code.localeCompare(b.course.code));
  return { ok: true, from: lo, to: effTo, clipped: from < lo || to > effTo, affected, unaffected, labsNeeded, verdict };
}
