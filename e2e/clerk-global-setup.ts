import { clerkSetup } from "@clerk/testing/playwright";

// Fetches a Clerk "Testing Token" (via the Backend API, using
// CLERK_SECRET_KEY) that lets automated sign-in bypass bot-protection
// challenges — see e2e/authenticated.spec.ts. A no-op when this project has
// no Clerk test-instance credentials configured (see
// context/progress-tracker.md): that test file skips itself in the same
// case, so there is nothing here that would need the token.
export default async function globalSetup(): Promise<void> {
  if (!process.env.CLERK_SECRET_KEY) return;
  await clerkSetup();
}
