import { expect, test } from "@playwright/test";
import { newTestEmail } from "./helpers/auth";
import { deleteTestUser } from "./helpers/db";
import { createFixture, setShareToken } from "./helpers/fixtures";

// AC-18 (R1): signed-out access rules.
const owner = newTestEmail();
test.afterAll(() => deleteTestUser(owner));

test("signed-out visitors: app routes redirect, public routes don't", async ({ page }) => {
  for (const path of ["/today", "/courses", "/plan", "/history", "/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL("/");
  }
  await expect(page.getByRole("button", { name: "Sign in with Google" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Try the demo" })).toBeVisible();

  const fixture = await createFixture(owner, { courses: [{ code: "MA 211", slots: [{ weekday: 1 }] }] });
  const token = "AccessSpecToken_0123456789ab";
  await setShareToken(fixture.semesterId, token);

  for (const path of ["/demo", `/share/${token}`]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(path);
  }
  const health = await page.request.get("/api/health", { maxRedirects: 0 });
  expect(health.status()).toBe(200);
});
