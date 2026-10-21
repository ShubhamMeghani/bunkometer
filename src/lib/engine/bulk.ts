import type { ISODate } from "./dates";
import type { Session, Status } from "./types";

// SPEC R34: preview of "Mark a range" before it is applied.

export interface BulkPreview {
  sessions: number;
  overwritten: number;
}

/** Sessions of the chosen courses dated in [from, to], and how many existing marks would change. */
export function bulkPreview(
  sessions: Session[],
  from: ISODate,
  to: ISODate,
  courseIds: string[],
  status: Extract<Status, "absent" | "medical">,
): BulkPreview {
  const chosen = new Set(courseIds);
  const targets = sessions.filter((s) => chosen.has(s.courseId) && s.date >= from && s.date <= to);
  return {
    sessions: targets.length,
    overwritten: targets.filter((s) => s.status !== null && s.status !== status).length,
  };
}
