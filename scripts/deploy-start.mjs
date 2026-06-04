// Production start sequence for Railway (and any Node host):
//   1) apply pending Prisma migrations
//   2) seed demo data ONLY if the database is empty (skippable with SKIP_SEED=1)
//   3) start Next.js on the platform-provided $PORT
// Each step is guarded so a non-fatal hiccup never takes the whole app down.
import { execSync } from "node:child_process";

const sh = (cmd) => execSync(cmd, { stdio: "inherit", env: process.env });
const port = process.env.PORT || "3000";

// 1) Migrations
try {
  console.log("▶ Applying database migrations…");
  sh("npx prisma migrate deploy");
} catch (e) {
  console.error("⚠ prisma migrate deploy failed:", e?.message ?? e);
  // continue — the app can still boot; migrations can be retried
}

// 2) Seed once (only when empty)
if (process.env.SKIP_SEED !== "1") {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    const tenants = await prisma.tenant.count().catch(() => 0);
    await prisma.$disconnect();
    if (tenants === 0) {
      console.log("▶ Empty database — seeding demo data…");
      sh("npm run db:seed");
    } else {
      console.log(`▶ Database already has ${tenants} tenant(s) — skipping seed.`);
    }
  } catch (e) {
    console.error("⚠ seed check/seed failed (continuing):", e?.message ?? e);
  }
}

// 3) Start Next.js (foreground — keeps the container alive)
console.log(`▶ Starting Next.js on port ${port}…`);
sh(`npx next start -p ${port}`);
