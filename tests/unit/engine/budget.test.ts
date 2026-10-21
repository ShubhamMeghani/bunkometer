import { describe, expect, it } from "vitest";
import { budgetFromCounts } from "@/lib/engine/budget";

// AC-1 (R22, R27): every row of SPEC §4.4.6.
const ROWS = [
  ["E1", 80, 20, 17, 20, "85.0%", "92.5%", 500, 5, null, "safe", "Can skip 5 more"],
  ["E2", 80, 20, 17, 5, "85.0%", "88.0%", 200, 2, null, "warning", "Can skip 2 more"],
  ["E3", 80, 10, 7, 20, "70.0%", "90.0%", 300, 3, 5, "warning", "Attend next 5 to reach 80%"],
  ["E4", 80, 30, 20, 5, "66.6%", "71.4%", -300, null, null, "danger", "Can't recover in this window · best 71.4%"],
  ["E5", 80, 12, 10, 2, "83.3%", "85.7%", 80, 0, null, "danger", "No skips left · attend all 2"],
  ["E6", 80, 0, 0, 40, "—", "100.0%", 800, 8, null, "safe", "Can skip 8 more"],
  ["E7", 80, 0, 0, 0, "—", "—", 0, 0, null, "none", "No classes in this window"],
  ["E8", 80, 49, 39, 0, "79.5%", "79.5%", -20, null, null, "danger", "Final 79.5% · below 80%"],
  ["E9", 80, 25, 20, 0, "80.0%", "80.0%", 0, 0, null, "safe", "Final 80.0% · meets 80%"],
  ["E10", 100, 10, 10, 10, "100.0%", "100.0%", 0, 0, null, "danger", "No skips left · attend all 10"],
  ["E11", 100, 11, 10, 9, "90.9%", "95.0%", -100, null, null, "danger", "Can't recover in this window · best 95.0%"],
  ["E12", 0, 5, 0, 10, "0.0%", "66.6%", 1000, 10, null, "safe", "Can skip 10 more"],
  ["E13", 80, 499, 399, 0, "79.9%", "79.9%", -20, null, null, "danger", "Final 79.9% · below 80%"],
  ["E14", 80, 10, 5, 6, "50.0%", "68.7%", -180, null, null, "danger", "Can't recover in this window · best 68.7%"],
] as const;

describe("AC-1 worked examples E1–E14", () => {
  for (const [id, p, H, A, R, cur, best, K, S, N, status, headline] of ROWS) {
    it(`${id}: p=${p} H=${H} A=${A} R=${R}`, () => {
      const b = budgetFromCounts({ H, A, R, p });
      expect({ cur: b.cur, best: b.best, K: b.K, S: b.S, N: b.N, status: b.status, headline: b.headline }).toEqual({
        cur,
        best,
        K,
        S,
        N,
        status,
        headline,
      });
    });
  }

  it("E1 check: skipping 5 ends at exactly 80% (passes), skipping 6 fails", () => {
    expect(100 * (17 + 20 - 5) >= 80 * 40).toBe(true);
    expect(100 * (17 + 20 - 6) >= 80 * 40).toBe(false);
  });
});
