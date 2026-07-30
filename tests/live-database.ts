// Shared gate for the live-database test suites.
//
// These suites round-trip against a real PostgreSQL instance. They must never
// pass silently when there is nothing to round-trip against, so every one of
// them is wrapped in `describe.skipIf(!liveDatabaseAvailable)` — a skipped
// suite is visible in the reporter, a fabricated pass is not.
//
// Two things are required, and both are commonly missing on a development
// machine: the generated Prisma client (produced by `prisma generate`, which
// some networks block — see context/progress-tracker.md) and a `DATABASE_URL`.
// Vitest does not load `.env`, so the URL has to be passed in explicitly:
//
//   DATABASE_URL="postgresql://..." npm run test
//
// CI sets both, so these suites always execute there.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const generatedClientPath = fileURLToPath(
  new URL("../lib/db/generated/prisma", import.meta.url),
);

/** Whether a live PostgreSQL round trip is possible in this environment. */
export const liveDatabaseAvailable =
  existsSync(generatedClientPath) &&
  (process.env.DATABASE_URL ?? "").length > 0;
