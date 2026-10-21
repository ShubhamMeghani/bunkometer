import { expect, test } from "@playwright/test";
import { Users, courseCard } from "./helpers/app";

// AC-25 (R29, R26): current window first, the other beneath, text status on every card, danger above safe.
const users = new Users();
test.afterAll(() => users.cleanup());

test("split-window course card and ordering", async ({ page }) => {
  // PH 203 (split, Tue/Thu): midsem 2 present; endsem H 7, A 4, R 11 → K 60 → S 0 → danger.
  const endsem = [
    ["2026-09-29", "absent"],
    ["2026-10-01", "absent"],
    ["2026-10-06", "absent"],
    ["2026-10-08", "present"],
    ["2026-10-13", "present"],
    ["2026-10-15", "present"],
    ["2026-10-20", "present"],
  ] as const;
  await users.create(
    page,
    {
      courses: [
        { code: "MA 211", windowMode: "whole", slots: [{ weekday: 1 }, { weekday: 3 }, { weekday: 5 }] }, // R 17 → S 3, safe
        { code: "PH 203", windowMode: "split", slots: [{ weekday: 2 }, { weekday: 4 }] },
      ],
      marks: [
        { course: "PH 203", slot: 0, date: "2026-08-04", status: "present" },
        { course: "PH 203", slot: 1, date: "2026-08-06", status: "present" },
        ...endsem.map(([date, status]) => ({ course: "PH 203", slot: date === "2026-09-29" || date === "2026-10-06" || date === "2026-10-13" || date === "2026-10-20" ? 0 : 1, date, status })),
      ],
    },
    "2026-10-21",
  );
  await page.goto("/courses");
  const cards = page.getByTestId("course-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toHaveAttribute("data-course", "PH 203");
  await expect(cards.nth(1)).toHaveAttribute("data-course", "MA 211");

  const ph = courseCard(page, "PH 203");
  await expect(ph.locator("[data-status]").first()).toHaveText(/Danger/);
  await expect(ph.getByTestId("current-window")).toContainText("Endsem window");
  await expect(ph.getByTestId("headline")).toHaveText("No skips left · attend all 11");
  await expect(ph.getByTestId("other-window")).toContainText("Midsem window");
  await expect(ph.getByTestId("other-window")).toContainText("Final 100.0% · meets 80%");

  const ma = courseCard(page, "MA 211");
  await expect(ma.locator("span[data-status]")).toHaveText(/Safe/);
  for (const card of await cards.all()) await expect(card.locator("span[data-status]")).not.toHaveText("");
});
