import { test, expect } from "@playwright/test";
import { login, USERS, trackConsole } from "./helpers";

// Lead Generation add-on — must work end-to-end with ZERO keys (connect prompts, no errors).
const ROUTES = ["/leadgen/overview", "/leadgen/leads", "/leadgen/inbox", "/leadgen/email", "/leadgen/mailboxes", "/leadgen/setup"];

test.describe("Lead Generation (admin, no keys)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USERS.admin);
  });

  test("staff land on Lead Generation after login, and it is the first sidebar group", async ({ page }) => {
    await expect(page).toHaveURL(/\/leadgen\/overview/);
    const groups = await page.locator("aside nav .section-label").allInnerTexts();
    expect(groups[0]).toMatch(/LEAD GENERATION/i);
  });

  test("sidebar shows the LEAD GENERATION group next to the CRM", async ({ page }) => {
    const nav = page.locator("aside nav");
    await expect(nav.getByText("LEAD GENERATION")).toBeVisible();
    await expect(nav.getByRole("link", { name: "Prospects" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Sales & Support CRM" })).toBeVisible();
  });

  for (const route of ROUTES) {
    test(`loads ${route}`, async ({ page }) => {
      const errors = trackConsole(page);
      const resp = await page.goto(route);
      expect(resp?.status(), `HTTP for ${route}`).toBeLessThan(400);
      await expect(page.locator("h1, h2").first()).toBeVisible();
      await page.waitForTimeout(600);
      expect(errors, `Console errors on ${route}:\n${errors.join("\n")}`).toHaveLength(0);
    });
  }

  test("/leadgen redirects to the overview", async ({ page }) => {
    await page.goto("/leadgen");
    await expect(page).toHaveURL(/\/leadgen\/overview/);
  });

  test("email pages ask to connect Smartlead instead of erroring", async ({ page }) => {
    await page.goto("/leadgen/email");
    await expect(page.getByText(/Connect Smartlead/i).first()).toBeVisible();
  });

  test("assistant is available on CRM pages too (Shift+D) and asks for a ChatGPT key", async ({ page }) => {
    await page.goto("/crm");
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("Shift+D");
    const panel = page.getByRole("dialog", { name: "Voice assistant" });
    await expect(panel).toBeVisible();
    await expect(panel.getByText(/Switch the assistant on/i)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
  });

  test("launching without n8n saves the campaign and says why it didn't start", async ({ page }) => {
    await page.goto("/leadgen/overview");
    await page.getByLabel("Campaign brief").fill("Noida mein 25 dentists chahiye");
    await page.getByRole("button", { name: /Build plan/ }).click();
    // The search plan is shown for approval before anything is launched.
    const confirm = page.getByRole("group", { name: "Confirm campaign" });
    await expect(confirm.getByLabel("Area")).toHaveValue(/Noida/);
    await expect(confirm.getByLabel("Sellers to find")).toHaveValue("25");
    await expect(confirm.getByText("dental clinic")).toBeVisible();
    await expect(confirm.getByText("intern", { exact: true })).toBeVisible();
    await confirm.getByRole("button", { name: /Launch campaign/ }).click();
    await expect(page.getByText(/automation isn't running/i).first()).toBeVisible();
    await expect(page.getByText(/Dentists — Noida/).first()).toBeVisible();
  });
});

test.describe("Lead Generation role guards", () => {
  test("client cannot open Lead Generation", async ({ page }) => {
    await login(page, USERS.client);
    await page.goto("/leadgen/overview");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("employee cannot open Setup & Connect", async ({ page }) => {
    await login(page, USERS.employee);
    await page.goto("/leadgen/setup");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("n8n endpoints reject requests without the workspace token", async ({ request }) => {
    const r = await request.post("/api/leadgen/sync", { data: { event: "new_lead", data: { phone: "+919800000001" } } });
    expect(r.status()).toBe(401);
  });
});
