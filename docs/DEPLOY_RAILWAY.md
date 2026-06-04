# Deploy to Railway

Real Estate OS is a Next.js + Prisma + PostgreSQL app. Railway runs the web service and
a managed Postgres. The repo already includes `railway.json`, a production start script
(`scripts/deploy-start.mjs`) that auto-migrates + seeds, and a Linux Prisma engine target —
so deployment is mostly clicking + setting 2 env vars.

## 1. Create the project
1. Go to **railway.app → New Project → Deploy from GitHub repo** → pick `zepflystudio/real-estate`.
2. Railway detects Node (Nixpacks) and starts the first build. It will likely fail the first time
   because there's **no database yet** — that's expected; we add it next.

## 2. Add PostgreSQL
1. In the project: **New → Database → Add PostgreSQL**.
2. Open your **web service → Variables → New Variable → Reference** and add:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`  (pick the Postgres service's `DATABASE_URL`)

   This wires the app to the DB over Railway's private network (no SSL config needed).

## 3. Set the required environment variables
On the **web service → Variables**, add:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | reference (step 2) |
| `NEXTAUTH_SECRET` | a long random string | run `openssl rand -base64 32` or any 32+ char secret |
| `NEXTAUTH_URL` | your public URL, e.g. `https://real-estate-production.up.railway.app` | set after Railway gives you a domain (step 5), then redeploy |
| `NODE_ENV` | `production` | optional; Railway sets this |
| `SKIP_SEED` | `1` | **optional** — set this if you do NOT want demo data seeded on first boot |

All the integration keys (ANTHROPIC, WHATSAPP, etc.) stay **blank** — the app runs fully on
built-in/demo data without them, exactly like local.

## 4. Deploy
- Railway redeploys automatically on each push to `main`.
- On boot, `npm run start:prod` runs: `prisma migrate deploy` → seed (only if the DB is empty) →
  `next start` on Railway's `$PORT`. So the schema + demo logins are created automatically.

## 5. Get your domain & finish auth
1. **Web service → Settings → Networking → Generate Domain**. Copy the URL.
2. Put that URL into `NEXTAUTH_URL` (step 3) and **redeploy** once so auth callbacks use the right host.
3. Open the domain → you'll see the landing page. Sign in with a demo account:
   `vinit@demo.com` / `password123` (or any demo login from the README).

## Troubleshooting
- **Build fails fetching Google Fonts** → just click **Redeploy** (transient network blip on the build host).
- **"Query engine not found"** → already handled via `binaryTargets = ["native","debian-openssl-3.0.x"]` in `prisma/schema.prisma`. If Railway uses a different base image, add its target and redeploy.
- **App boots but DB is empty / can't log in** → check `DATABASE_URL` reference is set and the deploy logs show "Applying database migrations…" and the seed step. Re-run by redeploying.
- **Want a clean (no demo data) production DB** → set `SKIP_SEED=1` and create your own admin via the seed or Super Admin onboarding.
- **Node version** → pinned to 20 via `.nvmrc`; Nixpacks respects it.

## Alternative: Dockerfile
The repo also ships a multi-stage `Dockerfile`. To use it instead of Nixpacks, set the service's
builder to **Dockerfile** in Railway settings. It runs `prisma migrate deploy` then `next start`.
(For auto-seed, prefer the Nixpacks + `start:prod` path above.)
