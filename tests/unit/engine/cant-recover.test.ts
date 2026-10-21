import { describe, expect, it } from "vitest";
import { budgetFromCounts, formatPct } from "@/lib/engine/budget";

// AC-46 (R22, R27), decision OQ-6.
describe("AC-46 Can't recover in this window", () => {
  it("E4, E11 and E14 are danger with the exact headline", () => {
    expect(budgetFromCounts({ H: 30, A: 20, R: 5, p: 80 })).toMatchObject({
      status: "danger",
      headline: "Can't recover in this window · best 71.4%",
    });
    expect(budgetFromCounts({ H: 11, A: 10, R: 9, p: 100 })).toMatchObject({
      status: "danger",
      headline: "Can't recover in this window · best 95.0%",
    });
    expect(budgetFromCounts({ H: 10, A: 5, R: 6, p: 80 })).toMatchObject({
      status: "danger",
      headline: "Can't recover in this window · best 68.7%",
      best: "68.7%",
    });
  });

  it("every R > 0, K < 0 case in the sweep gets the headline with best = floor(1000(A+R)/(H+R))/10", () => {
    let hits = 0;
    for (const p of [0, 50, 75, 80, 85, 100])
      for (let H = 0; H <= 30; H++)
        for (let A = 0; A <= H; A++)
          for (let R = 1; R <= 30; R++) {
            const b = budgetFromCounts({ H, A, R, p });
            if (b.K >= 0) continue;
            hits++;
            const tenths = Math.floor((1000 * (A + R)) / (H + R));
            const best = `${Math.floor(tenths / 10)}.${tenths % 10}%`;
            if (b.best !== best || b.best !== formatPct(A + R, H + R)) throw new Error(`best mismatch ${H} ${A} ${R} ${p}`);
            if (b.status !== "danger" || b.headline !== `Can't recover in this window · best ${best}`)
              throw new Error(`headline mismatch ${H} ${A} ${R} ${p}: ${b.headline}`);
          }
    expect(hits).toBeGreaterThan(1000);
  });

  it("a window with R = 0 that is not met shows the final result instead", () => {
    expect(budgetFromCounts({ H: 30, A: 20, R: 0, p: 80 }).headline).toBe("Final 66.6% · below 80%");
  });
});
