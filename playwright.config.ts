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
//
// CI history for the `--hostname 0.0.0.0` flag below (see
// context/progress-tracker.md for the full record): two pushes in a row
// (commits 282200d, 49c1038) failed "E2E smoke test" by running to the
// *exact* configured `webServer.timeout` (120s, then 300s) with zero
// progress in between — not a slow start, a server that Playwright's
// readiness poll could never reach at all. A local repro (both warm and
// with the gitignored `.clerk/` cache deliberately removed to force
// keyless mode's first-time provisioning) reached `127.0.0.1` successfully
// within ~10s every time, ruling out Clerk/Turbopack/font-fetch slowness as
// the cause. The remaining, well-documented difference: `next dev` on some
// Linux containers binds only to the IPv6 loopback (`::1`) unless told
// otherwise, which a `127.0.0.1`-based (IPv4) health check — Playwright's
// `webServer.url` here — can never reach, no matter how long it waits.
// `--hostname 0.0.0.0` forces both interfaces. Not yet re-verified in CI.
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
    command: `npm run dev -- --hostname 0.0.0.0 --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    // Generous, not just the ~10-15s a healthy start needs locally: a
    // shared CI runner's first Turbopack compile and next/font/google fetch
    // are still real, uncontrolled variables even once the binding issue
    // above is fixed.
    timeout: 120_000,
    // Piped (not the default "ignore") so a future failure's actual cause
    // shows up in the CI step output directly. This session could not read
    // either failed run's logs at all (`GET .../actions/jobs/<id>/logs`
    // returned 403 "Must have admin rights" for an unauthenticated request,
    // and this session has no GitHub token) — root-causing by exact-timeout
    // pattern matching and local repro instead worked, but a visible log
    // would have taken one CI round trip instead of two.
    stdout: "pipe",
    stderr: "pipe",
  },
});
