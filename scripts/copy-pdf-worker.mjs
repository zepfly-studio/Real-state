// Copies the pdf.js worker into /public so the PDF Signature tool works fully offline.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const destDir = join(root, "public");
const dest = join(destDir, "pdf.worker.min.mjs");

try {
  if (!existsSync(src)) {
    console.warn("[copy-pdf-worker] source not found, skipping:", src);
    process.exit(0);
  }
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  copyFileSync(src, dest);
  console.log("[copy-pdf-worker] copied pdf worker -> public/pdf.worker.min.mjs");
} catch (e) {
  console.warn("[copy-pdf-worker] failed (non-fatal):", e.message);
}
