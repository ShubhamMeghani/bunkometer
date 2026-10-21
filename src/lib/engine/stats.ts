import { idiv, isCountable, overCapMedical } from "./budget";
import { addDays, minDate, weekEnding, weekdayOf, type ISODate } from "./dates";
import type { Course, Semester, Session } from "./types";

// SPEC §4.6.

export interface TrendPoint {
  weekEnd: ISODate;
  H: number;
  A: number;
  /** Cumulative % in tenths, truncated (e.g. 666 = 66.6%). */
  tenths: number;
}

/**
 * Cumulative % at the end of each Mon–Sun week up to the week of min(today, end). A week in which nothing
 * was held is skipped (SPEC §4.6 fixture: [80.0, 66.6] until a mark lands in week 3).
 */
export function weeklyTrend(course: Course, courseSessions: Session[], semester: Semester, today: ISODate): TrendPoint[] {
  const overCap = overCapMedical(course, courseSessions);
  const marked = courseSessions
    .filter((s) => s.courseId === course.id && s.status !== null && isCountable(s, course))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const lastWeek = weekEnding(minDate(today, semester.endDate));
  const points: TrendPoint[] = [];
  let H = 0;
  let A = 0;
  let i = 0;
  for (let week = weekEnding(semester.startDate); week <= lastWeek; week = addDays(week, 7)) {
    let heldThisWeek = 0;
    while (i < marked.length && marked[i].date <= week) {
      const s = marked[i++];
      H++;
      heldThisWeek++;
      if (s.status === "present" || (s.status === "medical" && !overCap.has(s.key))) A++;
    }
    if (heldThisWeek > 0) points.push({ weekEnd: week, H, A, tenths: idiv(1000 * A, H) });
  }
  return points;
}

/** Weekday (1 = Mon) with the most `absent` marks across all courses; ties go to the earliest; null if none. */
export function mostSkippedWeekday(sessions: Session[]): number | null {
  const counts = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const s of sessions) if (s.status === "absent") counts[weekdayOf(s.date)]++;
  let best: number | null = null;
  for (let w = 1; w <= 7; w++) if (counts[w] > 0 && (best === null || counts[w] > counts[best])) best = w;
  return best;
}

/** Present adds 1, absent resets, medical and cancelled neither add nor reset (SPEC §4.6). */
export function streaks(sessions: Session[]): { current: number; longest: number } {
  const marked = sessions
    .filter((s) => s.status === "present" || s.status === "absent")
    .sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0));
  let current = 0;
  let longest = 0;
  for (const s of marked) {
    current = s.status === "present" ? current + 1 : 0;
    if (current > longest) longest = current;
  }
  return { current, longest };
}
