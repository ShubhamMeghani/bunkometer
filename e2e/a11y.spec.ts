import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { Users } from "./helpers/app";
import { setShareToken } from "./helpers/fixtures";
import { RICH } from "./helpers/rich";

// AC-38 (R46): WCAG 2.1 AA contrast in both themes, no serious/critical axe violations, status never colour-only.
const users = new Users();
test.afterAll(() => users.cleanup());
const TOKEN = "A11ySpecToken_0123456789ab";

async function audit(page: Page, path: string, theme: "dark" | "light") {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  expect(await page.locator("html").getAttribute("data-theme")).toBe(theme);
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const contrast = result.violations.filter((v) => v.id === "color-contrast");
  const severe = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const describe = (vs: typeof result.violations) =>
    vs.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`).join("\n");
  expect(contrast, `${theme} ${path}\n${describe(contrast)}`).toEqual([]);
  expect(severe, `${theme} ${path}\n${describe(severe)}`).toEqual([]);
  for (const chip of await page.locator("span[data-status]").all()) expect((await chip.innerText()).trim().length).toBeGreaterThan(1);
}

for (const theme of ["dark", "light"] as const) {
  test(`axe audit, ${theme} theme`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
    await audit(page, "/", theme);
    await audit(page, "/privacy", theme);
    await audit(page, "/demo", theme);
    await audit(page, "/demo/courses", theme);

    const { fixture } = await users.create(page, RICH, "2026-10-21");
    await setShareToken(fixture!.semesterId, `${TOKEN}${theme}`);
    for (const path of ["/today", "/courses", "/plan", "/history", "/settings", `/share/${TOKEN}${theme}`]) await audit(page, path, theme);
  });
}
