# ADR-0010: Managed database backups and recovery procedure (Neon PITR, no custom backup infrastructure)

- Status: Accepted
- Date: 2026-08-12
- Related: `context/roadmap.md` Phase 1D / `context/implementation-map.md`
  Unit 5.5 ("Production readiness" — "Managed database backups" and
  "Recovery procedure" deliverables); ADR-0009 (deployment target: Vercel +
  Neon), whose own "Consequences" section named this ADR as follow-on work;
  `context/progress-tracker.md` Unit 5.5.

## Context

ADR-0009 settled the deployment target (Vercel + Neon-managed PostgreSQL)
but explicitly deferred "managed database backups" and "recovery
procedure" — two of Unit 5.5's own remaining deliverables — as follow-on
work "written concretely against Neon's own point-in-time recovery and
branching features." This project has no calculation evidence store, run
history, or baseline record outside that one PostgreSQL database (`lib/db`
is the only Prisma boundary; `CalculationRun`, `MachineBaseline`, and
`AuditEvent` are all ordinary rows in it, not files or a separate store),
so the whole "does not risk losing calculation evidence" exit criterion in
`context/implementation-map.md` Unit 5.5 turns on what that database's own
backup/restore story actually is.

Confirmed directly against Neon's own current documentation (not assumed):
Neon's point-in-time restore (PITR) retains a rolling history of every
change to a project's data, from a 6-hour window on the Free plan up to 30
days on paid tiers, configured as the project's "restore window" setting
(exact days-per-tier should be re-checked in the Neon dashboard at
provisioning time, since Neon's own tier names and limits are not this
project's own decision to pin in an ADR). A restore is instant and
branch-based — Neon creates a new branch at the chosen past point, rather
than a traditional multi-hour `pg_restore` from a `pg_dump` archive — with
manual `pg_dump`/`pg_restore` still available as a supplementary export
path, not the primary recovery mechanism.

## Decision

**Use Neon's built-in point-in-time restore as this project's only backup
mechanism. No custom backup infrastructure (scheduled `pg_dump`, an S3
export job, a second replica database) is built.**

- The production `DATABASE_URL`'s Neon project must have its restore
  window set to the longest duration the provisioned plan tier allows, at
  provisioning time — a one-time dashboard setting, not application code.
  This is the actual backup: continuous, automatic, requiring no cron job
  or script this codebase would otherwise have to own and verify.
- Recovery from data loss or a bad deploy's mutation means restoring to a
  Neon branch at a timestamp before the incident, then repointing
  `DATABASE_URL` at that branch (or promoting it) — see "Recovery
  procedure" below for the exact steps.
- Local development and CI are unaffected: `docker-compose.yml`'s
  Postgres container has no backup story of its own and needs none — local
  data is disposable by design (the same reasoning ADR-0009 already
  applied to local dev generally), and CI's `postgres:16-alpine` service
  is destroyed after every run.
- Explicitly rejected alternative: a scheduled `pg_dump` to object storage
  (e.g. a GitHub Actions cron exporting to S3). Rejected for the same
  reason ADR-0009 rejected a self-hosted VPS — it would add infrastructure
  (a schedule to maintain, a bucket to secure, a restore path nobody has
  ever exercised under pressure) this project has no operational capacity
  to run and verify, when Neon's own PITR already covers the same failure
  modes (accidental deletion, a bad migration, a bad application-level
  mutation) without it. Revisit only if Neon's own restore window ever
  proves too short for a real incident, or if a compliance requirement
  later demands backup copies outside Neon's own infrastructure — neither
  is true today.

## Recovery procedure

For a data-loss incident (accidental deletion, a destructive migration, a
bad mutation caught after the fact — including, notably, a mistaken
`deleteAccount` call, since Unit 5.5's own account-deletion path is a real
irreversible write this database now supports):

1. **Identify the target timestamp** — the last known-good point before
   the incident, from `AuditEvent.occurredAt` rows (`lib/audit`), Vercel's
   own deployment log if the incident followed a bad release, or the
   incident report itself.
2. **Create a Neon restore branch** at that timestamp, from the Neon
   console or `neonctl branches create --parent <branch> --timestamp
   <ISO-8601>` — this does not touch the live `main`/production branch;
   the restored data exists on a new branch first, so it can be inspected
   before anything is repointed.
3. **Verify the restored branch**, before promoting it: connect to its own
   connection string (never the production one) and confirm the expected
   rows exist — e.g. the project/configuration/run the incident affected.
   Never skip this step and promote directly; Neon's own restore is exact,
   but the *chosen timestamp* is a human judgment call that can be wrong.
4. **Promote or repoint**: either promote the restore branch to become the
   new primary (Neon console: "Set as default branch" / `neonctl branches
   set-default`), or update the deployed environment's `DATABASE_URL` to
   the restore branch's own connection string via Vercel's project
   environment variables, then redeploy so the running application picks
   it up (`lib/db/client.ts`'s existing `isNeonHost` adapter routing needs
   no code change either way — it dispatches on host, not branch).
5. **Record the incident** — what was lost, the chosen restore timestamp,
   and any data created between the incident and the restore that the
   restore itself necessarily discards (a real, disclosed cost of any
   point-in-time restore, not specific to Neon) — in
   `context/progress-tracker.md` "Open decisions" or a dedicated incident
   note, per this project's own "disclose gaps, do not silently patch"
   convention.

This procedure has not yet been exercised against a real incident or a
real provisioned production database (no production Neon project exists
yet — see ADR-0009's own "Follow-on work"); it is a plan, not something
this session could rehearse end to end. Rehearsing it once against a real
staging database, before the first real production incident, is a
reasonable follow-on task for whoever provisions that database.

## Consequences

- Closes two of Unit 5.5's remaining deliverables ("Managed database
  backups," "Recovery procedure") without new application code — the
  mechanism is entirely Neon configuration plus this documented procedure.
- The recovery procedure directly covers the risk Unit 5.5's own exit
  criterion names ("a production incident does not risk losing calculation
  evidence or project ownership boundaries"), including the new
  `deleteAccount` irreversible-write path this same session added.
- Rules out building or maintaining a custom backup job as part of Unit
  5.5 or any later unit, absent a future ADR superseding this one.
- Follow-on work this implies but does not do here: setting the actual
  restore-window value on the real production Neon project once
  provisioned (an ADR cannot set a dashboard toggle that does not exist
  yet), and a first rehearsal of the recovery procedure against a
  non-production database.
