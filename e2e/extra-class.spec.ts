import { expect, test } from "@playwright/test";
import { Users, clickAndSave, metric, sessionCard } from "./helpers/app";

// AC-22 (R18, R19): an extra class on a Sunday counts; Present is not offered for a future date.
const users = new Users();
test.afterAll(() => users.cleanup());

test("extra class on a Sunday, marked Present, raises H by 1", async ({ page }) => {
  await users.create(page, { courses: [{ code: "MA 211", slots: [{ weekday: 1 }] }] }, "2026-10-25"); // Sunday
  await page.goto("/courses");
  const before = Number(await metric(page, "MA 211", "Held"));

  await page.getByRole("link", { name: "Today" }).click();
  await expect(page.getByTestId("session")).toHaveCount(0);
  await page.getByRole("button", { name: "Add extra class" }).click();
  const dialog = page.getByRole("dialog", { name: "Add extra class" });
  await dialog.getByLabel("Start time").fill("11:00");
  await clickAndSave(page, dialog.getByRole("button", { name: "Add class" }));
  await expect(sessionCard(page, "MA 211")).toBeVisible();
  await expect(sessionCard(page, "MA 211")).toContainText("Extra");
  await clickAndSave(page, sessionCard(page, "MA 211").getByRole("button", { name: "Present", exact: true }));
  await expect(sessionCard(page, "MA 211").getByRole("button", { name: "Present", exact: true })).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await page.getByRole("link", { name: "Courses" }).click();
  await expect.poll(async () => Number(await metric(page, "MA 211", "Held"))).toBe(before + 1);
});

test("Present is disabled for a future date", async ({ page }) => {
  await users.create(page, { courses: [{ code: "MA 211", slots: [{ weekday: 1 }] }] }, "2026-10-25");
  await page.goto("/today");
  await page.getByRole("button", { name: "Add extra class" }).click();
  const dialog = page.getByRole("dialog", { name: "Add extra class" });
  await dialog.getByLabel("Date").fill("2026-10-30");
  await expect(dialog.getByLabel("Mark as").locator("option", { hasText: "Present" })).toBeDisabled();
  await expect(dialog.getByLabel("Mark as").locator("option", { hasText: "Absent" })).toBeEnabled();
});
