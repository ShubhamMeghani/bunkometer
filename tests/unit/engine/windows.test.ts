import { describe, expect, it } from "vitest";
import { courseWindowBudgets, windowIdOf } from "@/lib/engine/budget";
import { SEM, course, repeat, series, session } from "./helpers";

// AC-6 (R26): SPEC §4.4.7 edge case 6. Semester 2026-08-03 → midsem 2026-09-26 → 2026-11-28; today in endsem.
const TODAY = "2026-10-21";

describe("AC-6 split windows", () => {
  it("a class on the midsem date counts in the midsem window only; the next day is endsem", () => {
    const c = course({ windowMode: "split" });
    expect(windowIdOf("2026-09-26", c, SEM)).toBe("midsem");
    expect(windowIdOf("2026-09-27", c, SEM)).toBe("endsem");
    const onMidsem = session("2026-09-26", "present", { isExtra: true });
    const dayAfter = session("2026-09-27", "absent", { isExtra: true });
    const [endsem, midsem] = courseWindowBudgets(c, SEM, [onMidsem, dayAfter], TODAY);
    expect([midsem.window.id, midsem.H, midsem.A]).toEqual(["midsem", 1, 1]);
    expect([endsem.window.id, endsem.H, endsem.A]).toEqual(["endsem", 1, 0]);
  });

  // Midsem: H 24, A 20, R 0. Endsem: H 6, A 4, R 18.
  const sessions = [
    ...series("2026-08-03", [...repeat("present" as const, 20), ...repeat("absent" as const, 4)]),
    ...series("2026-09-28", [...repeat("present" as const, 4), ...repeat("absent" as const, 2)]),
    ...series("2026-10-21", repeat(null, 18)),
  ];

  it("each window is computed separately, current window first", () => {
    const [endsem, midsem] = courseWindowBudgets(course({ windowMode: "split" }), SEM, sessions, TODAY);
    expect(midsem.headline).toBe("Final 83.3% · meets 80%");
    expect(midsem.status).toBe("safe");
    expect([endsem.H, endsem.A, endsem.R, endsem.cur, endsem.K, endsem.S, endsem.N, endsem.best]).toEqual([
      6, 4, 18, "66.6%", 280, 2, 4, "91.6%",
    ]);
    expect(endsem.headline).toBe("Attend next 4 to reach 80%");
    expect(endsem.status).toBe("warning");
  });

  it("the same marks in whole-semester mode give one window: Can skip 3 more", () => {
    const [whole, ...rest] = courseWindowBudgets(course({ windowMode: "whole" }), SEM, sessions, TODAY);
    expect(rest).toHaveLength(0);
    expect([whole.H, whole.A, whole.R, whole.K, whole.S]).toEqual([30, 24, 18, 360, 3]);
    expect(whole.headline).toBe("Can skip 3 more");
    expect(whole.status).toBe("safe");
  });
});
