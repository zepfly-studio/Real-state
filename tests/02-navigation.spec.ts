import { test, expect } from "@playwright/test";
import { login, USERS, trackConsole } from "./helpers";

// Every module route an ADMIN can reach.
const ROUTES = [
  "/dashboard", "/news", "/crm", "/calling", "/finance", "/hr", "/policies", "/ceo", "/partners",
  "/tools/ai", "/tools/lead-genius", "/tools/social", "/tools/email-digest", "/tools/whatsapp",
  "/tools/seo", "/tools/gmb", "/tools/creatives", "/tools/workflows", "/tools/rera", "/tools/visitors",
  "/tools/competitors", "/tools/price-trends", "/tools/ivr", "/tools/link-builder",
  "/tools/file-converter", "/tools/pdf-sign", "/admin/team", "/admin/white-label", "/settings", "/super-admin",
];

test.describe("All modules load without errors (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USERS.admin);
  });

  for (const route of ROUTES) {
    test(`loads ${route}`, async ({ page }) => {
      const errors = trackConsole(page);
      const resp = await page.goto(route);
      // super-admin requires SUPER_ADMIN; admin gets redirected — allow that
      if (route === "/super-admin") {
        await page.waitForLoadState("networkidle");
        expect(errors, errors.join("\n")).toHaveLength(0);
        return;
      }
      expect(resp?.status(), `HTTP for ${route}`).toBeLessThan(400);
      // main content present (heading visible)
      await expect(page.locator("h1, h2").first()).toBeVisible();
      await page.waitForTimeout(400); // let client effects run
      expect(errors, `Console errors on ${route}:\n${errors.join("\n")}`).toHaveLength(0);
    });
  }
});

test("super admin console loads for SUPER_ADMIN", async ({ page }) => {
  const errors = trackConsole(page);
  await login(page, USERS.superadmin);
  await page.goto("/super-admin");
  await expect(page.getByText("Client Tenants")).toBeVisible();
  await expect(page.getByText("Shubh Realtors")).toBeVisible();
  expect(errors, errors.join("\n")).toHaveLength(0);
});
