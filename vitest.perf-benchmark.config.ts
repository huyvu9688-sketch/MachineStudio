// Dedicated Vitest config for `npm run perf:benchmark` (Unit 5.5). Not a
// merge of vitest.config.ts — `mergeConfig` concatenates array options
// rather than replacing them, so a merged `exclude` would still carry the
// base config's own `scripts/**` entry (confirmed directly: `mergeConfig`
// produced an `exclude` list still containing `scripts/**`, matching
// nothing). Standalone instead, copying only what a live-database
// application-layer file actually needs: the same `server-only` alias and
// `node` environment vitest.config.ts uses, no `setupFiles` (this suite
// touches no engine/UI global state that file establishes).
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["scripts/**/*.test.ts"],
  },
});
