import { expect, test } from "@playwright/test";
import { Users, clickAndSave, expectPressed, metric, sessionCard } from "./helpers/app";

// AC-24 (R11, R13): holidays hide sessions but keep their marks; deleting a course with marks asks first.
const users = new Users();
test.afterAll(() => users.cleanup());

test("holiday on a marked day hides it; removing the holiday restores the mark", async ({ page }) => {
  await users.create(
    page,
    {
      courses: [{ code: "MA 211", slots: [{ weekday: 1 }] }],
      marks: [
        { course: "MA 211", date: "2026-10-12", status: "present" },
        { course: "MA 211", date: "2026-10-19", status: "absent" },
      ],
    },
    "2026-10-19",
  );
  await page.goto("/today");
  await expectPressed(page, "MA 211", "Absent");
  await page.getByRole("link", { name: "Courses" }).click();
  await expect.poll(() => metric(page, "MA 211", "Held")).toBe("2");

  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("button", { name: "+ Add period" }).click();
  const dialog = page.getByRole("dialog", { name: "Add holiday or exams" });
  await dialog.getByLabel("Label").fill("Institute holiday");
  await dialog.getByLabel("From").fill("2026-10-19");
  await dialog.getByLabel("To").fill("2026-10-19");
  await clickAndSave(page, dialog.getByRole("button", { name: "Add period" }));
  await expect(page.getByTestId("period")).toContainText("Institute holiday");

  await page.reload();
  await page.getByRole("link", { name: "Today" }).click();
  await expect(page.getByTestId("empty-state")).toHaveText("Institute holiday");
  await page.getByRole("link", { name: "Courses" }).click();
  await expect.poll(() => metric(page, "MA 211", "Held")).toBe("1");

  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Delete Institute holiday" }).click();
  await clickAndSave(page, page.getByRole("dialog").getByRole("button", { name: "Delete" }));
  await expect(page.getByTestId("period")).toHaveCount(0);
  await page.reload();
  await page.getByRole("link", { name: "Today" }).click();
  await expect(sessionCard(page, "MA 211")).toBeVisible();
  await expectPressed(page, "MA 211", "Absent");
});

test("deleting a course with 3 marks says so; Cancel keeps it", async ({ page }) => {
  await users.create(
    page,
    {
      courses: [{ code: "CH 201", slots: [{ weekday: 1 }] }],
      marks: ["2026-08-03", "2026-08-10", "2026-08-17"].map((date) => ({ course: "CH 201", date, status: "present" as const })),
    },
    "2026-10-21",
  );
  await page.goto("/settings");
  const course = page.locator('[data-testid=settings-course][data-course="CH 201"]');
  await course.getByRole("button", { name: "Delete", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Delete CH 201?" });
  await expect(dialog).toContainText("3 marks will be deleted");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(page.locator('[data-testid=settings-course][data-course="CH 201"]')).toBeVisible();
});
