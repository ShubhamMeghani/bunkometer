import { describe, expect, it } from "vitest";
import { applyMutation, validateMutation } from "@/lib/data/mutations";
import { bulkPreview } from "@/lib/engine/bulk";
import { isPendingMakeup } from "@/lib/engine/labs";
import { generateSessions } from "@/lib/engine/sessions";
import type { Snapshot } from "@/lib/engine/types";

// Supports AC-28 (R34).
const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let n = 500;
const newId = () => ID(n++);
const base = { requiredPct: 80, countTutorials: true, medicalCap: null, windowMode: "whole" as const, sortOrder: 0 };
const snap: Snapshot = {
  semester: { id: ID(9), name: "S", startDate: "2026-08-03", midsemDate: "2026-09-26", endDate: "2026-11-28" },
  courses: [
    { id: ID(1), code: "MA 211", name: "A", colour: "teal", ...base },
    { id: ID(2), code: "CS 201", name: "B", colour: "sky", ...base },
  ],
  slots: [
    { id: ID(11), courseId: ID(1), weekday: 1, startTime: "09:00", durationMin: 60, kind: "lecture", validFrom: null, validTo: null },
    { id: ID(12), courseId: ID(1), weekday: 3, startTime: "09:00", durationMin: 60, kind: "lecture", validFrom: null, validTo: null },
    { id: ID(21), courseId: ID(2), weekday: 2, startTime: "14:00", durationMin: 180, kind: "lab", validFrom: null, validTo: null },
  ],
  periods: [],
  rows: [
    { id: ID(31), courseId: ID(1), slotId: ID(11), date: "2026-10-12", startTime: "09:00", durationMin: 60, kind: "lecture", isExtra: false, status: "present", makeupDate: null, makeupDone: false },
    { id: ID(32), courseId: ID(1), slotId: null, date: "2026-10-13", startTime: "11:00", durationMin: 60, kind: "lecture", isExtra: true, status: "medical", makeupDate: null, makeupDone: false },
  ],
};

describe("bulk marking", () => {
  it("previews sessions in range and the marks that would change", () => {
    const s = generateSessions(snap);
    expect(bulkPreview(s, "2026-10-12", "2026-10-14", [ID(1), ID(2)], "medical")).toEqual({ sessions: 4, overwritten: 1 });
    expect(bulkPreview(s, "2026-10-12", "2026-10-14", [ID(1)], "absent")).toEqual({ sessions: 3, overwritten: 2 });
  });

  it("applies to scheduled, extra and lab sessions; missed labs become pending makeups", () => {
    const m = { type: "bulkMark" as const, from: "2026-10-12", to: "2026-10-14", status: "medical" as const, courseIds: [ID(1), ID(2)] };
    expect(validateMutation(snap, m, "2026-10-21")).toBeNull();
    const after = generateSessions(applyMutation(snap, m, newId)).filter((s) => s.date >= "2026-10-12" && s.date <= "2026-10-14");
    expect(after.map((s) => s.status)).toEqual(["medical", "medical", "medical", "medical"]);
    expect(after.filter((s) => s.kind === "lab").every(isPendingMakeup)).toBe(true);
  });

  it("rejects a reversed range or a foreign course", () => {
    expect(validateMutation(snap, { type: "bulkMark", from: "2026-10-14", to: "2026-10-12", status: "absent", courseIds: [ID(1)] }, "2026-10-21")).toMatch(/before/);
    expect(validateMutation(snap, { type: "bulkMark", from: "2026-10-12", to: "2026-10-14", status: "absent", courseIds: [ID(77)] }, "2026-10-21")).toBe("Not found");
  });
});
