import { describe, expect, it } from "vitest";
import { courseWindowBudgets } from "@/lib/engine/budget";
import { generateSessions } from "@/lib/engine/sessions";
import type { Snapshot } from "@/lib/engine/types";
import { SEM, course, repeat, series } from "./helpers";

// AC-7 (R22, R27): SPEC §4.4.7 edge cases 7–10.
describe("AC-7 ended semester, before start, unmarked and future marks", () => {
  it("after the end every window has R = 0 and a Final headline (H=40, A=31, U=2)", () => {
    const sessions = [
      ...series("2026-08-03", [...repeat("present" as const, 31), ...repeat("absent" as const, 9)]),
      ...series("2026-11-20", [null, null]),
    ];
    const [whole] = courseWindowBudgets(course(), SEM, sessions, "2026-12-05");
    expect([whole.H, whole.A, whole.R, whole.U, whole.phase]).toEqual([40, 31, 0, 2, "ended"]);
    expect(whole.headline).toBe("Final 77.5% · below 80%");
    const [p75] = courseWindowBudgets(course({ requiredPct: 75 }), SEM, sessions, "2026-12-05");
    expect(p75.headline).toBe("Final 77.5% · meets 75%");
    const both = [...sessions, ...series("2026-10-01", ["present", "absent", "present"])];
    const split = courseWindowBudgets(course({ windowMode: "split" }), SEM, both, "2026-12-05");
    expect(split.map((w) => w.H > 0)).toEqual([true, true]);
    for (const w of split) {
      expect(w.R).toBe(0);
      expect(w.headline.startsWith("Final ")).toBe(true);
    }
  });

  it("before the start H = 0 and R = every generated countable session", () => {
    const snapshot: Snapshot = {
      semester: SEM,
      courses: [course()],
      slots: [
        { id: "s1", courseId: "c1", weekday: 1, startTime: "09:00", durationMin: 60, kind: "lecture", validFrom: null, validTo: null },
        { id: "s2", courseId: "c1", weekday: 3, startTime: "09:00", durationMin: 180, kind: "lab", validFrom: null, validTo: null },
      ],
      periods: [],
      rows: [],
    };
    const sessions = generateSessions(snapshot);
    const [whole] = courseWindowBudgets(course(), SEM, sessions, "2026-07-01");
    expect(whole.phase).toBe("upcoming");
    expect(whole.H).toBe(0);
    expect(whole.R).toBe(sessions.filter((s) => s.kind === "lecture").length);
    expect(whole.R).toBe(17);
  });

  it("past unmarked sessions go to U only; future-dated marks count in H", () => {
    const sessions = [
      ...series("2026-08-03", ["present", "present", null, null]),
      ...series("2026-10-21", [null, null, "absent", "medical"]),
    ];
    const [whole] = courseWindowBudgets(course(), SEM, sessions, "2026-10-21");
    expect([whole.H, whole.A, whole.R, whole.U]).toEqual([4, 3, 2, 2]);
  });
});
