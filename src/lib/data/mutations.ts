import { eachDate, maxDate, minDate, weekdayOf, type ISODate } from "@/lib/engine/dates";
import { needsMakeup, withStatus } from "@/lib/engine/labs";
import { generateSessions, periodOn } from "@/lib/engine/sessions";
import type { Course, Session, SessionRow, Slot, Snapshot } from "@/lib/engine/types";
import { LIMITS, type Mutation, type NewSemester, type Target } from "./schemas";

// One pure reducer for every change. The optimistic UI, the demo store and the server all use it;
// the server then writes only the resulting row-level diff (SPEC R3, C7).

export type NewId = () => string;

export const SPLIT_NEEDS_MIDSEM = "Split windows need a midsem date. Add one to the semester first.";

/** SPEC R52: the midsem date can't be removed while courses still use split windows. */
export function midsemRemovalBlock(courses: Pick<Course, "code" | "windowMode">[]): string | null {
  const split = courses.filter((c) => c.windowMode === "split").map((c) => c.code);
  if (split.length === 0) return null;
  const list = split.length === 1 ? split[0] : `${split.slice(0, -1).join(", ")} and ${split[split.length - 1]}`;
  return `${list} ${split.length === 1 ? "uses" : "use"} split midsem/endsem windows. Switch ${split.length === 1 ? "it" : "them"} to whole semester first, or keep the midsem date.`;
}

/** True when `slot` really meets on `date` (inside the semester and validity, not a no-class day). */
export function isOccurrence(snap: Snapshot, slot: Slot, date: ISODate): boolean {
  const { semester } = snap;
  const from = slot.validFrom ? maxDate(slot.validFrom, semester.startDate) : semester.startDate;
  const to = slot.validTo ? minDate(slot.validTo, semester.endDate) : semester.endDate;
  return date >= from && date <= to && weekdayOf(date) === slot.weekday && !periodOn(date, snap.periods);
}

function findSlot(snap: Snapshot, slotId: string): Slot | undefined {
  return snap.slots.find((s) => s.id === slotId);
}

function findRowForTarget(snap: Snapshot, target: Target): SessionRow | undefined {
  return target.by === "row"
    ? snap.rows.find((r) => r.id === target.rowId)
    : snap.rows.find((r) => r.slotId === target.slotId && r.date === target.date);
}

/** The session a target points at, as it stands now. */
export function sessionForTarget(snap: Snapshot, target: Target): Pick<Session, "courseId" | "date" | "kind" | "status" | "makeupDate" | "makeupDone"> | null {
  if (target.by === "row") {
    const row = snap.rows.find((r) => r.id === target.rowId && r.isExtra);
    return row ?? null;
  }
  const slot = findSlot(snap, target.slotId);
  if (!slot || !isOccurrence(snap, slot, target.date)) return null;
  const row = findRowForTarget(snap, target);
  return {
    courseId: slot.courseId,
    date: target.date,
    kind: slot.kind,
    status: row?.status ?? null,
    makeupDate: row?.makeupDate ?? null,
    makeupDone: row?.makeupDone ?? false,
  };
}

export function marksForCourse(snap: Snapshot, courseId: string): number {
  return snap.rows.filter((r) => r.courseId === courseId && r.status !== null).length;
}

export function marksForSlot(snap: Snapshot, slotId: string): number {
  return snap.rows.filter((r) => r.slotId === slotId && r.status !== null).length;
}

/** Sessions a bulk mark would touch: every session of the chosen courses dated inside the range. */
export function bulkTargets(snap: Snapshot, from: ISODate, to: ISODate, courseIds: string[], sessions = generateSessions(snap)): Session[] {
  const set = new Set(courseIds);
  return sessions.filter((s) => set.has(s.courseId) && s.date >= from && s.date <= to);
}

/**
 * Checks that need the current data. Returns a user-facing message, or null when the change is allowed.
 * IDs that are not in the snapshot are reported as "Not found", so another user's records are never touched.
 */
export function validateMutation(snap: Snapshot, m: Mutation, today: ISODate): string | null {
  const courseIds = new Set(snap.courses.map((c) => c.id));
  const { semester } = snap;
  switch (m.type) {
    case "mark": {
      const s = sessionForTarget(snap, m.target);
      if (!s) return "Not found";
      if (m.status === "present" && s.date > today) return "You can't mark a future class present";
      return null;
    }
    case "makeup": {
      const s = sessionForTarget(snap, m.target);
      if (!s) return "Not found";
      if (!needsMakeup(s)) return "Only a missed lab can have a makeup";
      return null;
    }
    case "saveExtra": {
      const e = m.extra;
      if (!courseIds.has(e.courseId)) return "Not found";
      const existing = snap.rows.find((r) => r.id === e.id);
      if (existing && (!existing.isExtra || existing.courseId !== e.courseId)) return "Not found";
      if (e.date < semester.startDate || e.date > semester.endDate) return "Pick a date inside the semester";
      if (e.status === "present" && e.date > today) return "You can't mark a future class present";
      if (!existing && snap.rows.filter((r) => r.isExtra && r.courseId === e.courseId).length >= LIMITS.extrasPerCourse)
        return `At most ${LIMITS.extrasPerCourse} extra classes per course`;
      return null;
    }
    case "deleteExtra":
      return snap.rows.some((r) => r.id === m.rowId && r.isExtra) ? null : "Not found";
    case "saveSemester":
      return m.semester.midsemDate === null ? midsemRemovalBlock(snap.courses) : null;
    case "saveCourse": {
      const c = m.course;
      if (c.windowMode === "split" && semester.midsemDate === null) return SPLIT_NEEDS_MIDSEM;
      const isNew = !courseIds.has(c.id);
      if (isNew && snap.courses.length >= LIMITS.coursesPerSemester)
        return `At most ${LIMITS.coursesPerSemester} courses per semester`;
      const clash = snap.courses.some((o) => o.id !== c.id && o.code.trim().toLowerCase() === c.code.trim().toLowerCase());
      return clash ? "Another course already uses this code" : null;
    }
    case "deleteCourse":
      return courseIds.has(m.courseId) ? null : "Not found";
    case "saveSlot": {
      const s = m.slot;
      if (!courseIds.has(s.courseId)) return "Not found";
      const existing = snap.slots.find((o) => o.id === s.id);
      if (existing && existing.courseId !== s.courseId) return "Not found";
      if (!existing && snap.slots.filter((o) => o.courseId === s.courseId).length >= LIMITS.slotsPerCourse)
        return `At most ${LIMITS.slotsPerCourse} slots per course`;
      return null;
    }
    case "deleteSlot":
      return snap.slots.some((s) => s.id === m.slotId) ? null : "Not found";
    case "savePeriod": {
      const isNew = !snap.periods.some((p) => p.id === m.period.id);
      return isNew && snap.periods.length >= LIMITS.periodsPerSemester
        ? `At most ${LIMITS.periodsPerSemester} no-class periods`
        : null;
    }
    case "deletePeriod":
      return snap.periods.some((p) => p.id === m.periodId) ? null : "Not found";
    case "bulkMark": {
      if (m.from > m.to) return "Start date must be on or before end date";
      if (m.courseIds.some((id) => !courseIds.has(id))) return "Not found";
      if (m.to < semester.startDate || m.from > semester.endDate) return "Pick dates inside the semester";
      return null;
    }
  }
}

function setMark(snap: Snapshot, target: Target, status: SessionRow["status"], newId: NewId): SessionRow[] {
  if (target.by === "row") {
    return snap.rows.map((r) => (r.id === target.rowId ? withStatus(r, status) : r));
  }
  const slot = findSlot(snap, target.slotId);
  if (!slot) return snap.rows;
  const existing = findRowForTarget(snap, target);
  if (status === null) return existing ? snap.rows.filter((r) => r !== existing) : snap.rows;
  const base: SessionRow = existing ?? {
    id: newId(),
    courseId: slot.courseId,
    slotId: slot.id,
    date: target.date,
    startTime: slot.startTime,
    durationMin: slot.durationMin,
    kind: slot.kind,
    isExtra: false,
    status: null,
    makeupDate: null,
    makeupDone: false,
  };
  const next = withStatus({ ...base, startTime: slot.startTime, durationMin: slot.durationMin, kind: slot.kind }, status);
  return existing ? snap.rows.map((r) => (r === existing ? next : r)) : [...snap.rows, next];
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

/** Applies a validated mutation. Pure: returns a new snapshot. */
export function applyMutation(snap: Snapshot, m: Mutation, newId: NewId): Snapshot {
  switch (m.type) {
    case "mark":
      return { ...snap, rows: setMark(snap, m.target, m.status, newId) };
    case "makeup": {
      const row = findRowForTarget(snap, m.target);
      if (!row) return snap;
      const next = { ...row, makeupDate: m.makeupDate, makeupDone: m.makeupDone };
      return { ...snap, rows: snap.rows.map((r) => (r === row ? next : r)) };
    }
    case "saveExtra": {
      const e = m.extra;
      const existing = snap.rows.find((r) => r.id === e.id);
      const base: SessionRow = {
        id: e.id,
        courseId: e.courseId,
        slotId: null,
        date: e.date,
        startTime: e.startTime,
        durationMin: e.durationMin,
        kind: e.kind,
        isExtra: true,
        status: existing?.status ?? null,
        makeupDate: existing?.makeupDate ?? null,
        makeupDone: existing?.makeupDone ?? false,
      };
      return { ...snap, rows: upsert(snap.rows, withStatus(base, e.status)) };
    }
    case "deleteExtra":
      return { ...snap, rows: snap.rows.filter((r) => r.id !== m.rowId) };
    case "saveSemester":
      return { ...snap, semester: { ...snap.semester, ...m.semester } };
    case "saveCourse": {
      const c = { ...m.course, code: m.course.code.trim(), name: m.course.name.trim() };
      return { ...snap, courses: upsert(snap.courses, c) };
    }
    case "deleteCourse":
      return {
        ...snap,
        courses: snap.courses.filter((c) => c.id !== m.courseId),
        slots: snap.slots.filter((s) => s.courseId !== m.courseId),
        rows: snap.rows.filter((r) => r.courseId !== m.courseId),
      };
    case "saveSlot":
      return { ...snap, slots: upsert(snap.slots, m.slot) };
    case "deleteSlot":
      return {
        ...snap,
        slots: snap.slots.filter((s) => s.id !== m.slotId),
        rows: snap.rows.filter((r) => r.slotId !== m.slotId),
      };
    case "savePeriod":
      return { ...snap, periods: upsert(snap.periods, { ...m.period, label: m.period.label.trim() }) };
    case "deletePeriod":
      return { ...snap, periods: snap.periods.filter((p) => p.id !== m.periodId) };
    case "bulkMark": {
      let next = snap;
      for (const s of bulkTargets(snap, m.from, m.to, m.courseIds)) {
        const target: Target = s.slotId ? { by: "slot", slotId: s.slotId, date: s.date } : { by: "row", rowId: s.rowId! };
        next = { ...next, rows: setMark(next, target, m.status, newId) };
      }
      return next;
    }
  }
}

/** Cross-checks for a whole new semester (setup wizard and import). Returns a message or null. */
export function validateNewSemester(input: NewSemester): string | null {
  if (input.semester.midsemDate === null && input.courses.some((c) => c.windowMode === "split")) return SPLIT_NEEDS_MIDSEM;
  const codes = new Set<string>();
  for (const c of input.courses) {
    const code = c.code.trim().toLowerCase();
    if (codes.has(code)) return `Two courses use the code ${c.code.trim()}`;
    codes.add(code);
  }
  const ids = new Set(input.courses.map((c) => c.id));
  for (const s of input.slots) if (!ids.has(s.courseId)) return "A timetable slot belongs to no course";
  for (const id of ids)
    if (input.slots.filter((s) => s.courseId === id).length > LIMITS.slotsPerCourse)
      return `At most ${LIMITS.slotsPerCourse} slots per course`;
  return null;
}

/** All dates inside the semester that the given range covers (for range pickers). */
export function clipToSemester(snap: Snapshot, from: ISODate, to: ISODate): ISODate[] {
  const a = maxDate(from, snap.semester.startDate);
  const b = minDate(to, snap.semester.endDate);
  return a <= b ? eachDate(a, b) : [];
}
