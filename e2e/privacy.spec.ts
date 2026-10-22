import { expect, test } from "@playwright/test";
import { Users } from "./helpers/app";

// AC-47 (R51, R1): public privacy policy, linked from the landing footer and Settings.
const users = new Users();
test.afterAll(() => users.cleanup());

test("signed out: /privacy is public and says what it must", async ({ page }) => {
  const res = await page.goto("/privacy");
  expect(res?.status()).toBe(200);
  await expect(page).toHaveURL("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeVisible();
  const text = await page.locator("main").innerText();
  for (const phrase of [
    "name, email address and Google ID",
    "your attendance data",
    "We don’t share or sell your data",
    "There are no ads.",
    "There is no tracking or analytics",
    "Settings → Account → Delete account",
  ])
    expect(text.replace(/'/g, "’")).toContain(phrase);
  await expect(page.getByTestId("privacy-contact")).toContainText("Questions about your data:");
});

test("landing footer links to /privacy", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL("/privacy");
});

test("Settings links to /privacy (signed in and in the demo)", async ({ page }) => {
  await page.goto("/demo/settings");
  await page.getByRole("link", { name: "Privacy policy" }).click();
  await expect(page).toHaveURL("/privacy");

  await users.create(page, { courses: [{ code: "MA 211", slots: [{ weekday: 3 }] }] }, "2026-10-21");
  await page.goto("/settings");
  await page.getByRole("link", { name: "Privacy policy" }).click();
  await expect(page).toHaveURL("/privacy");
});
