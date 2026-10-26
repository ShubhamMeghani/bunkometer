import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import type { NewSemester } from "@/lib/data/schemas";
import { getDb } from "./client";
import { insertSemester } from "./repo";
import { courses, noClassPeriods, semesters, slots } from "./schema";

// SPEC R39–R41. A template carries dates, no-class periods, courses, rules and timetable: never marks,
// never the owner's name or email. The link shows the owner's current timetable (decision OQ-9).

export async function publishShare(userId: string, semesterId: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ token: semesters.shareToken })
    .from(semesters)
    .where(and(eq(semesters.id, semesterId), eq(semesters.userId, userId)))
    .limit(1);
  if (!row) return null;
  if (row.token) return row.token;
  const token = randomBytes(16).toString("base64url"); // 128 bits
  await db.update(semesters).set({ shareToken: token }).where(and(eq(semesters.id, semesterId), eq(semesters.userId, userId)));
  return token;
}

export async function revokeShare(userId: string, semesterId: string): Promise<boolean> {
  const rows = await getDb()
    .update(semesters)
    .set({ shareToken: null })
    .where(and(eq(semesters.id, semesterId), eq(semesters.userId, userId)))
    .returning({ id: semesters.id });
  return rows.length > 0;
}

export interface Template {
  semester: { name: string; startDate: string; midsemDate: string | null; endDate: string };
  courses: NewSemester["courses"];
  slots: NewSemester["slots"];
  periods: NewSemester["periods"];
}

export async function loadTemplate(token: string): Promise<Template | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const db = getDb();
  const [sem] = await db.select().from(semesters).where(eq(semesters.shareToken, token)).limit(1);
  if (!sem) return null;
  const [courseRows, slotRows, periodRows] = await db.batch([
    db.select().from(courses).where(eq(courses.semesterId, sem.id)).orderBy(asc(courses.sortOrder), asc(courses.code)),
    db.select({ slot: slots }).from(slots).innerJoin(courses, eq(courses.id, slots.courseId)).where(eq(courses.semesterId, sem.id)),
    db.select().from(noClassPeriods).where(eq(noClassPeriods.semesterId, sem.id)).orderBy(asc(noClassPeriods.startDate)),
  ]);
  return {
    semester: { name: sem.name, startDate: sem.startDate, midsemDate: sem.midsemDate, endDate: sem.endDate },
    courses: courseRows.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      colour: c.colour,
      requiredPct: c.requiredPct,
      countTutorials: c.countTutorials,
      medicalCap: c.medicalCap,
      windowMode: c.windowMode,
      sortOrder: c.sortOrder,
    })),
    slots: slotRows.map(({ slot }) => ({
      id: slot.id,
      courseId: slot.courseId,
      weekday: slot.weekday,
      startTime: slot.startTime.slice(0, 5),
      durationMin: slot.durationMin,
      kind: slot.kind,
      validFrom: slot.validFrom,
      validTo: slot.validTo,
    })),
    periods: periodRows.map((p) => ({ id: p.id, startDate: p.startDate, endDate: p.endDate, label: p.label, kind: p.kind })),
  };
}

/** Copies a template into a new, independent semester for the user, with fresh IDs and no marks (SPEC R40). */
export async function importTemplate(userId: string, template: Template): Promise<void> {
  const courseIds = new Map(template.courses.map((c) => [c.id, randomUUID()]));
  const input: NewSemester = {
    semester: template.semester,
    courses: template.courses.map((c) => ({ ...c, id: courseIds.get(c.id)! })),
    slots: template.slots.map((s) => ({ ...s, id: randomUUID(), courseId: courseIds.get(s.courseId)! })),
    periods: template.periods.map((p) => ({ ...p, id: randomUUID() })),
  };
  await insertSemester(userId, randomUUID(), input);
}
