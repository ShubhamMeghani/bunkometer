import { expect, test } from "@playwright/test";
import { Users, courseCard } from "./helpers/app";

// AC-27 (R32, R33). MA 211 meets Mon/Wed/Fri; today Wed 21 Oct; nothing held yet, 17 classes remain (S = 3).
const users = new Users();
test.afterAll(() => users.cleanup());

test("trip verdicts, validation, and nothing saved", async ({ page }) => {
  await users.create(
    page,
    {
      courses: [
        { code: "MA 211", slots: [{ weekday: 1 }, { weekday: 3 }, { weekday: 5 }] },
        { code: "CS 201", slots: [{ weekday: 3, startTime: "14:00", kind: "lab" }] },
      ],
    },
    "2026-10-21",
  );
  await page.goto("/courses");
  const headline = await courseCard(page, "MA 211").getByTestId("headline").innerText();
  expect(headline).toBe("Can skip 3 more");

  await page.getByRole("link", { name: "Plan" }).click();
  // Thu 22 – Wed 28 Oct: MA 211 loses Fri 23, Mon 26, Wed 28 → H 3, A 0, R 14 → K 40 → no skips left; one lab on 28 Oct.
  await page.getByLabel("From").fill("2026-10-22");
  await page.getByLabel("To").fill("2026-10-28");
  await expect(page.getByTestId("verdict")).toHaveAttribute("data-verdict", "careful");
  await expect(page.getByTestId("verdict")).toContainText("Careful");
  const ma = page.locator('[data-testid=trip-course][data-course="MA 211"]');
  await expect(ma).toContainText("3 classes missed");
  await expect(ma).toContainText("No skips left · attend all 14");
  await expect(page.locator('[data-testid=trip-course][data-course="CS 201"]')).toContainText("1 lab would need a makeup");

  // Through Wed 4 Nov: 6 missed → K −260 → No-go.
  await page.getByLabel("To").fill("2026-11-04");
  await expect(page.getByTestId("verdict")).toHaveAttribute("data-verdict", "nogo");
  await expect(page.getByTestId("verdict")).toContainText("No-go");
  await expect(ma).toContainText("6 classes missed");

  await page.getByLabel("From").fill("2026-11-05");
  await expect(page.getByTestId("plan-error")).toHaveText("Start date must be on or before end date");
  await expect(page.getByTestId("verdict")).toHaveCount(0);

  await page.getByRole("link", { name: "Courses" }).click();
  await expect(courseCard(page, "MA 211").getByTestId("headline")).toHaveText(headline);
  await page.reload();
  await expect(courseCard(page, "MA 211").getByTestId("headline")).toHaveText(headline);
});
