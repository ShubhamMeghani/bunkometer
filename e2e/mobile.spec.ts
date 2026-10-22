import { expect, test, type Page } from "@playwright/test";
import { Users } from "./helpers/app";
import { RICH } from "./helpers/rich";

// AC-37 (R45): 360 px wide, no horizontal scroll, 5-tab bottom nav, 44×44 targets for marking and nav.
test.use({ viewport: { width: 360, height: 740 } });
const users = new Users();
test.afterAll(() => users.cleanup());

async function checkPage(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width, `${path} scrollWidth`).toBeLessThanOrEqual(360);
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link")).toHaveCount(5);
  const targets = [...(await nav.getByRole("link").all()), ...(await page.locator("[role=group][aria-label^='Mark '] button").all())];
  for (const t of targets) {
    const box = await t.boundingBox();
    expect(box, `${path} target box`).not.toBeNull();
    expect(box!.width, `${path} target width`).toBeGreaterThanOrEqual(44);
    expect(box!.height, `${path} target height`).toBeGreaterThanOrEqual(44);
  }
  return targets.length;
}

test("signed-in screens at 360 px", async ({ page }) => {
  await users.create(page, RICH, "2026-10-21");
  for (const path of ["/today", "/courses", "/plan", "/history", "/settings"]) {
    const n = await checkPage(page, path);
    if (path === "/today" || path === "/history") expect(n).toBeGreaterThan(5);
  }
});

test("demo at 360 px", async ({ page }) => {
  expect(await checkPage(page, "/demo")).toBeGreaterThan(5);
});
