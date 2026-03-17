import { test, expect } from "@playwright/test";

test.describe("Navigation & Routing", () => {
  test("projects → new project → cancel → back to projects", async ({
    page,
  }) => {
    await page.goto("/#/projects");

    // Navigate to new project
    await page.getByRole("link", { name: /New Project/i }).click();
    await expect(page).toHaveURL(/#\/projects\/new/);

    // Cancel back
    await page.getByRole("button", { name: /Cancel/i }).click();
    await expect(page).toHaveURL(/#\/projects/);
  });

  test("full flow: projects → new → create → editor", async ({ page }) => {
    // Start from projects page (root redirects here)
    await page.goto("/#/projects");
    await expect(page).toHaveURL(/#\/projects/);

    // New project
    await page.getByRole("link", { name: /New Project/i }).click();
    await expect(page).toHaveURL(/#\/projects\/new/);

    // Fill form and create
    await page.getByLabel(/Project Name/i).fill("Full Flow E2E Test");
    const createBtn = page.getByRole("button", { name: /Create Project/i });
    await expect(createBtn).toBeEnabled();
    await createBtn.click();

    // Should land in editor
    await expect(page).toHaveURL(/#\/editor\//, { timeout: 15_000 });
  });

  test("direct navigation to settings via URL", async ({ page }) => {
    await page.goto("/#/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("hash routing preserves route on page reload", async ({ page }) => {
    await page.goto("/#/projects");
    await expect(page).toHaveURL(/#\/projects/);

    // Reload the page
    await page.reload();

    // Should still be on projects page after reload
    await expect(page).toHaveURL(/#\/projects/);
    // Wait for content to load
    const newProjectBtn = page.getByRole("link", { name: /New Project/i });
    await expect(newProjectBtn).toBeVisible({ timeout: 10_000 });
  });

  test("root URL redirects to projects", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/#\/projects/, { timeout: 5_000 });
  });
});
