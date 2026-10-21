import { describe, expect, it } from "vitest";
import { computeWindowBudget } from "@/lib/engine/budget";
import { course, repeat, series, session } from "./helpers";

// AC-5 (R25): SPEC §4.4.7 edge cases 3 and 5.
const WINDOW = { id: "whole" as const, label: "Whole semester", start: "2026-01-01", end: "2026-12-31" };
const TODAY = "2026-06-01";

describe("AC-5 cancelled, extra, tutorial and lab sessions", () => {
  const past = series("2026-01-05", [...repeat("present" as const, 8), "absent"]);
  const future = series(TODAY, repeat(null, 21));

  it("baseline H=9, A=8, R=21 gives S=5", () => {
    const b = computeWindowBudget(course(), WINDOW, [...past, ...future], TODAY);
    expect([b.H, b.A, b.R, b.S]).toEqual([9, 8, 21, 5]);
  });

  it("cancelling one future class changes neither H nor adds to R, and lowers S to 4", () => {
    const cancelled = [{ ...future[0], status: "cancelled" as const }, ...future.slice(1)];
    const b = computeWindowBudget(course(), WINDOW, [...past, ...cancelled], TODAY);
    expect([b.H, b.A, b.R, b.K, b.S]).toEqual([9, 8, 20, 480, 4]);
  });

  it("then a past extra class marked present adds 1 to H and A: S=5, 90.0%", () => {
    const cancelled = [{ ...future[0], status: "cancelled" as const }, ...future.slice(1)];
    const extra = session("2026-03-07", "present", { isExtra: true });
    const b = computeWindowBudget(course(), WINDOW, [...past, ...cancelled, extra], TODAY);
    expect([b.H, b.A, b.R, b.K, b.S, b.cur]).toEqual([10, 9, 20, 500, 5, "90.0%"]);
  });

  const lectures = series("2026-01-05", [...repeat("present" as const, 13), ...repeat("absent" as const, 3)]);
  const tutorials = series("2026-03-01", [...repeat("present" as const, 4), ...repeat("absent" as const, 4)], "tutorial");

  it("tutorials off: 81.2% met", () => {
    const b = computeWindowBudget(course({ countTutorials: false }), WINDOW, [...lectures, ...tutorials], TODAY);
    expect([b.H, b.A, b.cur, b.met]).toEqual([16, 13, "81.2%", true]);
  });

  it("tutorials on: 70.8% not met", () => {
    const b = computeWindowBudget(course({ countTutorials: true }), WINDOW, [...lectures, ...tutorials], TODAY);
    expect([b.H, b.A, b.cur, b.met]).toEqual([24, 17, "70.8%", false]);
  });

  it("labs never change any window metric", () => {
    const base = computeWindowBudget(course(), WINDOW, lectures, TODAY);
    const labs = [
      ...series("2026-04-01", ["present", "absent", "medical", "cancelled"], "lab"),
      ...series(TODAY, [null, null], "lab"),
      ...series("2026-05-01", [null], "lab"),
    ];
    const withLabs = computeWindowBudget(course(), WINDOW, [...lectures, ...labs], TODAY);
    expect(withLabs).toEqual(base);
  });
});
