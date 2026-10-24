import { test, expect } from "@playwright/test";
import { login, USERS, trackConsole } from "./helpers";

test.describe("Landing & auth", () => {
  test("landing page renders (light) with hero + pricing", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /operating system/i })).toBeVisible();
    await expect(page.getByText("MOST POPULAR")).toBeVisible();
    await expect(page.getByRole("link", { name: /Get Started|Go to Dashboard/ }).first()).toBeVisible();
  });

  for (const [role, email] of Object.entries(USERS)) {
    test(`login works for ${role}`, async ({ page }) => {
      await login(page, email);
      await expect(page).toHaveURL(/\/(dashboard|leadgen\/overview)/);
    });
  }

  test("role guard: employee cannot open /ceo", async ({ page }) => {
    await login(page, USERS.employee);
    await page.goto("/ceo");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("role guard: client cannot open /super-admin", async ({ page }) => {
    await login(page, USERS.client);
    await page.goto("/super-admin");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("Theme toggle", () => {
  test("defaults to light, toggles to dark, and persists", async ({ page }) => {
    await login(page, USERS.admin);
    // default light
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    // toggle
    await page.getByRole("button", { name: /Toggle theme/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    // persists across reload
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    // back to light for other tests
    await page.getByRole("button", { name: /Toggle theme/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});
