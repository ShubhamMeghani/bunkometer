import { expect, test } from "@playwright/test";
import { Users, clickAndSave, metric } from "./helpers/app";
import { testDb } from "./helpers/db";
import * as schema from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

// AC-31 (R39, R40, R41).
const users = new Users();
test.afterAll(() => users.cleanup());

test("publish → signed-out preview → import → revoke", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  const a = await users.create(
    pageA,
    {
      courses: [
        { code: "MA 211", name: "Real Analysis", windowMode: "split", slots: [{ weekday: 1 }, { weekday: 3 }] },
        { code: "CS 201", name: "Data Structures", slots: [{ weekday: 3, startTime: "14:00", kind: "lab" }] },
      ],
      periods: [{ startDate: "2026-10-02", endDate: "2026-10-02", label: "Gandhi Jayanti" }],
      marks: [{ course: "MA 211", slot: 0, date: "2026-10-12", status: "absent" }],
    },
    "2026-10-21",
  );
  const [owner] = await testDb().select().from(schema.users).where(eq(schema.users.googleId, `test:${a.email}`));

  await pageA.goto("/settings");
  await clickAndSave(pageA, pageA.getByRole("button", { name: "Publish template link" }));
  const link = await pageA.getByTestId("share-link").innerText();
  expect(link).toMatch(/^\/share\/[A-Za-z0-9_-]{22}$/);

  // Signed out: timetable visible, nothing personal.
  const anon = await browser.newContext();
  const pageAnon = await anon.newPage();
  await pageAnon.goto(link);
  await expect(pageAnon.getByTestId("template-course")).toHaveCount(2);
  await expect(pageAnon.getByText("Real Analysis")).toBeVisible();
  await expect(pageAnon.getByText("Monday 09:00–10:00 · Lecture")).toBeVisible();
  await expect(pageAnon.getByText("Gandhi Jayanti")).toBeVisible();
  const body = await pageAnon.locator("body").innerText();
  expect(body).not.toContain(a.email);
  expect(body).not.toContain(owner.name);
  expect(body).not.toMatch(/Absent|Present|Medical/);
  await expect(pageAnon.getByRole("button", { name: "Sign in with Google to import" })).toBeVisible();

  // B imports.
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await users.create(pageB, null, "2026-10-21");
  await pageB.goto(link);
  await pageB.getByRole("button", { name: "Import as my semester" }).click();
  await expect(pageB).toHaveURL("/today");
  await pageB.goto("/courses");
  await expect(pageB.getByTestId("course-card")).toHaveCount(2);
  expect(await metric(pageB, "MA 211", "Held")).toBe("0");

  // A revokes; the link dies, B's copy stays.
  await clickAndSave(pageA, pageA.getByRole("button", { name: "Revoke link" }));
  const gone = await pageAnon.goto(link);
  expect(gone?.status()).toBe(404);
  await expect(pageAnon.getByRole("heading", { name: "This link is no longer active" })).toBeVisible();
  await pageB.reload();
  await expect(pageB.getByTestId("course-card")).toHaveCount(2);

  await Promise.all([ctxA.close(), ctxB.close(), anon.close()]);
});
