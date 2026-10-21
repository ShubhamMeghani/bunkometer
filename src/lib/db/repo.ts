import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { SnapshotDiff } from "@/lib/data/diff";
import type { NewSemester } from "@/lib/data/schemas";
import type { Course, NoClassPeriod, SessionRow, Slot, Snapshot } from "@/lib/engine/types";
import { getDb } from "./client";
import { courses, noClassPeriods, semesters, sessions, slots, users } from "./schema";

// Every query here is scoped to the signed-in user's own records (SPEC R3).

const hhmm = (t: string) => t.slice(0, 5);

type Batch = [BatchItem<"pg">, ...BatchItem<"pg">[]];

async function runBatch(items: BatchItem<"pg">[]): Promise<void> {
  if (items.length === 0) return;
  await getDb().batch(items as Batch);
}

export async function listSemesters(userId: string) {
  return getDb()
    .select({ id: semesters.id, name: semesters.name, startDate: semesters.startDate, endDate: semesters.endDate })
    .from(semesters)
    .where(eq(semesters.userId, userId))
    .orderBy(desc(semesters.startDate), desc(semesters.createdAt));
}

/** The user's semester with everything in it, or null when it doesn't exist or isn't theirs. */
export async function loadSnapshot(userId: string, semesterId: string): Promise<Snapshot | null> {
  const db = getDb();
  const [sem, courseRows, slotRows, periodRows, sessionRows] = await db.batch([
    db
      .select()
      .from(semesters)
      .where(and(eq(semesters.id, semesterId), eq(semesters.userId, userId)))
      .limit(1),
    db.select().from(courses).where(eq(courses.semesterId, semesterId)).orderBy(asc(courses.sortOrder), asc(courses.code)),
    db
      .select({ slot: slots })
      .from(slots)
      .innerJoin(courses, eq(courses.id, slots.courseId))
      .where(eq(courses.semesterId, semesterId)),
    db.select().from(noClassPeriods).where(eq(noClassPeriods.semesterId, semesterId)).orderBy(asc(noClassPeriods.startDate)),
    db
      .select({ row: sessions })
      .from(sessions)
      .innerJoin(courses, eq(courses.id, sessions.courseId))
      .where(eq(courses.semesterId, semesterId)),
  ]);
  const s = sem[0];
  if (!s) return null;
  return {
    semester: {
      id: s.id,
      name: s.name,
      startDate: s.startDate,
      midsemDate: s.midsemDate,
      endDate: s.endDate,
      shareToken: s.shareToken,
    },
    courses: courseRows.map(
      (c): Course => ({
        id: c.id,
        code: c.code,
        name: c.name,
        colour: c.colour,
        requiredPct: c.requiredPct,
        countTutorials: c.countTutorials,
        medicalCap: c.medicalCap,
        windowMode: c.windowMode,
        sortOrder: c.sortOrder,
      }),
    ),
    slots: slotRows.map(
      ({ slot }): Slot => ({
        id: slot.id,
        courseId: slot.courseId,
        weekday: slot.weekday,
        startTime: hhmm(slot.startTime),
        durationMin: slot.durationMin,
        kind: slot.kind,
        validFrom: slot.validFrom,
        validTo: slot.validTo,
      }),
    ),
    periods: periodRows.map(
      (p): NoClassPeriod => ({ id: p.id, startDate: p.startDate, endDate: p.endDate, label: p.label, kind: p.kind }),
    ),
    rows: sessionRows.map(
      ({ row }): SessionRow => ({
        id: row.id,
        courseId: row.courseId,
        slotId: row.slotId,
        date: row.date,
        startTime: hhmm(row.startTime),
        durationMin: row.durationMin,
        kind: row.kind,
        isExtra: row.isExtra,
        status: row.status,
        makeupDate: row.makeupDate,
        makeupDone: row.makeupDone,
      }),
    ),
  };
}

/** Writes a diff produced by applyMutation on the user's own snapshot, in one transaction. */
export async function writeDiff(userId: string, semesterId: string, after: Snapshot, d: SnapshotDiff): Promise<void> {
  const db = getDb();
  const items: BatchItem<"pg">[] = [];
  const now = new Date();

  if (d.semesterChanged) {
    const s = after.semester;
    items.push(
      db
        .update(semesters)
        .set({ name: s.name, startDate: s.startDate, midsemDate: s.midsemDate, endDate: s.endDate, updatedAt: now })
        .where(and(eq(semesters.id, semesterId), eq(semesters.userId, userId))),
    );
  }
  for (const c of d.courses.added) items.push(db.insert(courses).values({ ...c, semesterId }));
  for (const c of d.courses.changed) {
    const { id, ...rest } = c;
    items.push(db.update(courses).set(rest).where(and(eq(courses.id, id), eq(courses.semesterId, semesterId))));
  }
  for (const s of d.slots.added) items.push(db.insert(slots).values(s));
  for (const s of d.slots.changed) {
    const { id, ...rest } = s;
    items.push(db.update(slots).set(rest).where(eq(slots.id, id)));
  }
  for (const p of d.periods.added) items.push(db.insert(noClassPeriods).values({ ...p, semesterId }));
  for (const p of d.periods.changed) {
    const { id, ...rest } = p;
    items.push(
      db.update(noClassPeriods).set(rest).where(and(eq(noClassPeriods.id, id), eq(noClassPeriods.semesterId, semesterId))),
    );
  }
  if (d.rows.removed.length) items.push(db.delete(sessions).where(inArray(sessions.id, d.rows.removed.map((r) => r.id))));
  for (const r of d.rows.added) items.push(db.insert(sessions).values({ ...r, updatedAt: now }));
  for (const r of d.rows.changed) {
    const { id, ...rest } = r;
    items.push(db.update(sessions).set({ ...rest, updatedAt: now }).where(eq(sessions.id, id)));
  }
  if (d.slots.removed.length) items.push(db.delete(slots).where(inArray(slots.id, d.slots.removed.map((s) => s.id))));
  if (d.courses.removed.length)
    items.push(
      db
        .delete(courses)
        .where(and(eq(courses.semesterId, semesterId), inArray(courses.id, d.courses.removed.map((c) => c.id)))),
    );
  if (d.periods.removed.length)
    items.push(
      db
        .delete(noClassPeriods)
        .where(
          and(eq(noClassPeriods.semesterId, semesterId), inArray(noClassPeriods.id, d.periods.removed.map((p) => p.id))),
        ),
    );
  await runBatch(items);
}

export async function countSemesters(userId: string): Promise<number> {
  const rows = await getDb().select({ id: semesters.id }).from(semesters).where(eq(semesters.userId, userId));
  return rows.length;
}

/** Inserts a complete new semester and makes it the active one, in one transaction. */
export async function insertSemester(userId: string, semesterId: string, input: NewSemester): Promise<void> {
  const db = getDb();
  const items: BatchItem<"pg">[] = [
    db.insert(semesters).values({ id: semesterId, userId, ...input.semester }),
    ...input.courses.map((c) => db.insert(courses).values({ ...c, semesterId })),
    ...input.slots.map((s) => db.insert(slots).values(s)),
    ...input.periods.map((p) => db.insert(noClassPeriods).values({ ...p, semesterId })),
    db.update(users).set({ activeSemesterId: semesterId }).where(eq(users.id, userId)),
  ];
  await runBatch(items);
}

/** Switches the active semester; false when it isn't the user's. */
export async function setActiveSemester(userId: string, semesterId: string): Promise<boolean> {
  const db = getDb();
  const owned = await db
    .select({ id: semesters.id })
    .from(semesters)
    .where(and(eq(semesters.id, semesterId), eq(semesters.userId, userId)))
    .limit(1);
  if (!owned[0]) return false;
  await db.update(users).set({ activeSemesterId: semesterId }).where(eq(users.id, userId));
  return true;
}
