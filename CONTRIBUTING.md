# Contributing to Real Estate OS

Thanks for your interest in improving Real Estate OS! 🦈

## Local setup

```bash
docker compose up -d        # PostgreSQL 16 on host port 5433
npm install
cp .env.example .env        # then leave keys blank — the app runs on demo data
npx prisma migrate dev
npm run db:seed
npm run dev                 # http://localhost:3000
```

Demo logins are printed by the seed script and listed in the README (password `password123`).

## Project conventions

The architecture and coding conventions are documented in [`docs/AGENT_SPEC.md`](docs/AGENT_SPEC.md).
Key points:

- **Multi-tenant**: every Prisma query is scoped by `tenantId` (`resolveTenantId`). Never trust a
  client-supplied tenant id.
- **Theme tokens only**: use the CSS variable Tailwind tokens (`bg`, `panel`, `txt`, `gold`, …). Avoid
  hardcoded hex for surfaces/text so Light **and** Dark themes both work.
- **No required API keys**: features must work with zero keys (built-in/mock). Provider calls are gated
  behind `getIntegration(tenantId, name)` and only enhance the experience.
- **Shared UI**: reuse `@/components/ui` (`Card`, `PageHeader`, `KPICard`, `Badge`, `EmptyState`, …).

## Quality gates before a PR

```bash
npm run build       # type-checks every file (must pass)
npm run test:e2e    # Playwright suite (server must be running on :3000)
```

- No TypeScript errors, no console errors on any route.
- New interactive features should get a Playwright test in `tests/`.
- Keep commits focused and descriptive.

## Branching

Create a feature branch off `main`, open a PR, and ensure CI is green.
