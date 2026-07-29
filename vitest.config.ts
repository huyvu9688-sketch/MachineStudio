import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // `server-only` is a marker package whose default entry point throws
      // on import; Next.js only resolves it to a no-op under the
      // "react-server" export condition, which the plain Node test
      // environment does not set. Aliasing it to the package's own
      // empty.js lets server-only boundaries (lib/env.ts, lib/db/*) be
      // imported under test without weakening the marker in application
      // builds.
      "server-only": "server-only/empty.js",
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
