import { expect, test } from "@playwright/test";
import { Users, courseCard } from "./helpers/app";

// AC-49 (R7, R8, R9, R52).
const users = new Users();
test.afterAll(() => users.cleanup());

test("setup without a midsem date; split is unavailable until one exists", async ({ page }) => {
  await users.create(page, null, "2026-10-21");
  await page.goto("/setup");
  await expect(page.getByText("Only needed if a course counts attendance separately for midsem and endsem.")).toBeVisible();
  await page.getByLabel("Semester name").fill("Short term");
  await page.getByLabel("Start date").fill("2026-08-03");
  await page.getByLabel("End date").fill("2026-11-28");
  await page.getByRole("button", { name: "Next" }).click();

  const split = page.getByLabel("Evaluation window").locator("option[value=split]");
  await expect(split).toBeDisabled();
  await expect(page.getByText("Add a midsem date in step 1 (Dates) to use split windows.")).toBeVisible();
  await page.getByLabel("Course code").fill("MA 211");
  await page.getByLabel("Course name").fill("Real Analysis");
  await page.getByRole("button", { name: "Add course" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Day").selectOption("3");
  await page.getByRole("button", { name: "Add slot" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page).toHaveURL("/today");
  await expect(page.getByTestId("session")).toHaveCount(1);

  await page.goto("/settings");
  await page.getByRole("button", { name: "+ Add course" }).click();
  const dialog = page.getByRole("dialog", { name: "Add course" });
  await expect(dialog.getByLabel("Evaluation window").locator("option[value=split]")).toBeDisabled();
  await expect(dialog.getByText("Add a midsem date under Settings → Semester to use split windows.")).toBeVisible();
});

test("removing the midsem date is blocked while a split course exists; split windows still work", async ({ page }) => {
  await users.create(
    page,
    {
      courses: [
        { code: "PH 203", windowMode: "split", slots: [{ weekday: 2 }] },
        { code: "MA 211", windowMode: "whole", slots: [{ weekday: 3 }] },
      ],
      marks: [{ course: "PH 203", date: "2026-08-04", status: "present" }],
    },
    "2026-10-21",
  );
  await page.goto("/courses");
  await expect(courseCard(page, "PH 203").getByTestId("current-window")).toContainText("Endsem window");
  await expect(courseCard(page, "PH 203").getByTestId("other-window")).toContainText("Midsem window");

  await page.goto("/settings");
  await page.getByLabel("Midsem date (optional)").fill("");
  await page.getByRole("button", { name: "Save semester" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "PH 203 uses split midsem/endsem windows" })).toContainText("whole semester first");

  await page.reload();
  await expect(page.getByLabel("Midsem date (optional)")).toHaveValue("2026-09-26");
  await page.goto("/courses");
  await expect(courseCard(page, "PH 203").getByTestId("current-window")).toContainText("Endsem window");
});
