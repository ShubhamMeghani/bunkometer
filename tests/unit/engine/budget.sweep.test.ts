import { describe, expect, it } from "vitest";
import { budgetFromCounts } from "@/lib/engine/budget";

// AC-2 (R22, R23) brute force against the definitions; AC-3's integer check rides along.
const PS = [0, 50, 75, 80, 85, 100];

function bruteS(H: number, A: number, R: number, p: number): number | null {
  if (100 * (A + R) < p * (H + R)) return null;
  let best = 0;
  for (let k = 0; k <= R; k++) if (100 * (A + R - k) >= p * (H + R)) best = k;
  return best;
}

function bruteN(H: number, A: number, R: number, p: number): number | null {
  for (let n = 0; n <= R; n++) if (100 * (A + n) >= p * (H + n)) return n;
  return null;
}

describe("AC-2 brute-force sweep", () => {
  it("met, S and N match their definitions for every H 0–30, A 0–H, R 0–30, p in the set", () => {
    let cases = 0;
    for (const p of PS)
      for (let H = 0; H <= 30; H++)
        for (let A = 0; A <= H; A++)
          for (let R = 0; R <= 30; R++) {
            const b = budgetFromCounts({ H, A, R, p });
            const met = 100 * A >= p * H;
            if (b.met !== met) throw new Error(`met mismatch H=${H} A=${A} R=${R} p=${p}`);
            const s = bruteS(H, A, R, p);
            if (b.S !== s) throw new Error(`S mismatch H=${H} A=${A} R=${R} p=${p}: ${b.S} vs ${s}`);
            const reachable = s !== null;
            const n = !met && reachable ? bruteN(H, A, R, p) : null;
            if (b.N !== n) throw new Error(`N mismatch H=${H} A=${A} R=${R} p=${p}: ${b.N} vs ${n}`);
            // AC-3: every K, S and N is an integer.
            if (!Number.isInteger(b.K)) throw new Error("K not integer");
            if (b.S !== null && !Number.isInteger(b.S)) throw new Error("S not integer");
            if (b.N !== null && !Number.isInteger(b.N)) throw new Error("N not integer");
            cases++;
          }
    expect(cases).toBe(6 * 496 * 31);
  });
});
