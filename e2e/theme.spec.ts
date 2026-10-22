import { expect, test } from "@playwright/test";

// AC-36 (R44): dark by default, Light persists, System follows the OS, applied by an inline head script.
const theme = (page: import("@playwright/test").Page) => page.locator("html").getAttribute("data-theme");

test("dark by default even when the device prefers light", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/demo");
  expect(await theme(page)).toBe("dark");
});

test("Light persists; System follows the emulated scheme", async ({ page }) => {
  await page.goto("/demo/settings");
  await page.getByText("Light", { exact: true }).click();
  expect(await theme(page)).toBe("light");
  await page.reload();
  expect(await theme(page)).toBe("light");

  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByText("System", { exact: true }).click();
  expect(await theme(page)).toBe("dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => theme(page)).toBe("light");
  await page.reload();
  expect(await theme(page)).toBe("light");
});

test("the theme is set by an inline <head> script in the server HTML", async ({ request }) => {
  const html = await (await request.get("/")).text();
  const head = html.slice(0, html.indexOf("</head>"));
  expect(head).toContain("localStorage.getItem('theme')");
  expect(head).toContain("setAttribute('data-theme'");
});
