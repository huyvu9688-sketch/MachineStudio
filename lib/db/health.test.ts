// Live database verification for checkDatabaseHealth (Unit 0.4 exit
// criterion: "Database health check passes"). Unlike the rest of the
// suite, this test exercises a real network round trip to PostgreSQL, so
// it depends on two things this repository cannot always guarantee:
//
//   1. lib/db/generated/prisma exists (produced by `prisma generate`,
//      wired to run automatically via the package.json "postinstall"
//      script on every `npm ci`/`npm install`).
//   2. DATABASE_URL points at a reachable PostgreSQL instance (see
//      docker-compose.yml for local development; CI runs a `postgres`
//      service container — see .github/workflows/ci.yml).
//
// When (1) is unavailable the suite skips this test rather than failing
// test collection or reporting a false pass — see
// context/progress-tracker.md "Open Questions" for the corporate-network
// constraint that can prevent `prisma generate` from running on some
// developer machines.

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const generatedClientAvailable = existsSync(join(here, "generated", "prisma"));

describe.skipIf(!generatedClientAvailable)(
  "checkDatabaseHealth (live database)",
  () => {
    it("round-trips a trivial query against DATABASE_URL", async () => {
      const { checkDatabaseHealth } = await import("./index");
      const result = await checkDatabaseHealth();

      if (!result.ok) {
        throw new Error(`Database health check failed: ${result.error}`);
      }
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  },
);
