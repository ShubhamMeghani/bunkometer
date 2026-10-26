import { describe, expect, it } from "vitest";
import { SPLIT_NEEDS_MIDSEM, applyMutation, midsemRemovalBlock, validateMutation, validateNewSemester } from "@/lib/data/mutations";
import { COURSE_DEFAULTS, semesterSchema } from "@/lib/data/schemas";
import { courseWindowBudgets, windowsFor } from "@/lib/engine/budget";
import type { Snapshot } from "@/lib/engine/types";
import { SEM, course, repeat, series } from "./engine/helpers";

// AC-48 (R8, R9, R52): the midsem date is optional; split windows need it; removing it is blocked while
// split courses exist. Existing split semesters and the maths are unchanged.
const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const noMidsem = { name: "Short term", startDate: "2026-08-03", midsemDate: null, endDate: "2026-11-28" };
const whole = { id: ID(1), code: "MA 211", name: "Real Analysis", colour: "indigo", sortOrder: 0, ...COURSE_DEFAULTS };
const split = { ...whole, id: ID(2), code: "PH 203", name: "Electromagnetism", windowMode: "split" as const };

function snap(midsemDate: string | null, courses: Snapshot["courses"] = [whole]): Snapshot {
  return { semester: { id: ID(9), ...noMidsem, midsemDate }, courses, slots: [], periods: [], rows: [] };
}

describe("AC-48 optional midsem date", () => {
  it("a semester without a midsem date is valid; end must still be after start", () => {
    expect(semesterSchema.safeParse(noMidsem).success).toBe(true);
    const bad = semesterSchema.safeParse({ ...noMidsem, endDate: "2026-08-03" });
    expect(bad.success ? [] : bad.error.issues.map((i) => i.path.join("."))).toEqual(["endDate"]);
  });

  it("a given midsem date is still checked (start < midsem < end)", () => {
    expect(semesterSchema.safeParse({ ...noMidsem, midsemDate: "2026-09-26" }).success).toBe(true);
    expect(semesterSchema.safeParse({ ...noMidsem, midsemDate: "2026-08-03" }).success).toBe(false);
  });

  it("split windows are rejected without a midsem date, allowed with one", () => {
    expect(validateMutation(snap(null), { type: "saveCourse", course: split }, "2026-10-21")).toBe(SPLIT_NEEDS_MIDSEM);
    expect(validateMutation(snap("2026-09-26"), { type: "saveCourse", course: split }, "2026-10-21")).toBeNull();
    expect(validateMutation(snap(null), { type: "saveCourse", course: whole }, "2026-10-21")).toBeNull();
    expect(validateNewSemester({ semester: noMidsem, courses: [split], slots: [], periods: [] })).toBe(SPLIT_NEEDS_MIDSEM);
    expect(validateNewSemester({ semester: noMidsem, courses: [whole], slots: [], periods: [] })).toBeNull();
  });

  it("removing the midsem date is blocked while split courses exist, with the courses named", () => {
    const withSplit = snap("2026-09-26", [whole, split]);
    const msg = validateMutation(withSplit, { type: "saveSemester", semester: { ...noMidsem, midsemDate: null } }, "2026-10-21");
    expect(msg).toBe(midsemRemovalBlock([split]));
    expect(msg).toContain("PH 203");
    expect(msg).toContain("whole semester first");
    expect(validateMutation(snap("2026-09-26"), { type: "saveSemester", semester: noMidsem }, "2026-10-21")).toBeNull();
    const after = applyMutation(snap("2026-09-26"), { type: "saveSemester", semester: noMidsem }, () => ID(99));
    expect(after.semester.midsemDate).toBeNull();
  });

  it("whole-semester maths is identical with or without a midsem date", () => {
    const sessions = [...series("2026-08-03", [...repeat("present" as const, 17), ...repeat("absent" as const, 3)]), ...series("2026-10-21", repeat(null, 20))];
    const a = courseWindowBudgets(course(), SEM, sessions, "2026-10-21");
    const b = courseWindowBudgets(course(), { ...SEM, midsemDate: null }, sessions, "2026-10-21");
    expect(b).toEqual(a);
    expect(a[0].headline).toBe("Can skip 5 more");
  });

  it("existing split semesters keep both windows", () => {
    expect(windowsFor({ windowMode: "split" }, SEM).map((w) => [w.id, w.start, w.end])).toEqual([
      ["midsem", "2026-08-03", "2026-09-26"],
      ["endsem", "2026-09-27", "2026-11-28"],
    ]);
  });
});
