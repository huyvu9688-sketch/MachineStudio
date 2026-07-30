import { expect, test } from "@playwright/test";

// Unit 0.3's CI deliverable ("E2E smoke test") plus Unit 0.4's exit
// criteria ("authenticated user can access the empty workspace",
// "unauthenticated user is redirected"). Only the unauthenticated half is
// covered here: proving the authenticated half needs a real signed-in
// Clerk session, which needs Clerk test-instance credentials this project
// does not have configured (see playwright.config.ts and
// context/progress-tracker.md Open Questions) — not attempted rather than
// faked with a bypassed check.

test("home page renders the placeholder shell", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(page.getByText("MachineStudio").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /repository initialized/i }),
  ).toBeVisible();
});

test("an unauthenticated user is redirected away from the workspace", async ({
  page,
}) => {
  await page.goto("/workspace");

  await expect(page).not.toHaveURL(/\/workspace$/);
});
