import { expect, test } from "@playwright/test";
import { Users } from "./helpers/app";

// AC-19 (R2, R7, R10): a new user sets up a semester and lands on Today with exactly today's slots.
const users = new Users();
test.afterAll(() => users.cleanup());

test("new user → /setup → semester, 2 courses, 3 slots → /today; sign out → /", async ({ page }) => {
  await users.create(page, null, "2026-10-21"); // a Wednesday
  await page.goto("/today");
  await expect(page).toHaveURL("/setup");

  await page.getByLabel("Semester name").fill("Aug–Dec 2026");
  await page.getByLabel("Start date").fill("2026-08-03");
  await page.getByLabel("Midsem date").fill("2026-09-26");
  await page.getByLabel("End date").fill("2026-11-28");
  await page.getByRole("button", { name: "Next" }).click();

  for (const [code, name] of [
    ["MA 211", "Real Analysis"],
    ["PH 203", "Electromagnetism"],
  ]) {
    await page.getByLabel("Course code").fill(code);
    await page.getByLabel("Course name").fill(name);
    await page.getByRole("button", { name: "Add course" }).click();
    await expect(page.getByTestId("wizard-items")).toContainText(code);
  }
  await page.getByRole("button", { name: "Next" }).click();

  const slots: [string, string, string][] = [
    ["MA 211", "3", "09:00"],
    ["MA 211", "1", "10:00"],
    ["PH 203", "3", "11:00"],
  ];
  for (const [code, weekday, time] of slots) {
    await page.getByLabel("Course", { exact: true }).selectOption({ label: `${code} · ${code === "MA 211" ? "Real Analysis" : "Electromagnetism"}` });
    await page.getByLabel("Day").selectOption(weekday);
    await page.getByLabel("Start time").fill(time);
    await page.getByRole("button", { name: "Add slot" }).click();
  }
  await expect(page.getByTestId("wizard-items").locator("li")).toHaveCount(3);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Finish setup" }).click();

  await expect(page).toHaveURL("/today");
  const sessions = page.getByTestId("session");
  await expect(sessions).toHaveCount(2);
  await expect(page.locator('[data-testid=session][data-course="MA 211"]')).toContainText("09:00");
  await expect(page.locator('[data-testid=session][data-course="PH 203"]')).toContainText("11:00");

  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");
});
