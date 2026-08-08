import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

// Unit 0.4's other exit criterion ("authenticated user can access the
// empty workspace") — the half smoke.spec.ts explicitly does not attempt.
// Needs a real Clerk test-instance: a Development-instance publishable/
// secret key pair, and a dedicated E2E test user with password auth
// enabled on that instance. See .env.example and
// context/progress-tracker.md for current credential status.
//
// `clerk.signIn` drives Clerk's client-side JS directly (no UI form
// filling) and internally applies the Testing Token that
// e2e/clerk-global-setup.ts fetched, bypassing bot-protection challenges
// for this programmatic sign-in.
const hasClerkTestCredentials =
  !!process.env.CLERK_SECRET_KEY &&
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.E2E_CLERK_USER_EMAIL &&
  !!process.env.E2E_CLERK_USER_PASSWORD;

test.skip(
  !hasClerkTestCredentials,
  "Needs Clerk test-instance credentials (CLERK_SECRET_KEY, " +
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, E2E_CLERK_USER_EMAIL, " +
    "E2E_CLERK_USER_PASSWORD) — see .env.example. Not attempted rather " +
    "than faked with a bypassed check.",
);

test("a signed-in user can access the empty workspace", async ({ page }) => {
  await page.goto("/");
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: process.env.E2E_CLERK_USER_EMAIL!,
      password: process.env.E2E_CLERK_USER_PASSWORD!,
    },
  });

  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/workspace$/);
});
