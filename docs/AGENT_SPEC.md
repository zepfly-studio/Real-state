# Real Estate OS — Build Conventions (read before building any module)

You are building one module of a Next.js 14 (App Router) + TypeScript + Tailwind + Prisma
multi-tenant SaaS. The foundation is DONE. Match it exactly. **Do not modify shared files**
(prisma/schema.prisma, src/lib/*, src/components/ui.tsx, charts.tsx, Sidebar/TopBar/AppFrame,
src/lib/modules.ts) unless your task explicitly says so. Only CREATE new files in your module's
own folders. Never start a dev server (one is already running). Never run migrations.

## Routing
- Authenticated pages live under `src/app/(app)/<path>/page.tsx`. The `(app)` layout already
  renders sidebar + topbar, so your page returns ONLY the inner content (no shell).
- The route paths are fixed by `src/lib/modules.ts` (the `href` of each module). Use those exactly.
- API routes: `src/app/api/<name>/route.ts` (or nested). Use Next route handlers.

## Auth & tenancy (ALWAYS scope by tenant)
```ts
import { requireUser, requireRole, resolveTenantId } from "@/lib/session";
const user = await requireUser();                 // or requireRole(["ADMIN","MANAGER"])
const tenantId = await resolveTenantId(user);      // string | null
// EVERY prisma query must include { where: { tenantId, ... } }
```
- Roles: SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE, CLIENT, CHANNEL_PARTNER.
- Pages are server components by default; add `"use client"` only for interactive sub-components.
- For mutations, prefer a small API route + `fetch` from a client component, then `router.refresh()`.

## Prisma
- Import: `import { prisma } from "@/lib/prisma";`
- Enums import from `@prisma/client`.
- The full schema already exists — read `prisma/schema.prisma` for exact model/field names.
- Decimals come back as Prisma.Decimal — wrap with `Number(x)` before maths or formatting.

## Integrations (mock-first — MUST run with zero keys)
```ts
import { getIntegration } from "@/lib/integrations";
const key = await getIntegration(tenantId, "ANTHROPIC"); // null when not configured
if (!key) { /* return rich MOCK data, never an error */ }
```
- Integration-gated tools render real, believable demo/mock data when the key is absent.
- Use the `<ConnectBanner name="..." enables="..." />` component (from ui.tsx) at the top of
  gated tools to tell the user how to go live. NEVER throw / crash when a key is missing.

## Design system (use these — do not reinvent)
From `@/components/ui`: `Card`, `KPICard`, `PageHeader`, `Badge`, `EmptyState`, `ConnectBanner`, `StatTile`.
From `@/components/Icon`: `<Icon name="LucideIconName" />`.
From `@/components/charts`: `RevenueBar`, `TrendLine`, `AreaTrend`, `DonutChart`.
CSS helper classes (in globals.css): `card`, `card-kpi`, `btn`, `btn-primary`, `btn-ghost`,
`input`, `field-label`, `tag`, `tag-hot/warm/cold`, `section-label`, `skeleton`.
Tailwind color tokens: `bg`, `bg-2`, `panel`, `panel-2`, `line`, `txt`, `txt-dim`, `txt-faint`,
`gold`, `gold-bright`, `gold-soft`, `green`, `red`, `blue`, `purple`. Radius via `rounded-[16px]`/`card`.
Fonts: headings use `font-display` (Sora) — already default for h1–h5.

## Formatting helpers (`@/lib/format`)
`inr(n)` → ₹3.2Cr · `inrFull(n)` → ₹1,23,45,678 · `pct(n)` · `initials(name)` · `timeAgo(date)` ·
`JAIPUR_AREAS` array.

## Page structure pattern
```tsx
export default async function Page() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);
  const rows = await prisma.X.findMany({ where: { tenantId } });
  return (
    <div>
      <PageHeader title="…" subtitle="…" icon="LucideName" actions={<button className="btn btn-primary">…</button>} />
      {/* KPI grid → main content using <Card> */}
    </div>
  );
}
```

## Quality bar
- Every page works end-to-end with the seeded data. No dead buttons, no "TODO", no console errors.
- Responsive (grid collapses on mobile). Use `animate-fade-in` is already applied by the shell.
- Empty states use `<EmptyState>`. Loading uses `skeleton` class.
- Keep imports correct; default-export the page component.
- Jaipur context: areas = Mansarovar, Jagatpura, Vaishali Nagar, Tonk Road, Ajmer Road, C-Scheme, Sitapura.
  Currency in INR (lakh/crore). Demo developer brand = "Shubh Realtors".

---

## ADDENDUM (v2) — Light/Dark theming + de-API + bug audit

The app now supports **Light (default) and Dark** themes via CSS variables on `<html data-theme>`.
A `ThemeProvider` + toggle already exist (shared — do NOT modify them).

### Light-mode color rules (IMPORTANT)
- **Always use theme tokens**, never hardcoded dark hex for surfaces/text. Map any hardcoded values:
  - dark panel bg (`#0b0e14`, `#0f131c`, `#141a26`, `#1a212f`) → `bg-bg`, `bg-bg-2`, `bg-panel`, `bg-panel-2`
  - dark borders (`#222b3c`, `#1b2230`) → `border-line`, `border-line-soft`
  - light text (`#e8edf6`, `text-white`) → `text-txt`; dimmer → `text-txt-dim` / `text-txt-faint`
- Gold accents are fine as-is. `text-[#1a1205]` on a gold background is correct in BOTH themes (keep it).
- Modal overlays `bg-black/50` are fine in both themes (keep).
- A deliberately dark widget (e.g. a signature pad, a phone/app mockup, the public link page) may stay
  dark on purpose — leave those.
- After editing, mentally check each screen on a WHITE background: any invisible white-on-white text or
  dark-on-dark block must be converted to tokens.

### De-API rule
Prefer built-in/no-key implementations. Keep optional provider calls behind `getIntegration(...)` but make
the **default path fully functional without any key** (rich in-house logic, not an error). Only features
that truly require an external provider to *act on the world* (send WhatsApp/email/SMS, charge a card,
publish to Meta, pull a live third-party DB) may remain mock-with-a-note. Replace "Demo mode" language
with "Built-in" / "AI-assisted (connect a key for richer output)" where the feature now works in-house.

### Bug-audit checklist (per file you touch)
- Every button/link has a working handler or href (no dead buttons, no `onClick` that does nothing).
- Any "preview"/canvas/image actually renders (no blank placeholders standing in for real content).
- Forms submit to a real API or do real client-side work; success/error states show.
- No `console.error`, no thrown runtime errors; guard against null/empty data with `EmptyState`.
- Decimals wrapped with `Number()`; dates serialized to ISO before crossing to client components.
