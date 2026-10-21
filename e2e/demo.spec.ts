import { expect, test } from "@playwright/test";
import { expectPressed, sessionCard } from "./helpers/app";

// AC-35 (R42, R43): /demo needs no account, keeps changes in this browser only, and never POSTs.
test("demo: banner, seeded state, local persistence, reset, no POST requests", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });

  await page.goto("/demo");
  await expect(page.getByRole("note", { name: "Demo mode" })).toContainText("Demo");
  await expect(page.getByText("Wed, 21 Oct", { exact: false }).first()).toBeVisible();
  await expect(page.getByTestId("session")).toHaveCount(3);

  await page.getByRole("link", { name: "Courses" }).click();
  await expect(page).toHaveURL("/demo/courses");
  await expect(page.locator('[data-testid=course-card][data-status=danger]')).toHaveCount(1);
  await expect(page.locator('[data-testid=course-card][data-status=danger]')).toHaveAttribute("data-course", "PH 203");
  await expect(page.locator('[data-testid=course-card][data-course="CS 201"] [data-testid=lab-line]')).toContainText("1 pending makeup");

  await page.getByRole("link", { name: "Today" }).click();
  await sessionCard(page, "MA 211").getByRole("button", { name: "Absent", exact: true }).click();
  await expectPressed(page, "MA 211", "Absent");
  await page.reload();
  await expectPressed(page, "MA 211", "Absent");

  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.getByRole("link", { name: "Today" }).click();
  await expectPressed(page, "MA 211", null);
  await page.reload();
  await expectPressed(page, "MA 211", null);

  await expect(page.getByRole("button", { name: "Publish template link" })).toHaveCount(0);
  expect(posts).toEqual([]);
});
