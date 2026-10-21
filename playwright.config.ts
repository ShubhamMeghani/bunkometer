import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// E2E runs against a production build with test-only sign-in, using the Neon dev branch from .env.local
// (loaded by Next.js itself). SPEC C11.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    timeout: 300_000,
    reuseExistingServer: !!process.env.E2E_REUSE_SERVER,
    env: { E2E_TEST_AUTH: "1" },
  },
});
