import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/engine/dates";
import { planTrip } from "@/lib/engine/trip";
import { SEM, course, repeat, series } from "./helpers";

// AC-10 (R32, R33): SPEC §4.5 worked example, p = 80, today Wed 21 Oct.
const T = "2026-10-21";
const P = course({ id: "p", code: "P 101", windowMode: "whole" });
const Q = course({ id: "q", code: "Q 102", windowMode: "split" });
const L = course({ id: "l", code: "CS 201" });

const sessions = [
  // P: H 20 (19 present, 1 absent), R 25 from today
  ...series("2026-08-03", [...repeat("present" as const, 19), "absent"], "lecture", "p"),
  ...series(T, repeat(null, 25), "lecture", "p"),
  // Q endsem window: H 10 (9 present, 1 absent), R 15 from today
  ...series("2026-10-01", [...repeat("present" as const, 9), "absent"], "lecture", "q"),
  ...series(T, repeat(null, 15), "lecture", "q"),
  // One lab inside the trip
  ...series(addDays(T, 6), [null], "lab", "l"),
];

describe("AC-10 trip planner", () => {
  it("§4.5 example: P safe (S′ 5, 91.1%), Q warning (N 7, 84.0%), 1 lab → Careful", () => {
    const plan = planTrip(SEM, [P, Q, L], sessions, T, addDays(T, 5), addDays(T, 7));
    if (!plan.ok) throw new Error(plan.error);
    const p = plan.affected.find((c) => c.course.id === "p")!;
    const q = plan.affected.find((c) => c.course.id === "q")!;
    expect([p.missed, p.windows[0].after.K, p.windows[0].after.S, p.windows[0].after.best, p.windows[0].after.status]).toEqual([
      3, 500, 5, "91.1%", "safe",
    ]);
    expect(p.windows[0].after.headline).toBe("Can skip 5 more");
    expect(q.windows).toHaveLength(1);
    expect(q.windows[0].before.window.id).toBe("endsem");
    expect([q.missed, q.windows[0].after.K, q.windows[0].after.N, q.windows[0].after.best, q.windows[0].after.status]).toEqual([
      3, 100, 7, "84.0%", "warning",
    ]);
    expect(q.windows[0].after.headline).toBe("Attend next 7 to reach 80%");
    expect(plan.labsNeeded).toBe(1);
    expect(plan.verdict).toBe("careful");
  });

  it("widening so Q misses 5 gives No-go with Can't recover · best 76.0%", () => {
    const plan = planTrip(SEM, [P, Q, L], sessions, T, addDays(T, 5), addDays(T, 9));
    if (!plan.ok) throw new Error(plan.error);
    const q = plan.affected.find((c) => c.course.id === "q")!;
    expect([q.missed, q.windows[0].after.K, q.windows[0].after.best]).toEqual([5, -100, "76.0%"]);
    expect(q.windows[0].after.headline).toBe("Can't recover in this window · best 76.0%");
    expect(plan.verdict).toBe("nogo");
  });

  it("a range with no sessions is Go and affects nothing", () => {
    const plan = planTrip(SEM, [P, Q, L], sessions, T, "2026-11-27", "2026-11-28");
    if (!plan.ok) throw new Error(plan.error);
    expect([plan.affected.length, plan.verdict]).toEqual([0, "go"]);
  });

  it("dates before today are ignored (clipped)", () => {
    const plan = planTrip(SEM, [P, Q, L], sessions, T, "2026-10-01", addDays(T, 0));
    if (!plan.ok) throw new Error(plan.error);
    expect([plan.from, plan.clipped]).toEqual([T, true]);
    expect(plan.affected.find((c) => c.course.id === "p")!.missed).toBe(1);
  });

  it("a range crossing the midsem date counts m per window", () => {
    const c = course({ id: "s", windowMode: "split" });
    const s = [...series("2026-09-25", [null, null, null, null], "lecture", "s")]; // 25, 26 (midsem) | 27, 28 (endsem)
    const plan = planTrip(SEM, [c], s, "2026-09-20", "2026-09-24", "2026-09-29");
    if (!plan.ok) throw new Error(plan.error);
    const w = plan.affected[0].windows.map((x) => [x.before.window.id, x.missed]);
    expect(w).toEqual([
      ["midsem", 2],
      ["endsem", 2],
    ]);
  });

  it("validation: from after to, or nothing on/after today inside the semester", () => {
    expect(planTrip(SEM, [P], sessions, T, "2026-10-25", "2026-10-24")).toEqual({
      ok: false,
      error: "Start date must be on or before end date",
    });
    expect(planTrip(SEM, [P], sessions, T, "2026-10-01", "2026-10-10").ok).toBe(false);
    expect(planTrip(SEM, [P], sessions, T, "2026-12-01", "2026-12-10").ok).toBe(false);
  });
});
