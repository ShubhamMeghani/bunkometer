import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import * as schema from "../../src/lib/db/schema";
import { testDb } from "./db";

// Builds fixture semesters straight into the dev branch (PLAN 3.5). Users are always <uuid>@e2e.test.

type Kind = "lecture" | "tutorial" | "lab";
type Status = "present" | "absent" | "medical" | "cancelled";

export interface SlotSpec {
  weekday: number;
  startTime?: string;
  durationMin?: number;
  kind?: Kind;
  validFrom?: string;
  validTo?: string;
}

export interface CourseSpec {
  code: string;
  name?: string;
  colour?: string;
  requiredPct?: number;
  countTutorials?: boolean;
  medicalCap?: number | null;
  windowMode?: "whole" | "split";
  slots: SlotSpec[];
}

export interface MarkSpec {
  course: string;
  slot?: number;
  date: string;
  status: Status;
  makeupDate?: string;
  makeupDone?: boolean;
}

export interface ExtraSpec {
  course: string;
  date: string;
  startTime?: string;
  kind?: Kind;
  status?: Status | null;
}

export interface FixtureSpec {
  name?: string;
  startDate?: string;
  /** Pass null for a semester without a midsem date. */
  midsemDate?: string | null;
  endDate?: string;
  courses: CourseSpec[];
  periods?: { startDate: string; endDate: string; label: string; kind?: "holiday" | "exam" | "other" }[];
  marks?: MarkSpec[];
  extras?: ExtraSpec[];
  active?: boolean;
}

export interface Fixture {
  userId: string;
  semesterId: string;
  courseIds: Record<string, string>;
  slotIds: Record<string, string[]>;
}

export async function ensureUser(email: string): Promise<string> {
  const [row] = await testDb()
    .insert(schema.users)
    .values({ googleId: `test:${email.toLowerCase()}`, email: email.toLowerCase(), name: `Test ${email.split("@")[0].slice(0, 8)}` })
    .onConflictDoUpdate({ target: schema.users.googleId, set: { email: email.toLowerCase() } })
    .returning({ id: schema.users.id });
  return row.id;
}

const COLOURS = ["indigo", "sky", "teal", "emerald", "lime", "amber", "orange", "rose", "pink", "violet", "cyan", "slate"];

export async function createFixture(email: string, spec: FixtureSpec): Promise<Fixture> {
  const db = testDb();
  const userId = await ensureUser(email);
  const semesterId = randomUUID();
  const courseIds: Record<string, string> = {};
  const slotIds: Record<string, string[]> = {};
  const slotInfo = new Map<string, SlotSpec>();

  await db.insert(schema.semesters).values({
    id: semesterId,
    userId,
    name: spec.name ?? "Aug–Dec 2026",
    startDate: spec.startDate ?? "2026-08-03",
    midsemDate: spec.midsemDate === undefined ? "2026-09-26" : spec.midsemDate,
    endDate: spec.endDate ?? "2026-11-28",
  });

  const courseRows = spec.courses.map((c, i) => {
    const id = randomUUID();
    courseIds[c.code] = id;
    return {
      id,
      semesterId,
      code: c.code,
      name: c.name ?? `${c.code} course`,
      colour: c.colour ?? COLOURS[i % COLOURS.length],
      requiredPct: c.requiredPct ?? 80,
      countTutorials: c.countTutorials ?? true,
      medicalCap: c.medicalCap ?? null,
      windowMode: c.windowMode ?? "whole",
      sortOrder: i,
    };
  });
  if (courseRows.length) await db.insert(schema.courses).values(courseRows);

  const slotRows = spec.courses.flatMap((c) =>
    c.slots.map((s) => {
      const id = randomUUID();
      (slotIds[c.code] ??= []).push(id);
      slotInfo.set(id, s);
      return {
        id,
        courseId: courseIds[c.code],
        weekday: s.weekday,
        startTime: s.startTime ?? "09:00",
        durationMin: s.durationMin ?? (s.kind === "lab" ? 180 : 60),
        kind: s.kind ?? "lecture",
        validFrom: s.validFrom ?? null,
        validTo: s.validTo ?? null,
      };
    }),
  );
  if (slotRows.length) await db.insert(schema.slots).values(slotRows);

  if (spec.periods?.length)
    await db.insert(schema.noClassPeriods).values(
      spec.periods.map((p) => ({ semesterId, startDate: p.startDate, endDate: p.endDate, label: p.label, kind: p.kind ?? "holiday" })),
    );

  const markRows = (spec.marks ?? []).map((m) => {
    const slotId = slotIds[m.course][m.slot ?? 0];
    const s = slotInfo.get(slotId)!;
    const kind = s.kind ?? "lecture";
    return {
      courseId: courseIds[m.course],
      slotId,
      date: m.date,
      startTime: s.startTime ?? "09:00",
      durationMin: s.durationMin ?? (kind === "lab" ? 180 : 60),
      kind,
      isExtra: false,
      status: m.status,
      makeupDate: m.makeupDate ?? null,
      makeupDone: m.makeupDone ?? false,
    };
  });
  const extraRows = (spec.extras ?? []).map((e) => ({
    courseId: courseIds[e.course],
    slotId: null,
    date: e.date,
    startTime: e.startTime ?? "10:00",
    durationMin: 60,
    kind: e.kind ?? "lecture",
    isExtra: true,
    status: e.status ?? null,
  }));
  if (markRows.length + extraRows.length) await db.insert(schema.sessions).values([...markRows, ...extraRows]);

  if (spec.active !== false) await db.update(schema.users).set({ activeSemesterId: semesterId }).where(eq(schema.users.id, userId));
  return { userId, semesterId, courseIds, slotIds };
}

export async function sessionRowsFor(courseId: string) {
  return testDb().select().from(schema.sessions).where(eq(schema.sessions.courseId, courseId));
}

export async function setShareToken(semesterId: string, token: string | null) {
  await testDb().update(schema.semesters).set({ shareToken: token }).where(eq(schema.semesters.id, semesterId));
}
