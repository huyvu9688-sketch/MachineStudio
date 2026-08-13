// lib/logging owns structured, server-only operational logging
// (context/architecture.md "lib/logging/"). Every entry is one JSON line
// written to stdout/stderr for a hosting platform's log collector to ingest
// (Unit 5.5, ADR-0009) — distinct from lib/audit's append-only *engineering*
// event trail, which records security-relevant domain mutations, not
// operational/error visibility.

export { logger } from "./logger";
export { normalizeError } from "./normalize-error";
export type { LogEntry, LogLevel } from "./types";
