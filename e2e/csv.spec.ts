import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { CSV_HEADER } from "../src/lib/engine/csv";
import { Users } from "./helpers/app";

// AC-30 (R38): Mon/Wed course, 5–30 Oct, today Wed 21 Oct → 6 sessions so far + 1 marked later = 7 rows.
const users = new Users();
test.afterAll(() => users.cleanup());

test("Export CSV downloads the expected file", async ({ page }) => {
  await users.create(
    page,
    {
      name: "Oct Block",
      startDate: "2026-10-05",
      midsemDate: "2026-10-16",
      endDate: "2026-10-30",
      courses: [{ code: "MA 211", slots: [{ weekday: 1 }, { weekday: 3 }] }],
      marks: [
        { course: "MA 211", slot: 0, date: "2026-10-05", status: "present" },
        { course: "MA 211", slot: 1, date: "2026-10-28", status: "absent" },
      ],
    },
    "2026-10-21",
  );
  await page.goto("/history");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).click()]);
  expect(download.suggestedFilename()).toBe("bunkometer-oct-block-2026-10-21.csv");
  expect(download.suggestedFilename()).toMatch(/^bunkometer-.*\.csv$/);
  const text = await readFile((await download.path())!, "utf8");
  const lines = text.split("\r\n").filter(Boolean);
  expect(lines[0]).toBe(CSV_HEADER);
  expect(lines).toHaveLength(1 + 7);
  expect(lines[1]).toBe("2026-10-05,Mon,MA 211,MA 211 course,lecture,09:00,60,present,no,whole,yes,,");
  expect(lines[7]).toContain("2026-10-28,Wed,MA 211");
});
