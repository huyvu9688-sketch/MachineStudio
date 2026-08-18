// A field's declarative "disable when" condition, and its resolution
// against live input state — extracted into its own file with zero
// `@/lib/db` imports so it stays genuinely loadable and testable without
// a database, unlike `load-module-workspace-view.ts` (which has
// unconditional top-level value imports from `@/lib/db` for its own
// DB-dependent parts, and so cannot be imported at all when DATABASE_URL
// is unset — confirmed directly: any test importing that file, even for
// an unrelated pure function, crashes at import time via lib/env.ts).

import type { ResolvedInputSource } from "@/lib/db";

/** A field's declarative "disable when" condition, mirroring `ModuleUiField.disabledWhen`. */
export interface FieldDisabledWhen {
  readonly portKey: string;
  readonly equals: string;
}

/**
 * Whether a field should render disabled given the driving port's currently
 * resolved value, per `disabledWhen`. `false` whenever the driving port's
 * value isn't yet known as a concrete enum value — unset, a module-output
 * link that hasn't run yet, or a registry constant default (which has no
 * materialized view value at this layer) — since showing a field normally
 * is safer than guessing which input mode applies. `loadModuleWorkspaceView`
 * is the only real caller.
 */
export function resolveFieldDisabled(
  disabledWhen: FieldDisabledWhen | undefined,
  resolvedByPortKey: ReadonlyMap<string, ResolvedInputSource>,
): boolean {
  if (disabledWhen === undefined) return false;
  const driving = resolvedByPortKey.get(disabledWhen.portKey);
  if (driving === undefined || driving.source === "default") return false;
  const value = driving.value;
  if (value === null || value === undefined || value.kind !== "enum") {
    return false;
  }
  return value.value === disabledWhen.equals;
}
