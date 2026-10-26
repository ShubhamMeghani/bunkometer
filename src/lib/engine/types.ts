import type { ISODate } from "./dates";

export type { ISODate } from "./dates";

export type Kind = "lecture" | "tutorial" | "lab";
export type Status = "present" | "absent" | "medical" | "cancelled";
export type WindowMode = "whole" | "split";
export type WindowId = "whole" | "midsem" | "endsem";
export type BudgetStatus = "none" | "safe" | "warning" | "danger";
export type PeriodKind = "holiday" | "exam" | "other";

export interface Semester {
  id: string;
  name: string;
  startDate: ISODate;
  /** Optional (SPEC v0.5): required only when a course uses split windows. */
  midsemDate: ISODate | null;
  endDate: ISODate;
  shareToken?: string | null;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  colour: string;
  requiredPct: number;
  countTutorials: boolean;
  medicalCap: number | null;
  windowMode: WindowMode;
  sortOrder: number;
}

export interface Slot {
  id: string;
  courseId: string;
  weekday: number; // 1 = Mon … 7 = Sun
  startTime: string; // HH:MM
  durationMin: number;
  kind: Kind;
  validFrom: ISODate | null;
  validTo: ISODate | null;
}

export interface NoClassPeriod {
  id: string;
  startDate: ISODate;
  endDate: ISODate;
  label: string;
  kind: PeriodKind;
}

/** A stored row: a mark on a scheduled occurrence, or an extra class (SPEC §4.2). */
export interface SessionRow {
  id: string;
  courseId: string;
  slotId: string | null;
  date: ISODate;
  startTime: string;
  durationMin: number;
  kind: Kind;
  isExtra: boolean;
  status: Status | null;
  makeupDate: ISODate | null;
  makeupDone: boolean;
}

/** Everything the screens and the engine need about the active semester. */
export interface Snapshot {
  semester: Semester;
  courses: Course[];
  slots: Slot[];
  periods: NoClassPeriod[];
  rows: SessionRow[];
}

/** One class meeting: a generated occurrence of a slot, or an extra class (SPEC §4.1). */
export interface Session {
  key: string;
  courseId: string;
  slotId: string | null;
  rowId: string | null;
  date: ISODate;
  startTime: string;
  durationMin: number;
  kind: Kind;
  isExtra: boolean;
  status: Status | null;
  makeupDate: ISODate | null;
  makeupDone: boolean;
}
