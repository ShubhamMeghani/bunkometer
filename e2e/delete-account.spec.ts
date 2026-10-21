import { expect, test } from "@playwright/test";
import { Users } from "./helpers/app";
import { loginAs } from "./helpers/auth";
import { setShareToken } from "./helpers/fixtures";

// AC-33 (R6, R41).
const users = new Users();
test.afterAll(() => users.cleanup());

test("delete account → / ; same email starts fresh at /setup ; share link 404", async ({ page }) => {
  const { email, fixture } = await users.create(page, { courses: [{ code: "MA 211", slots: [{ weekday: 3 }] }] }, "2026-10-21");
  const token = "DeleteSpecToken_0123456789";
  await setShareToken(fixture!.semesterId, token);
  expect((await page.goto(`/share/${token}`))?.status()).toBe(200);

  await page.goto("/settings");
  await page.getByRole("button", { name: "Delete account" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete account" });
  await expect(dialog.getByRole("button", { name: "Delete my account" })).toBeDisabled();
  await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
  await dialog.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/today");
  await expect(page).toHaveURL("/");

  await loginAs(page, email);
  await page.goto("/today");
  await expect(page).toHaveURL("/setup");

  expect((await page.goto(`/share/${token}`))?.status()).toBe(404);
});
