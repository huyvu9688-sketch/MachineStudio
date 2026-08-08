import { expect, test } from "@playwright/test";

// Unit 0.3's CI deliverable ("E2E smoke test") plus Unit 0.4's exit
// criterion "unauthenticated user is redirected". The sibling exit
// criterion, "authenticated user can access the empty workspace", is
// e2e/authenticated.spec.ts — kept in its own file since it needs a real
// signed-in Clerk session and self-skips without Clerk test-instance
// credentials (see that file and context/progress-tracker.md).

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
