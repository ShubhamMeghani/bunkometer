import { describe, expect, it } from "vitest";
import { addDays, formatDayShort, isISODate, todayIST, weekdayOf, weekEnding } from "@/lib/engine/dates";

// AC-9 (R28): the IST midnight boundary.
describe("AC-9 today in Asia/Kolkata", () => {
  it("18:29:59Z is still 21 Oct in IST; 18:30:00Z is 22 Oct", () => {
    expect(todayIST(new Date("2026-10-21T18:29:59Z"))).toBe("2026-10-21");
    expect(todayIST(new Date("2026-10-21T18:30:00Z"))).toBe("2026-10-22");
  });
});

describe("date helpers", () => {
  it("weekdays and formatting", () => {
    expect(weekdayOf("2026-08-03")).toBe(1);
    expect(weekdayOf("2026-10-21")).toBe(3);
    expect(weekdayOf("2026-11-29")).toBe(7);
    expect(formatDayShort("2026-10-21")).toBe("Wed, 21 Oct");
    expect(addDays("2026-09-26", 1)).toBe("2026-09-27");
    expect(weekEnding("2026-08-05")).toBe("2026-08-09");
    expect(weekEnding("2026-08-09")).toBe("2026-08-09");
  });

  it("validates ISO dates", () => {
    expect(isISODate("2026-02-28")).toBe(true);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("26-02-28")).toBe(false);
  });
});
