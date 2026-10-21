import { describe, expect, it } from "vitest";
import { budgetFromCounts, formatPct } from "@/lib/engine/budget";

// AC-3 (R23): truncation, never rounding; the pass line is the integer test.
describe("AC-3 percentage formatting", () => {
  it("pct(399,499) is 79.9% and is not met at 80", () => {
    expect(formatPct(399, 499)).toBe("79.9%");
    expect(budgetFromCounts({ H: 499, A: 399, R: 0, p: 80 }).met).toBe(false);
  });

  it("pct(39,49) is 79.5% (rounding would give 79.6%)", () => {
    expect(formatPct(39, 49)).toBe("79.5%");
  });

  it("pct(4,5) is 80.0% and is met at 80", () => {
    expect(formatPct(4, 5)).toBe("80.0%");
    expect(budgetFromCounts({ H: 5, A: 4, R: 0, p: 80 }).met).toBe(true);
  });

  it("pct(0,0) is —", () => {
    expect(formatPct(0, 0)).toBe("—");
  });

  it("whole and zero percentages keep one decimal", () => {
    expect(formatPct(5, 5)).toBe("100.0%");
    expect(formatPct(0, 7)).toBe("0.0%");
    expect(formatPct(11, 16)).toBe("68.7%");
  });
});
