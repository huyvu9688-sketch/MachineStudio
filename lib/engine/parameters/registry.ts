// The canonical parameter registry loader (Unit 1.3). `buildParameterRegistry`
// validates a set of parameter definitions against the registry invariants and
// returns an immutable, queryable registry with a content hash. The released
// registry singleton and its convenience lookups are built from the seed
// definitions in ./definitions.
//
// Invariants enforced here (beyond the structural checks in ./schemas):
//  - unique parameter IDs
//  - no two parameters share a symbol within the same scope
//  - physical parameters carry a registered canonical unit and dimension-
//    compatible display units and range; non-physical parameters carry none
//  - `constant` defaults match the parameter's value type and dimension
//  - deprecated parameters point at an existing, non-cyclic replacement

import { dimensionsEqual, getUnit, hasUnit } from "../units";
import type { EngineeringValue } from "../values";
import { ParameterRegistryError } from "./errors";
import { contentHash, stableStringify } from "./hash";
import { ParameterDefinitionSchema } from "./schemas";
import type { ParameterDefinition, ParameterId } from "./types";

/** A validated, immutable canonical parameter registry. */
export interface ParameterRegistry {
  /** Human-assigned semantic version of the released registry, e.g. `"1.0.0"`. */
  readonly version: string;
  /** Deterministic content fingerprint of the definitions (drift detection). */
  readonly hash: string;
  /** Returns the definition for `id`, or `undefined` when unknown. */
  get(id: string): ParameterDefinition | undefined;
  /** True when `id` is a registered parameter. */
  has(id: string): boolean;
  /** All definitions, sorted by ID. */
  list(): readonly ParameterDefinition[];
  /**
   * Resolves `id` to its active definition, following the replacement chain when
   * it is deprecated.
   *
   * @throws {@link ParameterRegistryError} (`unknown_parameter`) when `id` is
   *   not registered.
   */
  resolve(id: string): ParameterDefinition;
}

function fail(
  code: ParameterRegistryError["code"],
  message: string,
  parameterId?: string,
): never {
  throw new ParameterRegistryError(code, message, parameterId);
}

/** The scope of a parameter ID: everything before its final dotted segment. */
export function parameterScope(id: string): string {
  const lastDot = id.lastIndexOf(".");
  return lastDot === -1 ? "" : id.slice(0, lastDot);
}

const PHYSICAL_TYPES: ReadonlySet<ParameterDefinition["valueType"]> = new Set([
  "quantity",
  "vector_quantity",
]);

/** The unit carried by a physical engineering value, or `undefined`. */
function valueUnit(value: EngineeringValue): string | undefined {
  return value.kind === "quantity" || value.kind === "vector_quantity"
    ? value.unit
    : undefined;
}

function validateShape(def: ParameterDefinition): ParameterDefinition {
  const result = ParameterDefinitionSchema.safeParse(def);
  if (!result.success) {
    fail(
      "invalid_shape",
      `Parameter "${def.id}" is malformed: ${result.error.message}`,
      def.id,
    );
  }
  return result.data;
}

function validatePhysical(def: ParameterDefinition): void {
  const { id, canonicalUnit, displayUnits, range } = def;
  if (def.enumId !== undefined || def.enumOptions !== undefined) {
    fail(
      "unexpected_physical_metadata",
      `Physical parameter "${id}" must not declare enum metadata.`,
      id,
    );
  }
  if (canonicalUnit === undefined || displayUnits === undefined) {
    fail(
      "missing_physical_metadata",
      `Physical parameter "${id}" must declare a canonical unit and display units.`,
      id,
    );
  }
  if (!hasUnit(canonicalUnit)) {
    fail("unknown_unit", `Parameter "${id}" uses unknown unit "${canonicalUnit}".`, id);
  }
  const canonicalDimension = getUnit(canonicalUnit).dimension;
  for (const unit of displayUnits) {
    if (!hasUnit(unit)) {
      fail("unknown_unit", `Parameter "${id}" uses unknown display unit "${unit}".`, id);
    }
    if (!dimensionsEqual(getUnit(unit).dimension, canonicalDimension)) {
      fail(
        "dimension_mismatch",
        `Display unit "${unit}" of "${id}" is not dimension-compatible with "${canonicalUnit}".`,
        id,
      );
    }
  }
  if (range !== undefined) {
    if (!hasUnit(range.unit)) {
      fail("unknown_unit", `Range of "${id}" uses unknown unit "${range.unit}".`, id);
    }
    if (!dimensionsEqual(getUnit(range.unit).dimension, canonicalDimension)) {
      fail(
        "dimension_mismatch",
        `Range unit "${range.unit}" of "${id}" is not dimension-compatible with "${canonicalUnit}".`,
        id,
      );
    }
    if (range.min !== undefined && range.max !== undefined && range.min > range.max) {
      fail("invalid_range", `Range of "${id}" has min greater than max.`, id);
    }
  }
}

function validateEnum(def: ParameterDefinition): void {
  const { id, enumId, enumOptions } = def;
  if (
    def.canonicalUnit !== undefined ||
    def.displayUnits !== undefined ||
    def.range !== undefined
  ) {
    fail(
      "unexpected_physical_metadata",
      `Enum parameter "${id}" must not declare unit or range metadata.`,
      id,
    );
  }
  if (enumId === undefined || enumOptions === undefined) {
    fail("invalid_enum", `Enum parameter "${id}" must declare enumId and options.`, id);
  }
  if (new Set(enumOptions).size !== enumOptions.length) {
    fail("invalid_enum", `Enum parameter "${id}" has duplicate options.`, id);
  }
}

function validateBoolean(def: ParameterDefinition): void {
  const { id } = def;
  if (
    def.canonicalUnit !== undefined ||
    def.displayUnits !== undefined ||
    def.range !== undefined ||
    def.enumId !== undefined ||
    def.enumOptions !== undefined
  ) {
    fail(
      "unexpected_physical_metadata",
      `Boolean parameter "${id}" must not declare unit, range, or enum metadata.`,
      id,
    );
  }
}

function validateDefault(def: ParameterDefinition): void {
  const policy = def.defaultPolicy;
  if (policy.kind !== "constant") return;
  const { id, valueType } = def;
  const value = policy.value;
  if (value.kind !== valueType) {
    fail(
      "invalid_default",
      `Default of "${id}" is a "${value.kind}" but the parameter is a "${valueType}".`,
      id,
    );
  }
  if (PHYSICAL_TYPES.has(valueType)) {
    const unit = valueUnit(value);
    // canonicalUnit is guaranteed present for physical parameters by validatePhysical.
    const canonicalUnit = def.canonicalUnit as string;
    if (unit === undefined || !hasUnit(unit)) {
      fail("invalid_default", `Default of "${id}" uses an unknown unit.`, id);
    }
    if (!dimensionsEqual(getUnit(unit).dimension, getUnit(canonicalUnit).dimension)) {
      fail(
        "invalid_default",
        `Default of "${id}" is not dimension-compatible with "${canonicalUnit}".`,
        id,
      );
    }
  }
  if (valueType === "enum" && value.kind === "enum") {
    if (value.enumId !== def.enumId || !def.enumOptions?.includes(value.value)) {
      fail("invalid_default", `Default of "${id}" is not a valid option of its enum.`, id);
    }
  }
}

function validateDefinition(def: ParameterDefinition): void {
  switch (def.valueType) {
    case "quantity":
    case "vector_quantity":
      validatePhysical(def);
      break;
    case "enum":
      validateEnum(def);
      break;
    case "boolean":
      validateBoolean(def);
      break;
    default: {
      const exhaustive: never = def.valueType;
      fail("invalid_shape", `Unhandled value type: ${String(exhaustive)}`, def.id);
    }
  }
  validateDefault(def);
}

function validateDeprecations(byId: ReadonlyMap<string, ParameterDefinition>): void {
  for (const def of byId.values()) {
    if (def.lifecycle !== "deprecated") {
      if (def.replacedBy !== undefined) {
        fail(
          "invalid_deprecation",
          `Non-deprecated parameter "${def.id}" must not declare a replacement.`,
          def.id,
        );
      }
      continue;
    }
    if (def.replacedBy === undefined) {
      fail(
        "invalid_deprecation",
        `Deprecated parameter "${def.id}" must declare a replacement.`,
        def.id,
      );
    }
    // Walk the replacement chain, detecting a missing target or a cycle.
    const seen = new Set<string>([def.id]);
    let current: ParameterDefinition = def;
    while (current.lifecycle === "deprecated") {
      const nextId: ParameterId = current.replacedBy as ParameterId;
      const next = byId.get(nextId);
      if (next === undefined) {
        fail(
          "unknown_replacement",
          `Parameter "${current.id}" is replaced by unknown "${nextId}".`,
          current.id,
        );
      }
      if (seen.has(next.id)) {
        fail("deprecation_cycle", `Deprecation cycle involving "${def.id}".`, def.id);
      }
      seen.add(next.id);
      current = next;
    }
  }
}

/**
 * Validates `definitions` against the registry invariants and returns an
 * immutable {@link ParameterRegistry} tagged with `version` and a content hash.
 *
 * @throws {@link ParameterRegistryError} on any invariant violation.
 */
export function buildParameterRegistry(
  definitions: readonly ParameterDefinition[],
  version: string,
): ParameterRegistry {
  const byId = new Map<string, ParameterDefinition>();
  const bySymbolInScope = new Map<string, string>();

  for (const raw of definitions) {
    const def = validateShape(raw);
    if (byId.has(def.id)) {
      fail("duplicate_id", `Duplicate parameter ID "${def.id}".`, def.id);
    }
    const symbolKey = `${parameterScope(def.id)}::${def.symbol}`;
    const existingSymbol = bySymbolInScope.get(symbolKey);
    if (existingSymbol !== undefined) {
      fail(
        "duplicate_symbol",
        `Symbol "${def.symbol}" is used by both "${existingSymbol}" and "${def.id}" in the same scope.`,
        def.id,
      );
    }
    bySymbolInScope.set(symbolKey, def.id);
    validateDefinition(def);
    byId.set(def.id, def);
  }

  validateDeprecations(byId);

  const sorted = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const hash = contentHash(stableStringify(sorted));

  return {
    version,
    hash,
    get: (id) => byId.get(id),
    has: (id) => byId.has(id),
    list: () => sorted,
    resolve: (id) => {
      let def = byId.get(id);
      if (def === undefined) {
        fail("unknown_parameter", `Unknown parameter "${id}".`, id);
      }
      const seen = new Set<string>();
      while (def.lifecycle === "deprecated") {
        if (seen.has(def.id)) {
          fail("deprecation_cycle", `Deprecation cycle resolving "${id}".`, id);
        }
        seen.add(def.id);
        const next = byId.get(def.replacedBy as ParameterId);
        if (next === undefined) {
          fail("unknown_replacement", `Unknown replacement for "${def.id}".`, def.id);
        }
        def = next;
      }
      return def;
    },
  };
}
