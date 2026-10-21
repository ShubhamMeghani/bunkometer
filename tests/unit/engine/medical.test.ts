import { describe, expect, it } from "vitest";
import { computeWindowBudget, courseWindowBudgets } from "@/lib/engine/budget";
import { SEM, course, repeat, series } from "./helpers";

// AC-4 (R24): SPEC §4.4.7 edge case 4, H = 20 with 14 present, 3 medical, 3 absent.
const WINDOW = { id: "whole" as const, label: "Whole semester", start: "2026-01-01", end: "2026-12-31" };
const TODAY = "2026-06-01";
const marks = series("2026-01-05", [...repeat("present" as const, 14), ...repeat("medical" as const, 3), ...repeat("absent" as const, 3)]);

describe("AC-4 medical counts as attended, with an optional cap", () => {
  it("no cap: A = 17, 85.0%", () => {
    const b = computeWindowBudget(course(), WINDOW, marks, TODAY);
    expect([b.H, b.A, b.medical, b.overCap, b.cur, b.met]).toEqual([20, 17, 3, 0, "85.0%", true]);
  });

  it("cap 2: A = 16, met at exactly 80.0%, one session over cap", () => {
    const b = computeWindowBudget(course({ medicalCap: 2 }), WINDOW, marks, TODAY);
    expect([b.H, b.A, b.medical, b.overCap, b.cur, b.met]).toEqual([20, 16, 2, 1, "80.0%", true]);
  });

  it("cap 1: A = 15, 75.0%, not met", () => {
    const b = computeWindowBudget(course({ medicalCap: 1 }), WINDOW, marks, TODAY);
    expect([b.A, b.cur, b.met]).toEqual([15, "75.0%", false]);
  });

  it("the cap is used up in date order across both windows of a split course", () => {
    const c = course({ windowMode: "split", medicalCap: 3 });
    const sessions = [
      ...series("2026-08-10", ["medical", "medical"]), // midsem window
      ...series("2026-10-05", ["medical", "medical"]), // endsem window
    ];
    const [endsem, midsem] = courseWindowBudgets(c, SEM, sessions, "2026-10-21");
    expect(midsem.window.id).toBe("midsem");
    expect([midsem.A, midsem.overCap]).toEqual([2, 0]);
    expect(endsem.window.id).toBe("endsem");
    expect([endsem.A, endsem.overCap]).toEqual([1, 1]);
  });
});
