import { expect, test } from "@playwright/test";
import { Users } from "./helpers/app";
import { createFixture } from "./helpers/fixtures";

// AC-34 (R14): switching semesters shows only the active one's data.
const users = new Users();
test.afterAll(() => users.cleanup());

test("create and switch between two semesters", async ({ page }) => {
  const { email } = await users.create(page, { name: "Sem One", courses: [{ code: "AA 101", slots: [{ weekday: 3 }] }] }, "2026-10-21");
  await createFixture(email, { name: "Sem Two", courses: [{ code: "BB 202", slots: [{ weekday: 3 }] }] });

  await page.goto("/courses");
  await expect(page.getByTestId("course-card")).toHaveCount(1);
  await expect(page.getByTestId("course-card")).toHaveAttribute("data-course", "BB 202");
  await page.goto("/today");
  await expect(page.getByTestId("session")).toHaveAttribute("data-course", "BB 202");

  await page.goto("/settings");
  await page.getByLabel("Active semester").selectOption({ label: "Sem One" });
  await page.getByRole("button", { name: "Switch" }).click();
  await expect(page.getByLabel("Active semester")).toHaveValue(/.+/);
  await page.getByRole("link", { name: "Courses" }).click();
  await expect(page.getByTestId("course-card")).toHaveAttribute("data-course", "AA 101");
  await page.getByRole("link", { name: "Today" }).click();
  await expect(page.getByTestId("session")).toHaveAttribute("data-course", "AA 101");

  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByLabel("Active semester").selectOption({ label: "Sem Two" });
  await page.getByRole("button", { name: "Switch" }).click();
  await page.getByRole("link", { name: "Courses" }).click();
  await expect(page.getByTestId("course-card")).toHaveAttribute("data-course", "BB 202");
});
