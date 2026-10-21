import { randomUUID } from "node:crypto";
import type { BrowserContext, Page } from "@playwright/test";

export function newTestEmail(): string {
  return `${randomUUID()}@e2e.test`;
}

/** Signs in through the test-only credentials provider (SPEC R5); cookies land in the page's context. */
export async function loginAs(page: Page, email: string, callbackUrl = "/today"): Promise<void> {
  const csrf = await page.request.get("/api/auth/csrf");
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };
  const res = await page.request.post("/api/auth/callback/test-login", {
    form: { csrfToken, email, callbackUrl },
    maxRedirects: 0,
  });
  if (res.status() >= 400) throw new Error(`test login failed: ${res.status()}`);
}

/** Pins the server's "today" for this browser context (test mode only). */
export async function setToday(context: BrowserContext, date: string): Promise<void> {
  await context.addCookies([{ name: "e2e_today", value: date, url: "http://localhost:3100" }]);
}
