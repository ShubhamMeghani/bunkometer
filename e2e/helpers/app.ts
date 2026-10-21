import { expect, type Locator, type Page } from "@playwright/test";
import { loginAs, newTestEmail, setToday } from "./auth";
import { deleteTestUser } from "./db";
import { createFixture, type Fixture, type FixtureSpec } from "./fixtures";

/** Tracks test users so every spec file can delete them afterwards (PLAN rule 11). */
export class Users {
  private emails: string[] = [];

  async create(page: Page, spec: FixtureSpec | null, today: string): Promise<{ email: string; fixture: Fixture | null }> {
    const email = newTestEmail();
    this.emails.push(email);
    const fixture = spec ? await createFixture(email, spec) : null;
    await setToday(page.context(), today);
    await loginAs(page, email);
    return { email, fixture };
  }

  track(email: string) {
    this.emails.push(email);
  }

  async cleanup() {
    for (const e of this.emails.splice(0)) await deleteTestUser(e);
  }
}

export function sessionCard(page: Page, course: string, kind = "lecture") {
  return page.locator(`[data-testid=session][data-course="${course}"][data-kind=${kind}]`);
}

export function courseCard(page: Page, course: string) {
  return page.locator(`[data-testid=course-card][data-course="${course}"]`);
}

export async function metric(page: Page, course: string, label: string): Promise<string> {
  return (await courseCard(page, course).locator(`[data-testid=current-window] [data-metric="${label}"]`).innerText()).trim();
}

export async function expectPressed(page: Page, course: string, status: string | null, kind = "lecture") {
  const card = sessionCard(page, course, kind);
  for (const s of ["Present", "Absent", "Medical", "Cancelled"]) {
    await expect(card.getByRole("button", { name: s, exact: true })).toHaveAttribute("aria-pressed", String(s === status));
  }
}

/** Clicks and waits for the server action (POST) it triggers to finish. */
export async function clickAndSave(page: Page, target: Locator): Promise<void> {
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.request().headers()["next-action"] !== undefined);
  await target.click();
  await saved;
}
