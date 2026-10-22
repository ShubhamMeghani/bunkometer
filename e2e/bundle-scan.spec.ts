import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { Users } from "./helpers/app";
import { setShareToken } from "./helpers/fixtures";
import { RICH } from "./helpers/rich";

// AC-40 (R4): no browser JavaScript contains a database driver, connection string or secret name.
const FORBIDDEN = ["postgres://", "postgresql://", "DATABASE_URL", "AUTH_SECRET", "AUTH_GOOGLE_SECRET", "@neondatabase"];
const users = new Users();
test.afterAll(() => users.cleanup());

function offenders(name: string, body: string): string[] {
  return FORBIDDEN.filter((f) => body.includes(f)).map((f) => `${name}: ${f}`);
}

test("JavaScript loaded by every screen is free of DB drivers and secrets", async ({ page }) => {
  const scripts = new Map<string, string>();
  page.on("response", async (res) => {
    const type = res.headers()["content-type"] ?? "";
    if (!type.includes("javascript")) return;
    try {
      scripts.set(res.url(), await res.text());
    } catch {
      // redirects and aborted bodies have no text
    }
  });

  for (const path of ["/", "/demo", "/demo/courses", "/demo/plan", "/demo/history", "/demo/settings"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  const { fixture } = await users.create(page, RICH, "2026-10-21");
  await setShareToken(fixture!.semesterId, "BundleScanToken_0123456789");
  for (const path of ["/today", "/courses", "/plan", "/history", "/settings", "/setup", "/share/BundleScanToken_0123456789"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }

  expect(scripts.size).toBeGreaterThan(5);
  const found = [...scripts].flatMap(([url, body]) => offenders(url, body));
  expect(found).toEqual([]);
});

test("every file in the client build output is free of DB drivers and secrets", async () => {
  const root = join(process.cwd(), ".next", "static");
  const files = (await readdir(root, { recursive: true })).filter((f) => f.endsWith(".js"));
  expect(files.length).toBeGreaterThan(5);
  const found: string[] = [];
  for (const f of files) found.push(...offenders(f, await readFile(join(root, f), "utf8")));
  expect(found).toEqual([]);
});
