import "server-only";
import type { LogEntry, LogLevel } from "./types";

const CONSOLE_METHOD: Record<LogLevel, (line: string) => void> = {
  info: (line) => console.info(line),
  warn: (line) => console.warn(line),
  error: (line) => console.error(line),
};

function emit(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context !== undefined ? { context } : {}),
  };
  CONSOLE_METHOD[level](JSON.stringify(entry));
}

/**
 * Structured, server-only operational logger. Each call emits one JSON line
 * (timestamp, level, message, optional context) to stdout/stderr, so a
 * hosting platform's log collector (Vercel, see ADR-0009) can ingest and
 * query it. This is operational visibility, not the append-only engineering
 * event trail `lib/audit` owns — logging here never substitutes for an
 * `AuditEvent`.
 */
export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    emit("info", message, context);
  },
  warn(message: string, context?: Record<string, unknown>): void {
    emit("warn", message, context);
  },
  error(message: string, context?: Record<string, unknown>): void {
    emit("error", message, context);
  },
};
