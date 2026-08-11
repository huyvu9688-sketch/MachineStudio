# ADR-0009: Deployment target is Vercel with managed PostgreSQL (Neon)

- Status: Accepted
- Date: 2026-08-11
- Related: `context/roadmap.md` Phase 1D / `context/implementation-map.md`
  Unit 5.5 ("Production readiness" — first deliverable, "Deployment
  decision ADR"); `context/progress-tracker.md` "Open decisions"
  ("Deployment target: Vercel plus managed PostgreSQL, or a single VPS" —
  removed by this ADR); `context/architecture.md` "Stack" (Framework:
  Next.js App Router; Database: Prisma + PostgreSQL — neither row named a
  host); `lib/db/client.ts` (existing dual-adapter design)

## Context

`context/architecture.md`'s Stack table has always named the framework
(Next.js App Router) and the database technology (Prisma + PostgreSQL) but
never a deployment host — "the initial deployment is a modular TypeScript
monolith" describes the code's shape, not where it runs.
`context/progress-tracker.md` has carried "Deployment target: Vercel plus
managed PostgreSQL, or a single VPS" as an open decision since early in the
project. Unit 5.5 ("Production readiness") cannot be scoped concretely
without it: "managed database backups" and "recovery procedure" mean
different things depending on whether the database is a provider with its
own backup/restore surface or a VPS this team would have to back up itself,
and "basic performance benchmark" and "error monitoring" both depend on
which platform's own tooling is available.

`lib/db/client.ts` already supports two Postgres driver adapters, added for
an unrelated reason: `@prisma/adapter-pg` (plain TCP, the default — what
`docker-compose.yml`, CI's `postgres:16-alpine` service, and a native local
install all speak) and `@prisma/adapter-neon` (Neon's WebSocket-tunneled
driver), the latter added 2026-07-31 specifically to route around a
corporate-network dev machine's outbound-TCP:5432 block, not as a
deployment decision — the client module's own comment records "this is a
per-environment routing choice, not a change to the default." That work
means a Neon-hosted `DATABASE_URL` already works end to end today; it does
not by itself settle where the deployed application runs or which database
is authoritative in production.

## Decision

**Deploy the Next.js application to Vercel. Use Neon as the managed
PostgreSQL provider for every non-local environment (staging and
production).**

- Local development and CI are unchanged by this decision: both keep using
  `docker-compose.yml`'s Postgres container via `@prisma/adapter-pg`, per
  `lib/db/client.ts`'s existing default. Nothing about this ADR touches
  that path.
- A deployed environment's `DATABASE_URL` points at a `*.neon.tech` host,
  which `lib/db/client.ts`'s existing `isNeonHost` check already routes to
  `@prisma/adapter-neon` automatically — no new adapter code, only new
  environment configuration, is needed to act on this decision.
- This does **not** cover: a specific Vercel plan/tier or Neon plan/tier
  (a budget decision, out of scope here); CI's own database (stays
  `postgres:16-alpine` for parity with local dev, not Neon); or per-route
  edge-vs-Node runtime selection (an implementation detail of the routes
  themselves, not a deployment-target choice).

Explicitly rejected alternative: a self-hosted VPS (Docker Compose plus a
systemd unit, a reverse proxy, and a manually scheduled `pg_dump` backup
cron). Rejected because it would require building and operating
infrastructure (patching, scaling, backup verification, TLS certificate
renewal) this project has no current operational capacity for, while the
Vercel/Neon path needs none of that built — both the application host and
the database already have their own managed backup, scaling, and TLS
surfaces, and the database side of that path is already proven working in
this codebase's own dev environment.

## Consequences

- Unblocks the rest of Unit 5.5: "managed database backups" and "recovery
  procedure" can now be written concretely against Neon's own point-in-time
  recovery and branching features instead of a generic placeholder, and
  "basic performance benchmark" and "error monitoring" can target Vercel's
  and Neon's own observability surfaces.
- Confirms `lib/db/client.ts`'s dual-adapter design is deliberately staying
  dual, not being simplified to one adapter: `adapter-pg` remains the
  local-dev/CI path, `adapter-neon` becomes the deployed-environment path,
  and both stay load-bearing.
- Rules out writing a VPS-specific deployment runbook, systemd unit, or
  manual backup cron as part of Unit 5.5 or any later unit, absent a future
  ADR superseding this one.
- Removes "Deployment target" from `context/progress-tracker.md`'s "Open
  decisions" list.
- Follow-on work this implies but does not do here: provisioning an actual
  Vercel project and a staging/production Neon database, wiring deployment
  (GitHub Actions or Vercel's own Git integration), and setting production
  environment variables (`DATABASE_URL`, the Clerk Production-instance
  keys, etc.) — infrastructure provisioning steps for later Unit 5.5 work,
  not decisions this ADR itself needs to make.
