import { expect, test } from "@playwright/test";
import { loginAs, newTestEmail } from "./helpers/auth";
import { deleteTestUser } from "./helpers/db";

// Phase 1 smoke: supports AC-18 (redirects) and AC-19 (test login lands on /setup).
test("signed-out visitors are redirected to the landing page", async ({ page }) => {
  for (const path of ["/today", "/courses", "/plan", "/history", "/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL("/");
  }
  await expect(page.getByRole("button", { name: "Sign in with Google" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Try the demo" })).toBeVisible();
});

test("health endpoint answers locally", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true, db: true });
});

test("test login lands a new user on /setup", async ({ page }) => {
  const email = newTestEmail();
  try {
    await loginAs(page, email);
    await page.goto("/today");
    await expect(page).toHaveURL("/setup");
  } finally {
    await deleteTestUser(email);
  }
});
