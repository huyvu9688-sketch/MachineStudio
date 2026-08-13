"use server";

// Server Action a client error boundary calls to get its own caught error
// into the same structured server-side log every other unexpected failure
// in this app now goes through (lib/logging, Unit 5.5). A Client Component
// cannot import lib/logging directly (it carries "server-only"
// transitively) and an `Error` instance does not serialize across the
// Server Action boundary, so the boundary pre-extracts message/stack/digest
// itself and passes plain strings here — the same reason drive/level-headed
// error-monitoring SDKs (Sentry et al.) ship a client-side reporter that
// forwards to a server ingestion endpoint rather than logging from the
// browser directly. Swapping in a real error-monitoring service later means
// changing this one function's body, not any of its callers.

import { logger } from "@/lib/logging";

export interface ClientErrorReport {
  readonly message: string;
  readonly stack?: string;
  readonly digest?: string;
  readonly url?: string;
}

export async function reportClientErrorAction(
  report: ClientErrorReport,
): Promise<void> {
  logger.error("Unhandled client error", {
    source: "client",
    message: report.message,
    stack: report.stack,
    digest: report.digest,
    url: report.url,
  });
}
