import { expect, test } from "@playwright/test";
import { Users, clickAndSave } from "./helpers/app";
import { setToday } from "./helpers/auth";

// AC-21 (R17, R20): reasons for an empty day, and the "classes need marking" prompt.
const users = new Users();
test.afterAll(() => users.cleanup());

test("empty states: no-class period, before start, after end", async ({ page }) => {
  await users.create(
    page,
    {
      courses: [{ code: "MA 211", slots: [{ weekday: 1 }] }],
      periods: [{ startDate: "2026-11-09", endDate: "2026-11-10", label: "Diwali break" }],
    },
    "2026-11-09",
  );
  await page.goto("/today");
  await expect(page.getByTestId("empty-state")).toHaveText("Diwali break");

  await setToday(page.context(), "2026-07-01");
  await page.reload();
  await expect(page.getByTestId("empty-state")).toHaveText("Semester starts Mon, 3 Aug");

  await setToday(page.context(), "2026-12-05");
  await page.reload();
  await expect(page.getByTestId("empty-state")).toContainText("Semester ended Sat, 28 Nov");
  await expect(page.getByRole("link", { name: "See final results" })).toBeVisible();
});

test("2 past sessions unmarked → prompt; marking both removes it", async ({ page }) => {
  await users.create(
    page,
    {
      startDate: "2026-10-12",
      midsemDate: "2026-10-30",
      endDate: "2026-11-28",
      courses: [{ code: "MA 211", slots: [{ weekday: 1 }, { weekday: 3 }] }],
      marks: [{ course: "MA 211", slot: 0, date: "2026-10-12", status: "present" }],
    },
    "2026-10-21",
  );
  await page.goto("/today");
  const prompt = page.getByTestId("unmarked-prompt");
  await expect(prompt).toHaveText("2 classes need marking");
  await prompt.click();
  const list = page.locator("section", { has: prompt });
  for (let i = 0; i < 2; i++) {
    await clickAndSave(page, list.getByTestId("session").first().getByRole("button", { name: "Present", exact: true }));
    if (i === 0) await expect(prompt).toHaveText("1 class needs marking");
  }
  await expect(page.getByTestId("unmarked-prompt")).toHaveCount(0);
});
