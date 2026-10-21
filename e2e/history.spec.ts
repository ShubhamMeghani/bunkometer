import { expect, test } from "@playwright/test";
import { Users, clickAndSave, courseCard, metric } from "./helpers/app";

// AC-29 (R35): calendar markers and editing a past day.
const users = new Users();
test.afterAll(() => users.cleanup());

test("calendar marks session days; editing a past day updates Courses", async ({ page }) => {
  await users.create(
    page,
    {
      courses: [{ code: "MA 211", slots: [{ weekday: 1 }, { weekday: 3 }] }],
      marks: [
        { course: "MA 211", slot: 0, date: "2026-10-12", status: "absent" },
        { course: "MA 211", slot: 1, date: "2026-10-14", status: "present" },
      ],
    },
    "2026-10-21",
  );
  await page.goto("/courses");
  await expect.poll(() => metric(page, "MA 211", "Attended")).toBe("1");

  await page.getByRole("link", { name: "History" }).click();
  await expect(page.locator('button[data-date="2026-10-12"]')).toHaveAttribute("data-absent", "true");
  await expect(page.locator('button[data-date="2026-10-14"]')).toHaveAttribute("data-sessions", "1");
  await expect(page.locator('button[data-date="2026-10-19"]')).toHaveAttribute("data-unmarked", "true");
  await expect(page.locator('button[data-date="2026-10-13"]')).toHaveAttribute("data-sessions", "0");

  await page.locator('button[data-date="2026-10-14"]').click();
  const editor = page.getByTestId("day-editor");
  await expect(editor.getByRole("button", { name: "Present", exact: true })).toHaveAttribute("aria-pressed", "true");
  await clickAndSave(page, editor.getByRole("button", { name: "Absent", exact: true }));
  await expect(page.locator('button[data-date="2026-10-14"]')).toHaveAttribute("data-absent", "true");

  await page.getByRole("link", { name: "Courses" }).click();
  await expect.poll(() => metric(page, "MA 211", "Attended")).toBe("0");
  await page.reload();
  await expect.poll(() => metric(page, "MA 211", "Attended")).toBe("0");

  // R36: the course page draws the trend chart.
  await courseCard(page, "MA 211").getByRole("link").first().click();
  await expect(page.getByTestId("trend-chart")).toBeVisible();
});
