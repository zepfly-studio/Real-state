import { Page, expect } from "@playwright/test";

export const USERS = {
  superadmin: "super@creativesharks.com",
  admin: "vinit@demo.com",
  manager: "rohit@demo.com",
  employee: "priya@demo.com",
  client: "amit@demo.com",
  partner: "sneha@demo.com",
};

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "password123");
  await page.click('button:has-text("Sign in")');
  // Staff land on Lead Generation (the home screen); clients and partners land on /dashboard.
  await page.waitForURL(/\/(dashboard|leadgen\/overview)/, { timeout: 20_000 });
}

/** Collect page console errors for assertions. */
export function trackConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const t = msg.text();
      // ignore benign framework/network/devtools noise (prefetch aborts on fast nav, etc.)
      if (
        /favicon|Failed to load resource|net::ERR|Failed to fetch RSC payload|Falling back to browser navigation|TypeError: Failed to fetch|network error|ResizeObserver/.test(
          t
        )
      )
        return;
      errors.push(t);
    }
  });
  page.on("pageerror", (err) => errors.push("PAGEERROR: " + err.message));
  return errors;
}

/** A minimal valid 1-page PDF as bytes, for upload tests. */
export function tinyPdfBytes(): Buffer {
  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length 64>>stream
BT /F1 24 Tf 72 760 Td (Real Estate OS - Test Agreement) Tj ET
endstream endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000052 00000 n
0000000101 00000 n
0000000229 00000 n
0000000297 00000 n
trailer<</Size 6/Root 1 0 R>>
startxref
410
%%EOF`;
  return Buffer.from(pdf, "latin1");
}

/** A tiny 2x2 PNG as bytes, for image-upload tests. */
export function tinyPngBytes(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGNk+M/wn4EIwDiqEAAyrwf9CHzD7QAAAABJRU5ErkJggg==",
    "base64"
  );
}
