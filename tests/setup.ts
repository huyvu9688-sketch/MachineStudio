import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Testing Library's own auto-cleanup detects a *global* `afterEach` (the
// jest convention); this project's vitest.config.ts deliberately does not
// set `test.globals: true` (every test file explicitly imports from
// "vitest" instead), so that detection never fires and DOM output from one
// render() accumulates into the next within the same file. Registering it
// explicitly here — once, for every test file, jsdom or not; it is a no-op
// without a DOM — is what actually unmounts each render between tests.
afterEach(cleanup);
