import { describe, expect, it } from "vitest";
import { CSV_HEADER, buildCsv, csvField, csvFilename } from "@/lib/engine/csv";
import { SEM, course, session } from "./helpers";

// AC-13 (R38): SPEC §4.7.
describe("AC-13 CSV export", () => {
  it("header line is exact", () => {
    expect(CSV_HEADER).toBe(
      "date,weekday,course_code,course_name,kind,start_time,duration_min,status,extra,window,counts,makeup_date,makeup_done",
    );
  });

  it("quotes commas and quotes, guards formulas", () => {
    expect(csvField('Lab, "Advanced"')).toBe('"Lab, ""Advanced"""');
    expect(csvField("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvField("@cmd")).toBe("'@cmd");
    expect(csvField("plain")).toBe("plain");
  });

  it("rows sorted by date, time, code; CRLF line endings; labs carry makeup fields", () => {
    const a = course({ id: "a", code: "ZZ 9", name: 'Lab, "Advanced"' });
    const b = course({ id: "b", code: "AA 1", name: "=Evil" });
    const sessions = [
      session("2026-08-05", "present", { courseId: "a", startTime: "09:00" }),
      session("2026-08-04", "absent", { courseId: "a", startTime: "14:00", kind: "lab", makeupDate: "2026-08-20" }),
      session("2026-08-05", null, { courseId: "b", startTime: "09:00" }),
      session("2026-12-01", null, { courseId: "b" }), // after today and unmarked: excluded
      session("2026-11-01", "medical", { courseId: "b" }), // after today but marked: included
    ];
    const csv = buildCsv(SEM, [a, b], sessions, "2026-10-21");
    const lines = csv.split("\r\n");
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.replace(/\r\n/g, "")).not.toMatch(/\n/);
    expect(lines[0]).toBe(CSV_HEADER);
    expect(lines.slice(1, -1)).toEqual([
      '2026-08-04,Tue,ZZ 9,"Lab, ""Advanced""",lab,14:00,60,absent,no,whole,no,2026-08-20,no',
      "2026-08-05,Wed,AA 1,'=Evil,lecture,09:00,60,unmarked,no,whole,yes,,",
      '2026-08-05,Wed,ZZ 9,"Lab, ""Advanced""",lecture,09:00,60,present,no,whole,yes,,',
      "2026-11-01,Sun,AA 1,'=Evil,lecture,09:00,60,medical,no,whole,yes,,",
    ]);
  });

  it("filename pattern", () => {
    expect(csvFilename("Aug–Dec 2026", "2026-10-21")).toBe("bunkometer-aug-dec-2026-2026-10-21.csv");
    expect(csvFilename("Aug–Dec 2026", "2026-10-21")).toMatch(/^bunkometer-[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
