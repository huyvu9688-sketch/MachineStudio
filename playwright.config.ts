import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;

// Unit 0.3's E2E smoke test runs against `next dev`, not a production
// build. Clerk's Next.js SDK only auto-provisions its no-keys "keyless"
// dev instance (see .env.example / lib/env.ts) under `next dev` — a
// production `next start` throws without real
// NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY/CLERK_SECRET_KEY values, which this
// project does not have configured anywhere (no Clerk test-instance
// secrets exist yet — see context/progress-tracker.md Open Questions).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
