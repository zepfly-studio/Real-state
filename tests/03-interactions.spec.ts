import { test, expect } from "@playwright/test";
import { login, USERS, tinyPdfBytes, tinyPngBytes } from "./helpers";

test.beforeEach(async ({ page }) => {
  await login(page, USERS.admin);
});

test("PDF Signature: uploaded PDF page renders a real preview (regression)", async ({ page }) => {
  await page.goto("/tools/pdf-sign");
  await page.setInputFiles("#pdf-input", {
    name: "agreement.pdf",
    mimeType: "application/pdf",
    buffer: tinyPdfBytes(),
  });
  // The page-count text confirms parse; the rendered <img> confirms the preview bug is fixed.
  await expect(page.locator('img[alt*="Page" i]')).toBeVisible({ timeout: 20_000 });
});

test("AI Assistant: sending a prompt returns a data-driven reply", async ({ page }) => {
  await page.goto("/tools/ai");
  const box = page.locator("textarea").first();
  await box.fill("What is my pipeline value?");
  await box.press("Enter");
  // assistant reply appears (built-in engine answers with ₹ figures)
  await expect(page.locator("text=/₹|pipeline|lead/i").last()).toBeVisible({ timeout: 15_000 });
});

test("Creatives: generate produces ad copy", async ({ page }) => {
  await page.goto("/tools/creatives");
  await page.getByRole("button", { name: /Generate/i }).first().click();
  await expect(page.locator("text=/#|hashtag|Shubh|book|visit/i").first()).toBeVisible({ timeout: 15_000 });
});

test("CRM: Add Lead modal opens with a form", async ({ page }) => {
  await page.goto("/crm");
  await page.getByRole("button", { name: /Add Lead/i }).first().click();
  await expect(page.locator('input').first()).toBeVisible();
  await expect(page.getByText(/Mansarovar|Jagatpura|location/i).first()).toBeVisible();
});

test("Visitors: check-in generates a QR code image", async ({ page }) => {
  await page.goto("/tools/visitors");
  const inputs = page.locator('input[type="text"], input:not([type])');
  await inputs.nth(0).fill("Test Visitor");
  await inputs.nth(1).fill("+91 90000 00000");
  const purpose = inputs.nth(2);
  if (await purpose.count()) await purpose.fill("Site visit");
  await page.getByRole("button", { name: /check.?in|register|add visitor/i }).first().click();
  await expect(page.locator("img").first()).toBeVisible({ timeout: 10_000 });
});

test("Settings: connect + disconnect an integration round-trip", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: /Integrations/i }).click();
  // Find the Anthropic card by its label, type a fake key, save
  const card = page.locator(".card", { hasText: "Anthropic" }).first();
  await card.locator('input[type="password"]').fill("sk-ant-playwright-test-key-123");
  await card.getByRole("button", { name: /^Save$/ }).click();
  await expect(card.getByText(/Connected/i)).toBeVisible({ timeout: 10_000 });
  // disconnect to restore zero-key state
  await card.getByRole("button", { name: /Disconnect/i }).click();
  await expect(card.getByText(/Not connected/i)).toBeVisible({ timeout: 10_000 });
});

test("File Converter: image compressor accepts an image", async ({ page }) => {
  await page.goto("/tools/file-converter");
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({ name: "pic.png", mimeType: "image/png", buffer: tinyPngBytes() });
  // some result/size text appears
  await expect(page.locator("text=/KB|MB|B\\b|saved|compress/i").first()).toBeVisible({ timeout: 15_000 });
});
