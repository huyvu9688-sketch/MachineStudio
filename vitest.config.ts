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
    include: ["**/*.test.ts", "**/*.test.tsx"],
    // These must be globs, not bare directory names: a bare "node_modules"
    // does not match nested paths, so any nested node_modules (e.g. inside
    // a git worktree under .claude/) would have its third-party tests
    // collected and run as if they were ours.
    exclude: ["**/node_modules/**", "**/.next/**", "**/.claude/**"],
  },
});
