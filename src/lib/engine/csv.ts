import { isCountable, windowIdOf } from "./budget";
import { weekdayName, weekdayOf, type ISODate } from "./dates";
import type { Course, Semester, Session } from "./types";

// SPEC §4.7: RFC 4180, CRLF, quoting, and a guard against spreadsheet formulas.

export const CSV_HEADER =
  "date,weekday,course_code,course_name,kind,start_time,duration_min,status,extra,window,counts,makeup_date,makeup_done";

export function csvField(value: string): string {
  let v = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function slugify(name: string): string {
  return (
    name
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "semester"
  );
}

export function csvFilename(semesterName: string, today: ISODate): string {
  return `bunkometer-${slugify(semesterName)}-${today}.csv`;
}

/** Every session dated ≤ today, plus later sessions that have a mark; by date, start time, course code. */
export function buildCsv(semester: Semester, courses: Course[], sessions: Session[], today: ISODate): string {
  const byId = new Map(courses.map((c) => [c.id, c]));
  const rows = sessions
    .filter((s) => byId.has(s.courseId) && (s.date <= today || s.status !== null))
    .map((s) => ({ s, c: byId.get(s.courseId)! }))
    .sort(
      (a, b) =>
        (a.s.date < b.s.date ? -1 : a.s.date > b.s.date ? 1 : 0) ||
        (a.s.startTime < b.s.startTime ? -1 : a.s.startTime > b.s.startTime ? 1 : 0) ||
        (a.c.code < b.c.code ? -1 : a.c.code > b.c.code ? 1 : 0),
    );
  const lines = [CSV_HEADER];
  for (const { s, c } of rows) {
    const lab = s.kind === "lab";
    lines.push(
      [
        s.date,
        weekdayName(weekdayOf(s.date)),
        c.code,
        c.name,
        s.kind,
        s.startTime,
        String(s.durationMin),
        s.status ?? "unmarked",
        s.isExtra ? "yes" : "no",
        windowIdOf(s.date, c, semester),
        isCountable(s, c) ? "yes" : "no",
        lab ? (s.makeupDate ?? "") : "",
        lab ? (s.makeupDone ? "yes" : "no") : "",
      ]
        .map(csvField)
        .join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}
