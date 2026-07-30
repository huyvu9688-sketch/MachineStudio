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
  // Default is 30s. `/workspace`'s first navigation (test 2) compiles a
  // route the webServer readiness check never touched (that check only GETs
  // "/"), and Turbopack compiles routes lazily on first request — give a
  // cold CI runner real headroom instead of guessing at a smaller number.
  timeout: 90_000,
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
    // 120s was not enough in CI: the first run of commit 282200d failed
    // "E2E smoke test" after almost exactly 120.0s (13:08:02–13:10:03,
    // GitHub Actions run 30545399216) — the dev server's own console output
    // was never captured (no log access without an admin-level token), but
    // the exact match to this timeout, combined with the identical `next
    // dev` serving both routes correctly within ~15s on this dev machine
    // (confirmed by direct `curl` against a locally started server on the
    // same port), points at a slower cold start on a shared CI runner
    // (Turbopack's first compile, Google Fonts fetch for next/font/google,
    // npm's own startup overhead) rather than a real server or route bug.
    timeout: 300_000,
    // Piped (not the default "ignore") so a future failure's actual cause
    // shows up in the CI step output directly, instead of only "webServer
    // did not become ready" with nothing underneath it — the gap that made
    // this timeout's root cause a guess (timing match + a local repro)
    // rather than a read log, this first time.
    stdout: "pipe",
    stderr: "pipe",
  },
});
