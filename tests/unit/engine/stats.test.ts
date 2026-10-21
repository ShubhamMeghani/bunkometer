import { describe, expect, it } from "vitest";
import { mostSkippedWeekday, streaks, weeklyTrend } from "@/lib/engine/stats";
import { SEM, course, session } from "./helpers";

// AC-12 (R36, R37): SPEC §4.6 fixture, T = 2026-08-23, one daily lecture course.
const T = "2026-08-23";
const marks = [
  ["2026-08-03", "present"],
  ["2026-08-04", "present"],
  ["2026-08-05", "medical"],
  ["2026-08-06", "present"],
  ["2026-08-07", "absent"],
  ["2026-08-10", "present"],
  ["2026-08-11", "cancelled"],
  ["2026-08-12", "absent"],
  ["2026-08-13", "absent"],
  ["2026-08-14", "present"],
] as const;
const base = marks.map(([d, st]) => session(d, st));
const unmarked = ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20"].map((d) => session(d, null));

describe("AC-12 statistics", () => {
  it("streaks: current 1, longest 3", () => {
    expect(streaks(base)).toEqual({ current: 1, longest: 3 });
  });

  it("most-skipped weekday: Wed (Wed/Thu/Fri tie, earliest wins); Fri after another Friday absence", () => {
    expect(mostSkippedWeekday(base)).toBe(3);
    expect(mostSkippedWeekday([...base, session("2026-08-21", "absent")])).toBe(5);
    expect(mostSkippedWeekday([])).toBeNull();
  });

  it("weekly trend: [80.0, 66.6], then [80.0, 66.6, 60.0]", () => {
    const pct = (ps: { tenths: number }[]) => ps.map((p) => p.tenths / 10);
    expect(pct(weeklyTrend(course(), [...base, ...unmarked], SEM, T))).toEqual([80, 66.6]);
    const withFri = [...base, ...unmarked, session("2026-08-21", "absent")];
    const trend = weeklyTrend(course(), withFri, SEM, T);
    expect(pct(trend)).toEqual([80, 66.6, 60]);
    expect(trend.map((p) => p.weekEnd)).toEqual(["2026-08-09", "2026-08-16", "2026-08-23"]);
  });
});
