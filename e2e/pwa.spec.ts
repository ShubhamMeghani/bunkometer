import { expect, test } from "@playwright/test";
import { Users, sessionCard } from "./helpers/app";
import { RICH } from "./helpers/rich";

// AC-39 (R47): manifest and icons, service worker, offline notice with marking disabled.
const users = new Users();
test.afterAll(() => users.cleanup());

test("manifest has the required fields and icons", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m).toMatchObject({ name: "Bunk-o-Meter", short_name: "Bunk-o-Meter", display: "standalone", start_url: "/today" });
  expect(m.theme_color).toBeTruthy();
  expect(m.background_color).toBeTruthy();
  const sizes = m.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}/${i.purpose}`);
  expect(sizes).toEqual(expect.arrayContaining(["192x192/any", "512x512/any", "512x512/maskable"]));
  for (const icon of m.icons) {
    const r = await request.get(icon.src);
    expect(r.status(), icon.src).toBe(200);
    expect(r.headers()["content-type"]).toContain("image/png");
  }
});

test("service worker is ready; offline reload shows a notice and disables marking", async ({ page, context }) => {
  await users.create(page, RICH, "2026-10-21");
  await page.goto("/today");
  expect(await page.evaluate(async () => !!(await navigator.serviceWorker.ready))).toBe(true);
  await page.reload(); // now controlled by the service worker, which caches the page and its assets
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.waitForLoadState("networkidle");

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("status").filter({ hasText: "You're offline" })).toBeVisible();
  const present = sessionCard(page, "MA 211").getByRole("button", { name: "Present", exact: true });
  await expect(present).toBeDisabled();
  await context.setOffline(false);
});
