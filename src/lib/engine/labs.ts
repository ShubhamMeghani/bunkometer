import type { ISODate } from "./dates";
import type { BudgetStatus, Session, SessionRow, Status } from "./types";

// SPEC §4.4.5. Labs never affect a percentage; every missed lab needs a makeup (decision OQ-4).

export function needsMakeup(s: Pick<Session, "kind" | "status">): boolean {
  return s.kind === "lab" && (s.status === "absent" || s.status === "medical");
}

export function isPendingMakeup(s: Pick<Session, "kind" | "status" | "makeupDone">): boolean {
  return needsMakeup(s) && !s.makeupDone;
}

export function isOverdueMakeup(
  s: Pick<Session, "kind" | "status" | "makeupDone" | "makeupDate">,
  today: ISODate,
): boolean {
  return isPendingMakeup(s) && s.makeupDate !== null && s.makeupDate < today;
}

/** A row after a new status: makeup data survives only while the lab is still missed (SPEC R30). */
export function withStatus<T extends Pick<SessionRow, "kind" | "status" | "makeupDate" | "makeupDone">>(
  row: T,
  status: Status | null,
): T {
  const next = { ...row, status };
  if (!needsMakeup(next)) {
    next.makeupDate = null;
    next.makeupDone = false;
  }
  return next;
}

export interface LabSummary {
  total: number;
  done: number;
  missed: number;
  pending: number;
  overdue: number;
  cancelled: number;
  upcoming: number;
  status: BudgetStatus;
  pendingSessions: Session[];
}

export function labSummary(courseSessions: Session[], today: ISODate): LabSummary {
  const labs = courseSessions.filter((s) => s.kind === "lab");
  let done = 0;
  let missed = 0;
  let cancelled = 0;
  let upcoming = 0;
  const pendingSessions: Session[] = [];
  let overdue = 0;
  for (const s of labs) {
    if (s.status === "cancelled") cancelled++;
    else if (s.status === "present") done++;
    else if (needsMakeup(s)) {
      missed++;
      if (s.makeupDone) done++;
      else {
        pendingSessions.push(s);
        if (isOverdueMakeup(s, today)) overdue++;
      }
    } else if (s.date >= today) upcoming++;
  }
  const status: BudgetStatus =
    labs.length === 0 ? "none" : overdue > 0 ? "danger" : pendingSessions.length > 0 ? "warning" : "safe";
  return {
    total: labs.length - cancelled,
    done,
    missed,
    pending: pendingSessions.length,
    overdue,
    cancelled,
    upcoming,
    status,
    pendingSessions,
  };
}
