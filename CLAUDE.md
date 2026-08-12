# MachineStudio (working name)

## Read order

Read these before implementing or making an architectural decision:

1. `context/progress-tracker.md` — current state, active work, blockers.
   **Start here.** It tells you whether the thing you are about to build is
   actually next.
2. `context/project-overview.md` — product definition and scope
3. `context/roadmap.md` — phases, priorities, and phase gates
4. `context/architecture.md` — boundaries, domain model, and invariants
5. `context/ai-workflow-rules.md` — work-unit and module delivery workflow
6. `context/code-standards.md` — implementation and verification rules

Read as needed, not by default:

- `context/implementation-map.md` — the ordered unit-by-unit execution plan.
  Read the milestone you are working in, not the whole file.
- `context/ui-context.md` — before any UI work
- `context/us-market-profile.md` / `context/jp-market-profile.md` — before
  any standards, source-citation, or market-specific work
- `context/adr/` — before changing behaviour an ADR covers
- `context/modules/<module>/` — before working on that module
- `validation/` — before changing a validated calculation

Do not read by default:

- `context/archive/` — frozen history. Read only when you need the reasoning
  behind a past decision, or when a source comment cites
  `context/progress-tracker.md` for rationale that is no longer there.
- `docs/archive/` — completed implementation plans, kept for reference only.

## Updating documentation

Update `context/progress-tracker.md` when status, blockers, or open
decisions change — by editing the relevant section, never by appending a
dated narrative entry.

If implementation changes architecture, scope, standards policy, module
contracts, parameter semantics, UI conventions, or roadmap order, update
that context file too. A decision that constrains future implementation
belongs in an ADR, not in the tracker.

## Running the dev server

`npm run dev` (Next.js/Turbopack). Before starting a new one, check whether
an instance is already listening — Next falls back to the next free port
when 3000 is taken, so confirm the actual port (e.g.
`netstat -ano | findstr LISTENING | findstr :300`) rather than assuming
3000.

`/` (`app/page.tsx`) is a Milestone-0 design-token smoke test, not the
product, and is left as-is intentionally. The real app is `/workspace`
(`app/(workspace)/workspace/page.tsx`); it is Clerk-auth-protected and
redirects unauthenticated requests to `/sign-in`.

This machine's network intercepts TLS; `DATABASE_URL` and
`NODE_EXTRA_CA_CERTS` must both be set for server-side Prisma/Clerk calls to
work at all, and `/sign-in` can still render a blank/loading screen because
the same interception separately affects the *browser's* connection to
Clerk's hosted JS domain — see `context/progress-tracker.md` "Environment
notes" for the confirmed detail and cert path, not a code bug to fix here.

## Invariants

Released module versions, released parameter-registry versions, calculation
runs, validation records, and machine baselines are immutable.
