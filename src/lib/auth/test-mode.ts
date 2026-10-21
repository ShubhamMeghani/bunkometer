import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { isISODate, todayIST, type ISODate } from "@/lib/engine/dates";

type Env = Record<string, string | undefined>;

export const TEST_PROVIDER_ID = "test-login";
export const E2E_TODAY_COOKIE = "e2e_today";

/** Test-only features exist only when explicitly enabled and never on Vercel (SPEC R5, D12). */
export function isTestMode(env: Env = process.env): boolean {
  return env.E2E_TEST_AUTH === "1" && !env.VERCEL;
}

export function isTestEmail(email: unknown): email is string {
  return typeof email === "string" && email.length <= 200 && /^[a-z0-9._-]+@e2e\.test$/i.test(email);
}

export function buildProviders(env: Env = process.env): Provider[] {
  const providers: Provider[] = [Google];
  if (isTestMode(env)) {
    providers.push(
      Credentials({
        id: TEST_PROVIDER_ID,
        name: "Test login",
        credentials: { email: { label: "Email", type: "email" } },
        authorize: async (credentials) => {
          const email = credentials?.email;
          if (!isTestEmail(email)) return null;
          const lower = email.toLowerCase();
          return { id: `test:${lower}`, email: lower, name: `Test ${lower.split("@")[0]}` };
        },
      }),
    );
  }
  return providers;
}

/** Provider ids as Auth.js resolves them (`options.id` overrides the default id). */
export function providerIds(providers: Provider[]): string[] {
  return providers.map((p) => {
    const config = (typeof p === "function" ? p() : p) as { id: string; options?: { id?: string } };
    return config.options?.id ?? config.id;
  });
}

/** Today in IST, or the `e2e_today` cookie value when test mode is on (SPEC R5, R28). */
export function resolveToday(cookieValue: string | undefined, now: Date, env: Env = process.env): ISODate {
  if (isTestMode(env) && isISODate(cookieValue)) return cookieValue;
  return todayIST(now);
}
