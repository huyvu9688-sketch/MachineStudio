/**
 * Normalizes an `unknown` caught value into a safe, loggable shape (name,
 * message, stack for a real `Error`; the raw value otherwise). Server-log
 * output only — code-standards.md "APIs" forbids exposing a stack trace in
 * an API response; never pass this result back to a client.
 */
export function normalizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { value: error };
}
