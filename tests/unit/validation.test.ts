import { describe, expect, it } from "vitest";
import { validateMutation, validateNewSemester } from "@/lib/data/mutations";
import { COURSE_DEFAULTS, courseSchema, nextColour, semesterSchema, slotSchema } from "@/lib/data/schemas";
import type { Snapshot } from "@/lib/engine/types";

// AC-15 (R8, R9, R19)
const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const sem = { name: "Aug–Dec 2026", startDate: "2026-08-03", midsemDate: "2026-09-26", endDate: "2026-11-28" };

function fieldsWithErrors(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.success ? [] : result.error!.issues.map((i) => i.path.join("."));
}

describe("AC-15 semester validation", () => {
  it("accepts a valid semester", () => {
    expect(semesterSchema.safeParse(sem).success).toBe(true);
  });
  it("rejects midsem equal to start, on the midsem field", () => {
    expect(fieldsWithErrors(semesterSchema.safeParse({ ...sem, midsemDate: sem.startDate }))).toEqual(["midsemDate"]);
  });
  it("rejects midsem equal to end, on the end field", () => {
    expect(fieldsWithErrors(semesterSchema.safeParse({ ...sem, midsemDate: sem.endDate }))).toEqual(["endDate"]);
  });
  it("rejects a 367-day span and accepts 366", () => {
    const r = semesterSchema.safeParse({ ...sem, startDate: "2026-01-01", midsemDate: "2026-06-01", endDate: "2027-01-03" });
    expect(fieldsWithErrors(r)).toEqual(["endDate"]);
    expect(semesterSchema.safeParse({ ...sem, startDate: "2026-01-01", midsemDate: "2026-06-01", endDate: "2027-01-02" }).success).toBe(true);
  });
});

const course = { id: ID(1), code: "MA 211", name: "Real Analysis", colour: "indigo", sortOrder: 0, ...COURSE_DEFAULTS };

describe("AC-15 course validation", () => {
  it("new-course defaults equal the preset: 80%, tutorials count, no cap, whole semester", () => {
    expect(COURSE_DEFAULTS).toEqual({ requiredPct: 80, countTutorials: true, medicalCap: null, windowMode: "whole" });
    expect(courseSchema.safeParse(course).success).toBe(true);
  });
  it("rejects required % of 101 and 79.5, and a medical cap of 100", () => {
    expect(courseSchema.safeParse({ ...course, requiredPct: 101 }).success).toBe(false);
    expect(courseSchema.safeParse({ ...course, requiredPct: 79.5 }).success).toBe(false);
    expect(courseSchema.safeParse({ ...course, medicalCap: 100 }).success).toBe(false);
    expect(courseSchema.safeParse({ ...course, medicalCap: 99 }).success).toBe(true);
  });
  it("rejects a duplicate course code, case-insensitively", () => {
    const base = { semester: sem, slots: [], periods: [] };
    const dup = { ...course, id: ID(2), code: "ma 211" };
    expect(validateNewSemester({ ...base, courses: [course, dup] } as never)).toMatch(/code/);
    const snap: Snapshot = { semester: { id: ID(9), ...sem }, courses: [course], slots: [], periods: [], rows: [] };
    expect(validateMutation(snap, { type: "saveCourse", course: dup } as never, "2026-10-21")).toMatch(/code/);
  });
  it("assigns the next unused palette colour", () => {
    expect(nextColour([])).toBe("indigo");
    expect(nextColour(["indigo", "sky"])).toBe("teal");
  });
});

describe("AC-15 slot validation", () => {
  const slot = { id: ID(3), courseId: ID(1), weekday: 1, startTime: "09:00", durationMin: 60, kind: "lecture", validFrom: null, validTo: null };
  it("rejects durations of 14 and 241, accepts 15 and 240", () => {
    expect(slotSchema.safeParse({ ...slot, durationMin: 14 }).success).toBe(false);
    expect(slotSchema.safeParse({ ...slot, durationMin: 241 }).success).toBe(false);
    expect(slotSchema.safeParse({ ...slot, durationMin: 15 }).success).toBe(true);
    expect(slotSchema.safeParse({ ...slot, durationMin: 240 }).success).toBe(true);
  });
});

describe("AC-15 future marks (R19)", () => {
  const snap: Snapshot = {
    semester: { id: ID(9), ...sem },
    courses: [course],
    slots: [{ id: ID(3), courseId: ID(1), weekday: 4, startTime: "09:00", durationMin: 60, kind: "lecture", validFrom: null, validTo: null }],
    periods: [],
    rows: [],
  };
  const target = { by: "slot" as const, slotId: ID(3), date: "2026-10-22" }; // a Thursday after today
  it("rejects Present on a date after today", () => {
    expect(validateMutation(snap, { type: "mark", target, status: "present" }, "2026-10-21")).toMatch(/future/);
  });
  it("accepts Absent, Medical and Cancelled on that date, and Present on the day itself", () => {
    for (const status of ["absent", "medical", "cancelled"] as const)
      expect(validateMutation(snap, { type: "mark", target, status }, "2026-10-21")).toBeNull();
    expect(validateMutation(snap, { type: "mark", target, status: "present" }, "2026-10-22")).toBeNull();
  });
});
