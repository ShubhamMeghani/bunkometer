import { expect, test } from "@playwright/test";
import { Users, clickAndSave } from "./helpers/app";

// AC-28 (R34). MA 211 Mon/Wed, PH 203 Tue/Wed; 12–14 Oct holds MA 12, 14 and PH 13, 14 → 4 sessions.
// Existing marks: MA 12 present, PH 13 absent → 2 overwritten.
const users = new Users();
test.afterAll(() => users.cleanup());

test("bulk Medical over 3 days previews and applies", async ({ page }) => {
  await users.create(
    page,
    {
      courses: [
        { code: "MA 211", slots: [{ weekday: 1 }, { weekday: 3 }] },
        { code: "PH 203", slots: [{ weekday: 2, startTime: "11:00" }, { weekday: 3, startTime: "11:00" }] },
      ],
      marks: [
        { course: "MA 211", slot: 0, date: "2026-10-12", status: "present" },
        { course: "PH 203", slot: 0, date: "2026-10-13", status: "absent" },
      ],
    },
    "2026-10-21",
  );
  await page.goto("/history");
  await page.getByRole("button", { name: "Mark a range" }).click();
  const dialog = page.getByRole("dialog", { name: "Mark a range" });
  await dialog.getByLabel("From").fill("2026-10-12");
  await dialog.getByLabel("To").fill("2026-10-14");
  await expect(dialog.getByTestId("bulk-preview")).toHaveText("4 sessions will be marked Medical (2 existing marks overwritten).");
  await clickAndSave(page, dialog.getByRole("button", { name: "Mark 4 sessions" }));
  await expect(dialog).toBeHidden();

  await page.reload();
  for (const [date, count] of [
    ["2026-10-12", 1],
    ["2026-10-13", 1],
    ["2026-10-14", 2],
  ] as const) {
    await page.locator(`button[data-date="${date}"]`).click();
    const editor = page.getByTestId("day-editor");
    await expect(editor.getByTestId("session")).toHaveCount(count);
    await expect(editor.getByRole("button", { name: "Medical", exact: true, pressed: true })).toHaveCount(count);
  }
});
