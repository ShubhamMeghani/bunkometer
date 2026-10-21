import { describe, expect, it } from "vitest";
import { buildProviders, isTestMode, providerIds, resolveToday } from "@/lib/auth/test-mode";

// AC-14 (R5): test login and the e2e_today override exist only with E2E_TEST_AUTH=1 and no VERCEL.
const NOW = new Date("2026-10-21T10:00:00Z"); // 15:30 IST on 21 Oct

describe("AC-14 test-only auth and clock", () => {
  it("E2E_TEST_AUTH=1 with VERCEL unset: google + test-login, cookie honoured", () => {
    const env = { E2E_TEST_AUTH: "1" };
    expect(isTestMode(env)).toBe(true);
    expect(providerIds(buildProviders(env))).toEqual(["google", "test-login"]);
    expect(resolveToday("2026-12-05", NOW, env)).toBe("2026-12-05");
  });

  it("E2E_TEST_AUTH=1 with VERCEL=1: google only, cookie ignored", () => {
    const env = { E2E_TEST_AUTH: "1", VERCEL: "1" };
    expect(isTestMode(env)).toBe(false);
    expect(providerIds(buildProviders(env))).toEqual(["google"]);
    expect(resolveToday("2026-12-05", NOW, env)).toBe("2026-10-21");
  });

  it("E2E_TEST_AUTH unset: google only, cookie ignored", () => {
    const env = {};
    expect(isTestMode(env)).toBe(false);
    expect(providerIds(buildProviders(env))).toEqual(["google"]);
    expect(resolveToday("2026-12-05", NOW, env)).toBe("2026-10-21");
  });

  it("other flag values do not enable test mode", () => {
    expect(isTestMode({ E2E_TEST_AUTH: "true" })).toBe(false);
    expect(isTestMode({ E2E_TEST_AUTH: "0" })).toBe(false);
  });

  it("ignores a malformed cookie even in test mode", () => {
    expect(resolveToday("2026-13-40", NOW, { E2E_TEST_AUTH: "1" })).toBe("2026-10-21");
  });
});
