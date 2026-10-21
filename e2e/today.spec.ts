import { expect, test } from "@playwright/test";
import { budgetFromCounts } from "../src/lib/engine/budget";
import { Users, clickAndSave, courseCard, expectPressed, sessionCard } from "./helpers/app";

// AC-20 (R15, R16): one tap marks, survives reload, updates the budget; tapping again clears.
const users = new Users();
test.afterAll(() => users.cleanup());

// Wednesdays 5 Aug – 14 Oct (11 past lectures) all present; today is Wed 21 Oct; 5 Wednesdays remain after it.
const PAST = ["08-05", "08-12", "08-19", "08-26", "09-02", "09-09", "09-16", "09-23", "09-30", "10-07", "10-14"];

test("tap Absent, reload, check Courses, tap again to clear", async ({ page }) => {
  await users.create(
    page,
    {
      courses: [{ code: "MA 211", slots: [{ weekday: 3, startTime: "09:00" }] }],
      marks: PAST.map((d) => ({ course: "MA 211", date: `2026-${d}`, status: "present" as const })),
    },
    "2026-10-21",
  );
  await page.goto("/today");
  const card = sessionCard(page, "MA 211");
  await expect(card).toContainText(budgetFromCounts({ H: 11, A: 11, R: 6, p: 80 }).headline);

  await clickAndSave(page, card.getByRole("button", { name: "Absent", exact: true }));
  await expectPressed(page, "MA 211", "Absent");
  await expect(card).toContainText(budgetFromCounts({ H: 12, A: 11, R: 5, p: 80 }).headline);

  await page.reload();
  await expectPressed(page, "MA 211", "Absent");

  await page.getByRole("link", { name: "Courses" }).click();
  await expect(courseCard(page, "MA 211").getByTestId("headline")).toHaveText(budgetFromCounts({ H: 12, A: 11, R: 5, p: 80 }).headline);

  await page.getByRole("link", { name: "Today" }).click();
  await clickAndSave(page, sessionCard(page, "MA 211").getByRole("button", { name: "Absent", exact: true }));
  await expectPressed(page, "MA 211", null);
  await page.reload();
  await expectPressed(page, "MA 211", null);
});
