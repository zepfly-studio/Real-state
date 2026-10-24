<div align="center">

# 🦈 Real Estate OS

**A white-label, multi-tenant SaaS operating system for the Indian real-estate market — by Creative Sharks.**

CRM · Bookings · HR · RERA · 20+ AI & productivity tools · Light/Dark · Fully white-label

_Runs end-to-end on demo data with **zero API keys**._

</div>

---

## ✨ Highlights

- **27 modules** — Dashboard, CRM (drag-drop Kanban), Finance & Booking, HR, RERA, Channel Partners, and 18 power tools.
- **Multi-tenant** with 6 roles (Super Admin → Channel Partner), per-tenant data isolation, route guards and an editable permission matrix.
- **Light & Dark themes** (Light is default) with a one-click toggle that persists per browser.
- **Full white-label** — logo, colours, domain, module on/off and billing plan, all configurable without code.
- **No paid keys required.** Most tools work fully in-house; news is pulled **live from Google News (no key)**. Paste optional keys in *Settings → Integrations* only to unlock send/charge/publish features.
- **Tested** — a Playwright suite (48 tests) covers auth, every route, theming and the key interactive flows; the production `build` type-checks every file.

---

## 🚀 Quick start

Requires **Docker** and **Node 20+**.

```bash
docker compose up -d        # PostgreSQL 16 on host port 5433
npm install                 # also copies the pdf.js worker into /public
cp .env.example .env        # leave all keys blank — it just works
npx prisma migrate dev
npm run db:seed
npm run dev                 # → http://localhost:3000
```

Visit **http://localhost:3000** for the marketing landing page, then **Sign in** with any demo account.

### Reset / reseed
```bash
npm run db:reset
```

---

## 👥 Demo logins  (password: `password123`)

| Role | Email |
|------|-------|
| **Super Admin** (Creative Sharks) | `super@creativesharks.com` |
| **Admin** (client owner — Vinit) | `vinit@demo.com` |
| **Manager** | `rohit@demo.com` |
| **Employee** | `priya@demo.com` |
| **Client** (buyer portal) | `amit@demo.com` |
| **Channel Partner** | `sneha@demo.com` |

Use the avatar menu (top-right) → **Switch role (demo)** to hop between roles. The ☀️/🌙 button toggles theme.

---

## 🔌 What works without any key (built-in) vs. what needs a provider later

The platform is designed to be **maximally functional with no external APIs**.

**✅ Fully built-in (no key, works out of the box)**
- Property Live News — **live from Google News RSS**
- AI Assistant — answers from your real DB (pipeline, hot leads, revenue, follow-ups) in Hinglish
- SEO Genius (keyword research, audit, blog writer), Creatives Generator, GMB dashboards — in-house generators
- Lead Genius prospect database, WhatsApp/Social/Email composers & analytics, IVR/calling logs & flow builder
- Finance calculators, PDF receipts/offer letters, **PDF signature**, file converter, QR visitor passes, link-in-bio builder
- Everything else: CRM, HR, RERA, competitors, price trends, workflows, policies, white-label…

**🔑 Needs a provider key to *act on the world* (optional — wire up later in Settings → Integrations)**
| Feature | Provider | Without key |
|---|---|---|
| Send WhatsApp broadcasts | 360dialog / Interakt | composed & tracked in-app (not delivered) |
| Publish social posts | Meta (IG/FB) | scheduled & queued in-app |
| Read/parse real inbox | Gmail / SMTP | curated sample digest |
| Place real calls / recordings | Exotel / MyOperator | call logs & dispositions in-app |
| Collect online payments | Razorpay / Cashfree | booking + schedule recorded |
| Live B2B contact enrichment | Apollo / Hunter / Clearbit | built-in prospect dataset |
| Live Google Business / Maps data | GMB / Google Maps | in-app profile & insights |
| Richer generative copy | Anthropic (Claude) | in-house templated/intent output |

Add a key → the matching tool flips from built-in to live automatically (resolution order: tenant DB → `.env` → none). **No key is ever hardcoded.**

---

## 🎯 Lead Generation add-on

A **LEAD GENERATION** sidebar group: voice/text campaign launch → sellers found by n8n → Smartlead email →
WhatsApp → ChatGPT auto-replies → one-click **Add to CRM**. Includes a unified reply inbox, Smartlead campaign
management with full analytics, mailbox health, and a ChatGPT voice assistant (**Shift + D**) that drafts
replies and acts only after you confirm. Additive only — no existing CRM table or page changes.

Setup, credentials and the n8n workflow: **[docs/LEAD_GENERATION.md](docs/LEAD_GENERATION.md)**.

---

## 🧪 Testing

```bash
npm run build        # type-checks & compiles every route (production build)
npm run test:e2e     # Playwright (start the app on :3000 first, or use `npm run start`)
npm run test:e2e:ui  # interactive Playwright UI
```

The suite (`/tests`) covers: landing page, all 6 role logins, role guards, theme toggle + persistence,
**every module route loading error-free**, and interactive flows (PDF signature preview, AI reply, CRM add-lead,
visitor QR, settings integration round-trip, file converter, creatives).

---

## 🧱 Tech & structure

```
.github/workflows/ci.yml   CI: postgres service → migrate → seed → build → e2e
docker-compose.yml         PostgreSQL 16 (host port 5433, named volume)
Dockerfile                 multi-stage production image for the app
prisma/schema.prisma       multi-tenant schema (~30 models)
prisma/seed.ts             demo data (2 tenants, 6 users, leads, bookings, …)
scripts/copy-pdf-worker.mjs copies pdf.js worker into /public (postinstall)
src/
  app/
    page.tsx               public marketing landing page (light)
    login/                 auth screen
    p/[slug]/              PUBLIC link-in-bio page (no auth)
    (app)/                 authenticated modules (sidebar + topbar shell)
    api/                   route handlers (all tenant-scoped)
  components/              Sidebar, TopBar, AppFrame, ThemeProvider, ui, charts, Icon
  lib/                     prisma, auth, session, permissions, integrations, modules, news, format, audit
docs/AGENT_SPEC.md         architecture & coding conventions
tests/                     Playwright suite
```

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind (CSS-variable theming) · Prisma · PostgreSQL ·
NextAuth (JWT, 6 roles) · Recharts · @dnd-kit · pdf-lib + pdf.js · Playwright.

---

## 🎨 Theming

Light is the default. Colours are CSS variables on `<html data-theme>`; the `ThemeProvider` persists the
choice and dispatches a change event so charts re-theme live. Each tenant's **brand colour** re-skins the
gold accent across the app (Settings → White-Label).

---

## 🐳 Docker (full app)

```bash
docker compose up -d                 # database
docker build -t real-estate-os .     # build app image
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5433/realestate_os?schema=public" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  -e NEXTAUTH_SECRET="change-me" \
  real-estate-os
```

---

## 📦 Production checklist

- [x] `npm run build` passes (zero type errors), no console errors on any route
- [x] Playwright E2E green (48 tests)
- [x] Runs with **zero** API keys (demo/built-in everywhere)
- [x] Multi-tenant isolation + role guards enforced server-side
- [x] Light/Dark, responsive, white-label
- [x] CI workflow, Dockerfile, LICENSE, CONTRIBUTING, `.env.example`

> Swap the dev local-disk uploads for S3/R2 behind the existing interface, set a strong `NEXTAUTH_SECRET`,
> and point `DATABASE_URL` at your managed Postgres for production.

---

© 2026 Creative Sharks. Released under the [MIT License](LICENSE).
