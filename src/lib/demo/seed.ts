import type { ISODate } from "@/lib/engine/dates";
import { generateSessions } from "@/lib/engine/sessions";
import type { Course, Kind, SessionRow, Slot, Snapshot, Status } from "@/lib/engine/types";

// SPEC §4.8: a realistic Aug–Dec semester at a fixed demo date (decision OQ-10). Deterministic: no randomness.

export const DEMO_TODAY: ISODate = "2026-10-21"; // Wednesday

let counter = 0;
function id(): string {
  counter += 1;
  return `00000000-0000-4000-8000-${counter.toString(16).padStart(12, "0")}`;
}

interface CourseDef {
  course: Omit<Course, "id" | "sortOrder">;
  slots: { weekday: number; startTime: string; durationMin: number; kind: Kind }[];
  /** Overrides for past sessions; everything else in the past is Present. */
  marks: Record<ISODate, Status>;
  makeups?: Record<ISODate, { makeupDate: ISODate | null; makeupDone: boolean }>;
  extras?: { date: ISODate; startTime: string; kind: Kind; status: Status }[];
}

const COURSES: CourseDef[] = [
  {
    course: { code: "MA 211", name: "Real Analysis", colour: "indigo", requiredPct: 80, countTutorials: true, medicalCap: null, windowMode: "split" },
    slots: [
      { weekday: 1, startTime: "09:00", durationMin: 60, kind: "lecture" },
      { weekday: 3, startTime: "09:00", durationMin: 60, kind: "lecture" },
      { weekday: 5, startTime: "09:00", durationMin: 60, kind: "lecture" },
      { weekday: 4, startTime: "14:00", durationMin: 60, kind: "tutorial" },
    ],
    marks: { "2026-08-10": "absent", "2026-08-26": "absent", "2026-09-11": "absent", "2026-10-07": "medical" },
  },
  {
    course: { code: "PH 203", name: "Electromagnetism", colour: "rose", requiredPct: 80, countTutorials: true, medicalCap: null, windowMode: "split" },
    slots: [
      { weekday: 2, startTime: "10:00", durationMin: 90, kind: "lecture" },
      { weekday: 4, startTime: "10:00", durationMin: 90, kind: "lecture" },
    ],
    marks: {
      "2026-08-13": "absent",
      "2026-09-08": "absent",
      "2026-09-29": "absent",
      "2026-10-01": "absent",
      "2026-10-06": "absent",
    },
  },
  {
    course: { code: "CH 201", name: "Physical Chemistry", colour: "teal", requiredPct: 75, countTutorials: false, medicalCap: 3, windowMode: "whole" },
    slots: [
      { weekday: 1, startTime: "11:00", durationMin: 60, kind: "lecture" },
      { weekday: 3, startTime: "11:00", durationMin: 60, kind: "lecture" },
      { weekday: 5, startTime: "15:00", durationMin: 60, kind: "tutorial" },
    ],
    marks: {
      "2026-08-17": "absent",
      "2026-08-21": "absent",
      "2026-08-26": "absent",
      "2026-09-09": "absent",
      "2026-09-18": "absent",
      "2026-09-28": "medical",
      "2026-09-30": "medical",
      "2026-10-05": "absent",
      "2026-10-12": "absent",
      "2026-10-14": "absent",
    },
  },
  {
    course: { code: "CS 201", name: "Data Structures", colour: "amber", requiredPct: 80, countTutorials: true, medicalCap: null, windowMode: "whole" },
    slots: [
      { weekday: 2, startTime: "14:00", durationMin: 60, kind: "lecture" },
      { weekday: 4, startTime: "15:30", durationMin: 60, kind: "lecture" },
      { weekday: 3, startTime: "14:00", durationMin: 180, kind: "lab" },
    ],
    marks: { "2026-08-20": "absent", "2026-10-13": "absent", "2026-09-16": "absent", "2026-10-14": "absent" },
    makeups: {
      "2026-09-16": { makeupDate: "2026-09-19", makeupDone: true },
      "2026-10-14": { makeupDate: null, makeupDone: false },
    },
  },
  {
    course: { code: "HS 201", name: "Introduction to Economics", colour: "violet", requiredPct: 70, countTutorials: true, medicalCap: null, windowMode: "whole" },
    slots: [
      { weekday: 1, startTime: "16:00", durationMin: 60, kind: "lecture" },
      { weekday: 5, startTime: "16:00", durationMin: 60, kind: "lecture" },
    ],
    marks: { "2026-08-28": "cancelled", "2026-08-31": "absent", "2026-09-18": "absent", "2026-10-12": "absent" },
    extras: [{ date: "2026-09-12", startTime: "16:00", kind: "lecture", status: "present" }],
  },
];

export function demoSeed(): Snapshot {
  counter = 0;
  const semester = {
    id: id(),
    name: "Aug–Dec 2026 (demo)",
    startDate: "2026-08-03",
    midsemDate: "2026-09-26",
    endDate: "2026-11-28",
    shareToken: null,
  };
  const periods = [
    { id: id(), startDate: "2026-08-15", endDate: "2026-08-15", label: "Independence Day", kind: "holiday" as const },
    { id: id(), startDate: "2026-09-21", endDate: "2026-09-26", label: "Midsem exams", kind: "exam" as const },
    { id: id(), startDate: "2026-10-02", endDate: "2026-10-02", label: "Gandhi Jayanti", kind: "holiday" as const },
  ];
  const courses: Course[] = [];
  const slots: Slot[] = [];
  const extras: SessionRow[] = [];
  COURSES.forEach((def, i) => {
    const course: Course = { ...def.course, id: id(), sortOrder: i };
    courses.push(course);
    for (const s of def.slots) slots.push({ ...s, id: id(), courseId: course.id, validFrom: null, validTo: null });
    for (const e of def.extras ?? [])
      extras.push({
        id: id(),
        courseId: course.id,
        slotId: null,
        date: e.date,
        startTime: e.startTime,
        durationMin: 60,
        kind: e.kind,
        isExtra: true,
        status: e.status,
        makeupDate: null,
        makeupDone: false,
      });
  });

  const base: Snapshot = { semester, courses, slots, periods, rows: extras };
  const rows: SessionRow[] = [...extras];
  for (const s of generateSessions(base)) {
    if (s.isExtra || s.date >= DEMO_TODAY) continue;
    const def = COURSES[courses.findIndex((c) => c.id === s.courseId)];
    const status = def.marks[s.date] ?? "present";
    const makeup = s.kind === "lab" ? def.makeups?.[s.date] : undefined;
    rows.push({
      id: id(),
      courseId: s.courseId,
      slotId: s.slotId,
      date: s.date,
      startTime: s.startTime,
      durationMin: s.durationMin,
      kind: s.kind,
      isExtra: false,
      status,
      makeupDate: makeup?.makeupDate ?? null,
      makeupDone: makeup?.makeupDone ?? false,
    });
  }
  return { ...base, rows };
}
