import { describe, expect, it } from "vitest";
import { isOverdueMakeup, isPendingMakeup, labSummary, withStatus } from "@/lib/engine/labs";
import { repeat, series, session } from "./helpers";

// AC-11 (R30, R31): makeup lifecycle and SPEC §4.4.7 edge case 11.
describe("AC-11 lab makeups", () => {
  const lab = session("2026-10-14", null, { kind: "lab" });

  it("absent → pending; date set → still pending; completed → not pending", () => {
    const absent = withStatus(lab, "absent");
    expect(isPendingMakeup(absent)).toBe(true);
    const dated = { ...absent, makeupDate: "2026-10-30" };
    expect(isPendingMakeup(dated)).toBe(true);
    const done = { ...dated, makeupDone: true };
    expect(isPendingMakeup(done)).toBe(false);
  });

  it("re-marking present or cancelled, or clearing, drops the makeup", () => {
    const dated = { ...withStatus(lab, "medical"), makeupDate: "2026-10-30", makeupDone: true };
    for (const status of ["present", "cancelled", null] as const) {
      const next = withStatus(dated, status);
      expect([next.makeupDate, next.makeupDone, isPendingMakeup(next)]).toEqual([null, false, false]);
    }
    expect(withStatus(dated, "absent").makeupDate).toBe("2026-10-30");
  });

  it("a pending makeup whose date has passed is overdue", () => {
    const dated = { ...withStatus(lab, "absent"), makeupDate: "2026-10-20" };
    expect(isOverdueMakeup(dated, "2026-10-21")).toBe(true);
    expect(isOverdueMakeup(dated, "2026-10-20")).toBe(false);
    expect(isOverdueMakeup({ ...dated, makeupDone: true }, "2026-10-21")).toBe(false);
  });

  it("edge case 11: 9 done, 2 pending, warning; overdue on 31 Oct makes it danger", () => {
    const labs = [
      ...series("2026-08-05", repeat("present" as const, 9), "lab"),
      session("2026-10-07", "absent", { kind: "lab" }),
      session("2026-10-08", "medical", { kind: "lab", makeupDate: "2026-10-30" }),
      session("2026-10-09", "cancelled", { kind: "lab" }),
    ];
    const s = labSummary(labs, "2026-10-21");
    expect([s.done, s.pending, s.overdue, s.cancelled, s.status]).toEqual([9, 2, 0, 1, "warning"]);
    const completed = labs.map((l) => (l.status === "absent" ? { ...l, makeupDone: true } : l));
    expect([labSummary(completed, "2026-10-21").done, labSummary(completed, "2026-10-21").pending]).toEqual([10, 1]);
    expect(labSummary(labs, "2026-10-31").status).toBe("danger");
    expect(labSummary([], "2026-10-21").status).toBe("none");
    expect(labSummary(series("2026-08-05", ["present"], "lab"), "2026-10-21").status).toBe("safe");
  });
});
