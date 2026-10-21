import { courseWindowBudgets, type WindowBudget } from "./budget";
import type { ISODate } from "./dates";
import { labSummary, type LabSummary } from "./labs";
import { generateSessions, sessionsByCourse } from "./sessions";
import type { BudgetStatus, Course, Session, Snapshot } from "./types";

export const STATUS_RANK: Record<BudgetStatus, number> = { none: 0, safe: 1, warning: 2, danger: 3 };

export function worseStatus(a: BudgetStatus, b: BudgetStatus): BudgetStatus {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

export interface CourseSummary {
  course: Course;
  /** Current window first (SPEC R29). */
  windows: WindowBudget[];
  current: WindowBudget;
  lab: LabSummary;
  /** False when the course has no countable sessions at all (e.g. labs only): no % card. */
  hasPercentage: boolean;
  status: BudgetStatus;
  sessions: Session[];
}

export function summarizeCourse(
  course: Course,
  snapshot: Snapshot,
  courseSessions: Session[],
  today: ISODate,
): CourseSummary {
  const windows = courseWindowBudgets(course, snapshot.semester, courseSessions, today);
  const lab = labSummary(courseSessions, today);
  const hasPercentage = windows.some((w) => w.H + w.R + w.U > 0);
  const current = windows[0];
  const status = hasPercentage ? worseStatus(current.status, lab.status) : lab.status;
  return { course, windows, current, lab, hasPercentage, status, sessions: courseSessions };
}

/** Course cards sorted danger → warning → safe → none, then by code (SPEC R29). */
export function summarizeCourses(snapshot: Snapshot, today: ISODate, sessions = generateSessions(snapshot)): CourseSummary[] {
  const byCourse = sessionsByCourse(sessions);
  return snapshot.courses
    .map((c) => summarizeCourse(c, snapshot, byCourse.get(c.id) ?? [], today))
    .sort(
      (a, b) =>
        STATUS_RANK[b.status] - STATUS_RANK[a.status] ||
        a.course.code.localeCompare(b.course.code, "en", { sensitivity: "base" }),
    );
}
