export type LogLevel = "info" | "warn" | "error";

/** One structured log line. `context` carries arbitrary, already-safe-to-log fields (never raw user secrets). */
export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}
