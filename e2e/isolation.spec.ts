import { expect, test } from "@playwright/test";
import { Users, expectPressed, sessionCard } from "./helpers/app";
import { sessionRowsFor } from "./helpers/fixtures";

// AC-32 (R3): one user can neither see nor change another user's records.
const users = new Users();
test.afterAll(() => users.cleanup());

test("user B gets 404 for A's course and cannot mark A's session", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  const a = await users.create(pageA, { courses: [{ code: "AA 101", slots: [{ weekday: 3 }] }] }, "2026-10-21");
  const aCourse = a.fixture!.courseIds["AA 101"];
  const aSlot = a.fixture!.slotIds["AA 101"][0];

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  const b = await users.create(pageB, { courses: [{ code: "BB 202", slots: [{ weekday: 3 }] }] }, "2026-10-21");
  const bSlot = b.fixture!.slotIds["BB 202"][0];

  const res = await pageB.goto(`/courses/${aCourse}`);
  expect(res?.status()).toBe(404);

  // Replay B's own mark request with A's slot id.
  await pageB.goto("/today");
  await pageB.route("**/today", async (route) => {
    const req = route.request();
    if (req.method() !== "POST") return route.continue();
    await route.continue({ postData: (req.postData() ?? "").replaceAll(bSlot, aSlot) });
  });
  await sessionCard(pageB, "BB 202").getByRole("button", { name: "Present", exact: true }).click();
  await expect(pageB.getByRole("alert").filter({ hasText: "Not found" })).toBeVisible();
  await expectPressed(pageB, "BB 202", null);

  expect(await sessionRowsFor(aCourse)).toHaveLength(0);
  await pageA.goto("/today");
  await expectPressed(pageA, "AA 101", null);
  await ctxA.close();
  await ctxB.close();
});
