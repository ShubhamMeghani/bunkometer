import { expect, test } from "@playwright/test";
import { Users, expectPressed, sessionCard } from "./helpers/app";

// AC-23 (R21): a failed save reverts the control and offers Retry.
const users = new Users();
test.afterAll(() => users.cleanup());

test("aborted save shows Retry and restores the previous state", async ({ page }) => {
  await users.create(page, { courses: [{ code: "MA 211", slots: [{ weekday: 3 }] }] }, "2026-10-21");
  await page.goto("/today");
  await expectPressed(page, "MA 211", null);

  await page.route("**/today", (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));
  await sessionCard(page, "MA 211").getByRole("button", { name: "Present", exact: true }).click();

  const alert = page.getByRole("alert").filter({ hasText: "Couldn't save" });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole("button", { name: "Retry" })).toBeVisible();
  await expectPressed(page, "MA 211", null);

  await page.unroute("**/today");
  await alert.getByRole("button", { name: "Retry" }).click();
  await expectPressed(page, "MA 211", "Present");
});
