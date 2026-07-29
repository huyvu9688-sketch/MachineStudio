// Test stub for the `server-only` marker package.
//
// `server-only` exists purely to make a build fail if a server module is
// pulled into a Client Component: its default entry point throws on
// import, and Next.js only resolves it to a no-op under the "react-server"
// export condition. The Vitest Node environment does not set that
// condition, so importing any server-only boundary (lib/env.ts,
// lib/db/client.ts, lib/db/index.ts) under test would throw.
//
// vitest.config.ts aliases `server-only` to this file so those boundaries
// are testable. The alias applies to the test runner only — application
// builds still resolve the real package, so the marker keeps its meaning.
//
// The package's own empty.js is not usable here: its "exports" field
// declares only ".", so the "./empty.js" subpath is not importable.

export {};
