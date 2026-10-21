import { expect, test } from "@playwright/test";
import { Users, clickAndSave, courseCard, sessionCard } from "./helpers/app";

// AC-26 (R30, R31): a missed lab becomes a pending makeup until completed.
const users = new Users();
test.afterAll(() => users.cleanup());

test("lab marked Absent → pending makeup → date → completed", async ({ page }) => {
  await users.create(
    page,
    { courses: [{ code: "CS 201", slots: [{ weekday: 2 }, { weekday: 3, startTime: "14:00", kind: "lab" }] }] },
    "2026-10-21",
  );
  await page.goto("/today");
  await clickAndSave(page, sessionCard(page, "CS 201", "lab").getByRole("button", { name: "Absent", exact: true }));
  await expect(page.getByTestId("makeup-banner")).toHaveText("1 pending makeup");

  await page.getByRole("link", { name: "Courses" }).click();
  await expect(courseCard(page, "CS 201").getByTestId("lab-line")).toContainText("1 pending makeup");

  await page.getByRole("link", { name: "Today" }).click();
  await page.getByTestId("makeup-banner").click();
  const item = page.getByTestId("makeup");
  const saved = page.waitForResponse((r) => r.request().method() === "POST");
  await item.getByLabel("Makeup date").fill("2026-10-30");
  await saved;
  await page.reload();
  await expect(page.getByTestId("makeup-banner")).toHaveText("1 pending makeup");
  await page.getByRole("link", { name: "Courses" }).click();
  await expect(courseCard(page, "CS 201").getByTestId("lab-line")).toContainText("1 pending makeup");

  await page.getByRole("link", { name: "Today" }).click();
  await page.getByTestId("makeup-banner").click();
  await clickAndSave(page, page.getByTestId("makeup").getByRole("button", { name: "Mark completed" }));
  await expect(page.getByTestId("makeup-banner")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("makeup-banner")).toHaveCount(0);
  await page.getByRole("link", { name: "Courses" }).click();
  await expect(courseCard(page, "CS 201").getByTestId("lab-line")).not.toContainText("pending");
});
