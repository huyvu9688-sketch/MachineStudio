import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // `server-only` is a marker package whose default entry point throws
      // on import; Next.js only resolves it to a no-op under the
      // "react-server" export condition, which the plain Node test
      // environment does not set. Alias it to a local no-op so server-only
      // boundaries (lib/env.ts, lib/db/*) are importable under test. This
      // applies to the test runner only — application builds still resolve
      // the real package, so the marker keeps its meaning.
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    // Most suites (engine, application, db) never touch the DOM, and
    // jsdom's globals would otherwise mask a server-only import mistake, so
    // "node" stays the default. A component test opts into the DOM
    // per-file with a `// @vitest-environment jsdom` docblock (see
    // app/page.test.tsx) rather than a blanket environmentMatchGlobs rule —
    // this vitest version does not apply that option (confirmed by direct
    // test: with it set, rendering still threw "document is not defined").
    setupFiles: ["./tests/setup.ts"],
    include: ["**/*.test.ts", "**/*.test.tsx"],
    // These must be globs, not bare directory names: a bare "node_modules"
    // does not match nested paths, so any nested node_modules (e.g. inside
    // a git worktree under .claude/) would have its third-party tests
    // collected and run as if they were ours.
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.claude/**",
      "**/.worktrees/**",
      "**/e2e/**",
    ],
    coverage: {
      provider: "v8",
      // "Coverage configuration for engine and modules" (Unit 0.3). Scoped
      // to the deterministic calculation core rather than the whole repo:
      // app/db/application code is exercised mostly through live-database
      // tests that self-skip on a machine with no Postgres (see
      // context/progress-tracker.md), which would make repo-wide coverage
      // numbers swing on network/environment rather than on real gaps.
      include: ["lib/engine/**", "lib/modules/**"],
      exclude: ["**/*.test.ts", "**/*.test.tsx"],
      reporter: ["text", "html"],
    },
  },
});
