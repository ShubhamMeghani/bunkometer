import type { FixtureSpec } from "./fixtures";

/** A busy Wednesday (21 Oct 2026) with lectures, a tutorial and a lab, a holiday, marks and a pending makeup. */
export const RICH: FixtureSpec = {
  courses: [
    { code: "MA 211", name: "Real Analysis", windowMode: "split", slots: [{ weekday: 1 }, { weekday: 3 }, { weekday: 5 }, { weekday: 4, startTime: "14:00", kind: "tutorial" }] },
    { code: "PH 203", name: "Electromagnetism", windowMode: "split", slots: [{ weekday: 2, startTime: "10:00" }, { weekday: 3, startTime: "10:00" }] },
    { code: "CS 201", name: "Data Structures", slots: [{ weekday: 3, startTime: "14:00", kind: "lab" }] },
  ],
  periods: [{ startDate: "2026-10-02", endDate: "2026-10-02", label: "Gandhi Jayanti" }],
  marks: [
    { course: "MA 211", slot: 0, date: "2026-10-12", status: "absent" },
    { course: "MA 211", slot: 1, date: "2026-10-14", status: "present" },
    { course: "PH 203", slot: 1, date: "2026-10-14", status: "medical" },
    { course: "CS 201", slot: 0, date: "2026-10-14", status: "absent" },
  ],
};
