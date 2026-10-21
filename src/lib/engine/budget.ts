import { addDays, type ISODate } from "./dates";
import type { BudgetStatus, Course, Semester, Session, WindowId } from "./types";

// SPEC §4.4. Every comparison and every derived count is integer arithmetic; only display strings
// are built from the integer results.

/** Floor division for integers with b > 0. */
export function idiv(a: number, b: number): number {
  const r = a % b;
  const q = (a - r) / b;
  return r < 0 ? q - 1 : q;
}

/** Ceiling division for integers with b > 0. */
export function ceilDiv(a: number, b: number): number {
  return -idiv(-a, b);
}

/** `floor(1000·a/h)/10` with one decimal, truncated, never rounded (SPEC R23). "—" when h = 0. */
export function formatPct(a: number, h: number): string {
  if (h === 0) return "—";
  const tenths = idiv(1000 * a, h);
  return `${idiv(tenths, 10)}.${tenths - 10 * idiv(tenths, 10)}%`;
}

export interface Counts {
  H: number;
  A: number;
  R: number;
  p: number;
}

export interface Budget extends Counts {
  met: boolean;
  K: number;
  S: number | null;
  N: number | null;
  cur: string;
  best: string;
  status: BudgetStatus;
  headline: string;
}

/** SPEC §4.4.3 and the first-match status/headline rules of §4.4.4. */
export function budgetFromCounts({ H, A, R, p }: Counts): Budget {
  const met = H === 0 || 100 * A >= p * H;
  const K = 100 * (A + R) - p * (H + R);
  const reachable = K >= 0;
  const S = reachable ? Math.min(R, idiv(K, 100)) : null;
  const N = !met && reachable ? ceilDiv(p * H - 100 * A, 100 - p) : null;
  const cur = formatPct(A, H);
  const best = formatPct(A + R, H + R);

  let status: BudgetStatus;
  let headline: string;
  if (H + R === 0) {
    status = "none";
    headline = "No classes in this window";
  } else if (R === 0) {
    status = met ? "safe" : "danger";
    headline = `Final ${cur} · ${met ? "meets" : "below"} ${p}%`;
  } else if (K < 0) {
    status = "danger";
    headline = `Can't recover in this window · best ${best}`;
  } else if (S === 0) {
    status = "danger";
    headline = `No skips left · attend all ${R}`;
  } else if (!met) {
    status = "warning";
    headline = `Attend next ${N} to reach ${p}%`;
  } else {
    status = (S as number) <= 2 ? "warning" : "safe";
    headline = `Can skip ${S} more`;
  }
  return { H, A, R, p, met, K, S, N, cur, best, status, headline };
}

export interface WindowDef {
  id: WindowId;
  label: string;
  start: ISODate;
  end: ISODate;
}

const WINDOW_LABELS: Record<WindowId, string> = {
  whole: "Whole semester",
  midsem: "Midsem window",
  endsem: "Endsem window",
};

/** Whole: [start, end]. Split: midsem [start, midsem] (inclusive) and endsem [midsem + 1, end] (SPEC R26). */
export function windowsFor(course: Pick<Course, "windowMode">, semester: Semester): WindowDef[] {
  if (course.windowMode === "whole") {
    return [{ id: "whole", label: WINDOW_LABELS.whole, start: semester.startDate, end: semester.endDate }];
  }
  return [
    { id: "midsem", label: WINDOW_LABELS.midsem, start: semester.startDate, end: semester.midsemDate },
    { id: "endsem", label: WINDOW_LABELS.endsem, start: addDays(semester.midsemDate, 1), end: semester.endDate },
  ];
}

export function windowIdOf(date: ISODate, course: Pick<Course, "windowMode">, semester: Semester): WindowId {
  if (course.windowMode === "whole") return "whole";
  return date <= semester.midsemDate ? "midsem" : "endsem";
}

/** The window containing today; the first before the semester, the last after it. */
export function currentWindowId(course: Pick<Course, "windowMode">, semester: Semester, today: ISODate): WindowId {
  return windowIdOf(today, course, semester);
}

/** Not cancelled, and a lecture, or a tutorial when tutorials count. Labs never count (SPEC R25). */
export function isCountable(s: Pick<Session, "kind" | "status">, course: Pick<Course, "countTutorials">): boolean {
  if (s.status === "cancelled") return false;
  return s.kind === "lecture" || (s.kind === "tutorial" && course.countTutorials);
}

/**
 * Keys of medical sessions that count as absent because the course's cap is used up. Countable medical
 * sessions are ordered by (date, start time) across the whole semester (SPEC R24, decision OQ-3).
 */
export function overCapMedical(course: Course, courseSessions: Session[]): Set<string> {
  const over = new Set<string>();
  if (course.medicalCap === null) return over;
  const medical = courseSessions
    .filter((s) => s.status === "medical" && isCountable(s, course))
    .sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0));
  medical.slice(course.medicalCap).forEach((s) => over.add(s.key));
  return over;
}

export type WindowPhase = "upcoming" | "current" | "ended";

export interface WindowBudget extends Budget {
  window: WindowDef;
  phase: WindowPhase;
  U: number;
  medical: number;
  overCap: number;
}

export function computeWindowBudget(
  course: Course,
  window: WindowDef,
  courseSessions: Session[],
  today: ISODate,
  overCap: Set<string> = overCapMedical(course, courseSessions),
): WindowBudget {
  let H = 0;
  let A = 0;
  let R = 0;
  let U = 0;
  let medical = 0;
  let over = 0;
  for (const s of courseSessions) {
    if (s.courseId !== course.id || s.date < window.start || s.date > window.end || !isCountable(s, course)) continue;
    if (s.status === null) {
      if (s.date >= today) R++;
      else U++;
      continue;
    }
    H++;
    if (s.status === "present") A++;
    else if (s.status === "medical") {
      if (overCap.has(s.key)) over++;
      else {
        A++;
        medical++;
      }
    }
  }
  const phase: WindowPhase = today < window.start ? "upcoming" : today > window.end ? "ended" : "current";
  return { ...budgetFromCounts({ H, A, R, p: course.requiredPct }), window, phase, U, medical, overCap: over };
}

/** All windows of a course, the current window first (SPEC R29). */
export function courseWindowBudgets(
  course: Course,
  semester: Semester,
  courseSessions: Session[],
  today: ISODate,
): WindowBudget[] {
  const overCap = overCapMedical(course, courseSessions);
  const current = currentWindowId(course, semester, today);
  const budgets = windowsFor(course, semester).map((w) => computeWindowBudget(course, w, courseSessions, today, overCap));
  return [...budgets.filter((b) => b.window.id === current), ...budgets.filter((b) => b.window.id !== current)];
}
