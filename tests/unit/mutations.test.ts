import { describe, expect, it } from "vitest";
import { diffSnapshots, isEmptyDiff } from "@/lib/data/diff";
import { applyMutation, marksForCourse, validateMutation } from "@/lib/data/mutations";
import type { Snapshot } from "@/lib/engine/types";

// Supporting tests for the shared reducer and the server diff (PLAN 3.2–3.4).
const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let n = 100;
const newId = () => ID(n++);

const snap: Snapshot = {
  semester: { id: ID(9), name: "S", startDate: "2026-08-03", midsemDate: "2026-09-26", endDate: "2026-11-28" },
  courses: [
    { id: ID(1), code: "CS 201", name: "DS", colour: "teal", requiredPct: 80, countTutorials: true, medicalCap: null, windowMode: "whole", sortOrder: 0 },
  ],
  slots: [{ id: ID(3), courseId: ID(1), weekday: 3, startTime: "14:00", durationMin: 180, kind: "lab", validFrom: null, validTo: null }],
  periods: [],
  rows: [],
};
const target = { by: "slot" as const, slotId: ID(3), date: "2026-10-14" };

describe("shared reducer", () => {
  it("marking creates a row, clearing deletes it", () => {
    const marked = applyMutation(snap, { type: "mark", target, status: "absent" }, newId);
    expect(marked.rows).toHaveLength(1);
    expect(marked.rows[0]).toMatchObject({ slotId: ID(3), date: "2026-10-14", status: "absent", kind: "lab" });
    const cleared = applyMutation(marked, { type: "mark", target, status: null }, newId);
    expect(cleared.rows).toHaveLength(0);
  });

  it("a makeup is only allowed on a missed lab and is dropped when the lab is re-marked present", () => {
    expect(validateMutation(snap, { type: "makeup", target, makeupDate: "2026-10-30", makeupDone: false }, "2026-10-21")).toBe(
      "Only a missed lab can have a makeup",
    );
    const missed = applyMutation(snap, { type: "mark", target, status: "absent" }, newId);
    const dated = applyMutation(missed, { type: "makeup", target, makeupDate: "2026-10-30", makeupDone: false }, newId);
    expect(dated.rows[0].makeupDate).toBe("2026-10-30");
    const present = applyMutation(dated, { type: "mark", target, status: "present" }, newId);
    expect([present.rows[0].makeupDate, present.rows[0].makeupDone]).toEqual([null, false]);
  });

  it("an unknown id is reported as Not found (another user's record is never touched)", () => {
    expect(validateMutation(snap, { type: "deleteCourse", courseId: ID(77) }, "2026-10-21")).toBe("Not found");
    expect(validateMutation(snap, { type: "mark", target: { by: "slot", slotId: ID(77), date: "2026-10-14" }, status: "absent" }, "2026-10-21")).toBe("Not found");
    expect(validateMutation(snap, { type: "mark", target: { ...target, date: "2026-10-15" }, status: "absent" }, "2026-10-21")).toBe("Not found");
  });

  it("deleting a course removes its slots and marks; the diff lists exactly those", () => {
    const marked = applyMutation(snap, { type: "mark", target, status: "absent" }, newId);
    expect(marksForCourse(marked, ID(1))).toBe(1);
    const gone = applyMutation(marked, { type: "deleteCourse", courseId: ID(1) }, newId);
    const d = diffSnapshots(marked, gone);
    expect([d.courses.removed.length, d.slots.removed.length, d.rows.removed.length]).toEqual([1, 1, 1]);
    expect(isEmptyDiff(diffSnapshots(marked, marked))).toBe(true);
  });
});
