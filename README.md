# MachineStudio

MachineStudio is an engineering calculation and component-selection platform
for configurable machine systems. The current repository contains the generic
engineering engine, versioned module SDK, PostgreSQL persistence layer, and
application services; the generic workspace UI and production engineering
modules are the next major milestones.

## Prerequisites

- Node.js 26 (see `.nvmrc`)
- npm
- PostgreSQL 16, or Docker Compose
- Clerk keys for authenticated browser workflows

## Local setup

```bash
cp .env.example .env
docker compose up -d
npm ci
npx prisma migrate deploy
npm run dev
```

`npm ci` generates the Prisma client through the `postinstall` hook. If the
local network blocks Prisma's binary download, use the GitHub Actions workflow
as the database verification environment; do not disable TLS verification.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --omit=dev
```

The suites that round-trip against PostgreSQL report as **skipped** unless both
the generated Prisma client and a `DATABASE_URL` are present — they never pass
silently without a database. Vitest does not read `.env`, so pass the URL
explicitly to run them:

```bash
DATABASE_URL="postgresql://machinestudio:machinestudio@localhost:5432/machinestudio?schema=public" npm run test
```

Production dependencies must audit clean. `package.json` `overrides` pins the
patched `postcss` and `sharp` that Next has not yet released; re-check those
pins on every Next upgrade. Remaining `npm audit` findings are ESLint-tree,
development-only, and need a breaking ESLint major.

Run `npm run registry:generate` after adding or removing a module package.

## Repository guide

- `app/` — Next.js routes and workspace shell
- `lib/engine/` — pure deterministic engineering contracts and computation
- `lib/modules/` — versioned module packages and generated registry
- `lib/catalog/` — manufacturer data contracts, import parsing, and matching
- `lib/application/` — authorized, transactional use cases
- `lib/db/` and `prisma/` — persistence adapters, schema, and migrations
- `lib/standards/` — source-document and market-profile metadata
- `context/` — product specification, architecture, ADRs, and progress
- `validation/` — engineering validation records
- `reference/` — third-party engineering source material, deliberately outside
  `public/` so it is never web-served

Read `CLAUDE.md` before implementation. The architecture treats released
parameters, module versions, calculation runs, manufacturer part revisions,
and machine baselines as immutable engineering records.
