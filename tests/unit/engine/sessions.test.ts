import { describe, expect, it } from "vitest";
import { generateSessions } from "@/lib/engine/sessions";
import type { NoClassPeriod, Slot, Snapshot } from "@/lib/engine/types";
import { SEM, course } from "./helpers";

// AC-8 (R10, R11, R12): SPEC §4.3 fixture.
const SLOT: Slot = { id: "mon", courseId: "c1", weekday: 1, startTime: "09:00", durationMin: 60, kind: "lecture", validFrom: null, validTo: null };
const EXAMS: NoClassPeriod = { id: "p1", startDate: "2026-09-21", endDate: "2026-09-26", label: "Midsem exams", kind: "exam" };
const HOLIDAY: NoClassPeriod = { id: "p2", startDate: "2026-10-19", endDate: "2026-10-19", label: "Holiday", kind: "holiday" };
const MARK = {
  id: "r1", courseId: "c1", slotId: "mon", date: "2026-10-19", startTime: "09:00", durationMin: 60,
  kind: "lecture" as const, isExtra: false, status: "absent" as const, makeupDate: null, makeupDone: false,
};

function snap(periods: NoClassPeriod[], slot: Slot = SLOT): Snapshot {
  return { semester: SEM, courses: [course()], slots: [slot], periods, rows: [MARK] };
}

describe("AC-8 session generation", () => {
  it("generates the 16 Mondays listed in SPEC §4.3", () => {
    const dates = generateSessions(snap([EXAMS])).map((s) => s.date);
    expect(dates).toEqual([
      "2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31",
      "2026-09-07", "2026-09-14", "2026-09-28",
      "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26",
      "2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23",
    ]);
    expect(dates.filter((d) => d <= SEM.midsemDate)).toHaveLength(7);
    expect(dates.filter((d) => d > SEM.midsemDate)).toHaveLength(9);
  });

  it("the Oct 19 mark is used, ignored while that day is a holiday, and back after removal", () => {
    const before = generateSessions(snap([EXAMS]));
    expect(before.find((s) => s.date === "2026-10-19")?.status).toBe("absent");
    const holiday = generateSessions(snap([EXAMS, HOLIDAY]));
    expect(holiday).toHaveLength(15);
    expect(holiday.some((s) => s.date === "2026-10-19")).toBe(false);
    const removed = generateSessions(snap([EXAMS]));
    expect(removed).toHaveLength(16);
    expect(removed.find((s) => s.date === "2026-10-19")?.status).toBe("absent");
  });

  it("valid_to = 2026-10-31 gives 12 sessions", () => {
    expect(generateSessions(snap([EXAMS], { ...SLOT, validTo: "2026-10-31" }))).toHaveLength(12);
  });

  it("extra classes are included on any date inside the semester, even on no-class days", () => {
    const extra = { ...MARK, id: "x1", slotId: null, isExtra: true, date: "2026-09-26", status: null };
    const outside = { ...MARK, id: "x2", slotId: null, isExtra: true, date: "2026-12-01", status: null };
    const s = generateSessions({ ...snap([EXAMS]), rows: [MARK, extra, outside] });
    expect(s.filter((x) => x.isExtra).map((x) => x.date)).toEqual(["2026-09-26"]);
  });
});
