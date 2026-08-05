// Authoring helper for parameter seed data. `defineParameter` takes a plain
// spec (raw string IDs, omitted defaults) and returns a fully-formed, branded
// `ParameterDefinition` with the conventional defaults applied. Kept separate
// from ./registry so the seed definitions can import it without an import cycle.

import {
  asParameterId,
  type DefaultPolicy,
  type FrameRequirement,
  type LoadCaseCategory,
  type ParameterDefinition,
  type ParameterLifecycle,
  type ParameterQualifiers,
  type ParameterValueType,
  type ValidRange,
} from "./types";

/** Authoring shape for {@link defineParameter}. Optional fields take defaults. */
export interface ParameterSpec {
  readonly id: string;
  readonly displayName: string;
  readonly symbol: string;
  readonly definition: string;
  readonly valueType: ParameterValueType;
  readonly canonicalUnit?: string;
  readonly displayUnits?: readonly string[];
  readonly range?: ValidRange;
  readonly enumId?: string;
  readonly enumOptions?: readonly string[];
  readonly qualifiers?: ParameterQualifiers;
  readonly loadCases?: readonly LoadCaseCategory[];
  readonly frame?: FrameRequirement;
  readonly defaultPolicy?: DefaultPolicy;
  readonly lifecycle?: ParameterLifecycle;
  readonly replacedBy?: string;
}

/**
 * Builds a {@link ParameterDefinition} from a spec, applying defaults:
 * `frame` → `"none"`, `qualifiers` → `{}`, `defaultPolicy` → `{ kind: "optional" }`,
 * `lifecycle` → `"released"`. Optional fields left unset are omitted rather than
 * set to `undefined`. This does not validate engineering invariants — that
 * happens when the definitions are loaded into a registry (see ./registry).
 */
export function defineParameter(spec: ParameterSpec): ParameterDefinition {
  return {
    id: asParameterId(spec.id),
    displayName: spec.displayName,
    symbol: spec.symbol,
    definition: spec.definition,
    valueType: spec.valueType,
    ...(spec.canonicalUnit !== undefined && {
      canonicalUnit: spec.canonicalUnit,
    }),
    ...(spec.displayUnits !== undefined && { displayUnits: spec.displayUnits }),
    ...(spec.range !== undefined && { range: spec.range }),
    ...(spec.enumId !== undefined && { enumId: spec.enumId }),
    ...(spec.enumOptions !== undefined && { enumOptions: spec.enumOptions }),
    qualifiers: spec.qualifiers ?? {},
    ...(spec.loadCases !== undefined && { loadCases: spec.loadCases }),
    frame: spec.frame ?? "none",
    defaultPolicy: spec.defaultPolicy ?? { kind: "optional" },
    lifecycle: spec.lifecycle ?? "released",
    ...(spec.replacedBy !== undefined && {
      replacedBy: asParameterId(spec.replacedBy),
    }),
  };
}
