import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// AC-9 (R28) and SPEC C7: the engine never reads the clock and imports nothing outside itself.
const DIR = join(process.cwd(), "src", "lib", "engine");

describe("AC-9 engine purity", () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".ts"));

  it("has engine files to check", () => {
    expect(files.length).toBeGreaterThan(3);
  });

  for (const file of files) {
    it(`${file} has no clock reads and only relative imports`, () => {
      const src = readFileSync(join(DIR, file), "utf8");
      expect(src).not.toContain("Date.now(");
      expect(src).not.toMatch(/new Date\(\s*\)/);
      const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
      for (const spec of imports) expect(spec.startsWith("./")).toBe(true);
    });
  }
});
