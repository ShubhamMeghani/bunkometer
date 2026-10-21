import { eachDate, maxDate, minDate, weekdayOf, type ISODate } from "./dates";
import type { NoClassPeriod, Session, SessionRow, Snapshot } from "./types";

export function scheduledKey(slotId: string, date: ISODate): string {
  return `${slotId}:${date}`;
}

export function extraKey(rowId: string): string {
  return `x:${rowId}`;
}

/** The no-class period covering `date`, if any. */
export function periodOn(date: ISODate, periods: NoClassPeriod[]): NoClassPeriod | undefined {
  return periods.find((p) => p.startDate <= date && date <= p.endDate);
}

function compareSessions(a: Session, b: Session): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.startTime !== b.startTime) return a.startTime < b.startTime ? -1 : 1;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/**
 * SPEC §4.3. Scheduled occurrences of every slot (inside the semester and the slot's validity, not on a
 * no-class day), with their stored marks, plus every extra class inside the semester. Stored rows for
 * occurrences that are no longer generated are ignored (kept, not deleted).
 */
export function generateSessions(snapshot: Snapshot): Session[] {
  const { semester, slots, periods, rows } = snapshot;
  const courseIds = new Set(snapshot.courses.map((c) => c.id));

  const blocked = new Set<ISODate>();
  for (const p of periods) {
    const from = maxDate(p.startDate, semester.startDate);
    const to = minDate(p.endDate, semester.endDate);
    if (from <= to) for (const d of eachDate(from, to)) blocked.add(d);
  }

  const marks = new Map<string, SessionRow>();
  for (const row of rows) if (row.slotId) marks.set(scheduledKey(row.slotId, row.date), row);

  const semesterDates = eachDate(semester.startDate, semester.endDate);
  const out: Session[] = [];

  for (const slot of slots) {
    if (!courseIds.has(slot.courseId)) continue;
    const from = slot.validFrom ? maxDate(slot.validFrom, semester.startDate) : semester.startDate;
    const to = slot.validTo ? minDate(slot.validTo, semester.endDate) : semester.endDate;
    for (const date of semesterDates) {
      if (date < from || date > to || blocked.has(date) || weekdayOf(date) !== slot.weekday) continue;
      const key = scheduledKey(slot.id, date);
      const row = marks.get(key);
      out.push({
        key,
        courseId: slot.courseId,
        slotId: slot.id,
        rowId: row?.id ?? null,
        date,
        startTime: slot.startTime,
        durationMin: slot.durationMin,
        kind: slot.kind,
        isExtra: false,
        status: row?.status ?? null,
        makeupDate: row?.makeupDate ?? null,
        makeupDone: row?.makeupDone ?? false,
      });
    }
  }

  for (const row of rows) {
    if (!row.isExtra || !courseIds.has(row.courseId)) continue;
    if (row.date < semester.startDate || row.date > semester.endDate) continue;
    out.push({
      key: extraKey(row.id),
      courseId: row.courseId,
      slotId: null,
      rowId: row.id,
      date: row.date,
      startTime: row.startTime,
      durationMin: row.durationMin,
      kind: row.kind,
      isExtra: true,
      status: row.status,
      makeupDate: row.makeupDate,
      makeupDone: row.makeupDone,
    });
  }

  return out.sort(compareSessions);
}

export function sessionsByCourse(sessions: Session[]): Map<string, Session[]> {
  const map = new Map<string, Session[]>();
  for (const s of sessions) {
    const list = map.get(s.courseId);
    if (list) list.push(s);
    else map.set(s.courseId, [s]);
  }
  return map;
}

export function sessionsOn(sessions: Session[], date: ISODate): Session[] {
  return sessions.filter((s) => s.date === date);
}

/** Past sessions with no mark ("N classes need marking", SPEC R20). */
export function unmarkedPast(sessions: Session[], today: ISODate): Session[] {
  return sessions.filter((s) => s.status === null && s.date < today);
}
