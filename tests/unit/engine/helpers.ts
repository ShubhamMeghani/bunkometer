import { addDays, type ISODate } from "@/lib/engine/dates";
import type { Course, Kind, Semester, Session, Status } from "@/lib/engine/types";

export const SEM: Semester = {
  id: "sem",
  name: "Test",
  startDate: "2026-08-03",
  midsemDate: "2026-09-26",
  endDate: "2026-11-28",
};

export function course(overrides: Partial<Course> = {}): Course {
  return {
    id: "c1",
    code: "MA 211",
    name: "Real Analysis",
    colour: "indigo",
    requiredPct: 80,
    countTutorials: true,
    medicalCap: null,
    windowMode: "whole",
    sortOrder: 0,
    ...overrides,
  };
}

let seq = 0;

export function session(date: ISODate, status: Status | null, extra: Partial<Session> = {}): Session {
  seq += 1;
  return {
    key: `k${seq}`,
    courseId: "c1",
    slotId: null,
    rowId: null,
    date,
    startTime: "09:00",
    durationMin: 60,
    kind: "lecture",
    isExtra: false,
    status,
    makeupDate: null,
    makeupDone: false,
    ...extra,
  };
}

/** One session per day from `start`, with the given statuses. */
export function series(start: ISODate, statuses: (Status | null)[], kind: Kind = "lecture", courseId = "c1"): Session[] {
  return statuses.map((st, i) => session(addDays(start, i), st, { kind, courseId }));
}

export function repeat<T>(value: T, n: number): T[] {
  return Array.from({ length: n }, () => value);
}
