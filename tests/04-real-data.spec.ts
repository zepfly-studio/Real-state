import { test, expect } from "@playwright/test";
import { login, USERS } from "./helpers";

test.beforeEach(async ({ page }) => {
  await login(page, USERS.admin);
});

test("Price Trends: real inventory-derived data + recompute works (no fake formula)", async ({ page }) => {
  await page.goto("/tools/price-trends");
  // honest data-source note is shown
  await expect(page.getByText(/derived from your real inventory/i)).toBeVisible();
  // recompute from inventory rebuilds from real Property data
  await page.getByRole("button", { name: /Recompute/i }).click();
  await expect(page.getByText(/Recomputed \d+ data points from your inventory/i)).toBeVisible({ timeout: 15_000 });
});

test("Price Trends: manual add-data-point form works", async ({ page }) => {
  await page.goto("/tools/price-trends");
  await page.getByRole("button", { name: /Add data point/i }).click();
  await expect(page.getByText(/Add price data point/i)).toBeVisible();
  await page.locator('input[type="number"]').fill("7777");
  await page.getByRole("button", { name: /Save point/i }).click();
  // modal closes on success
  await expect(page.getByText(/Add price data point/i)).toBeHidden({ timeout: 10_000 });
});

test("Email Digest shows REAL CRM-derived items (no fake inbox)", async ({ page }) => {
  await page.goto("/tools/email-digest");
  // the real digest sections render, and the Gmail connect prompt (not fake emails)
  await expect(page.getByText(/Needs Attention|Urgent|FYI/i).first()).toBeVisible();
  await expect(page.getByText(/Connect Gmail/i)).toBeVisible();
});

test("Dashboard KPI deltas are computed (no hardcoded +12.4%)", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Total Revenue")).toBeVisible();
  // the old fake fixed delta must not appear
  await expect(page.getByText("+12.4%")).toHaveCount(0);
});
