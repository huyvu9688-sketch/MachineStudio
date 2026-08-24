// Module execution through the public SDK (Unit 1.6). `executeModule` is the
// only path that runs a module's pure compute function; it enforces the runtime
// contract around it (context/architecture.md `ModuleComputation`; invariants
// "Engine purity", "Units and value types everywhere"):
//  - the running engine SDK version is within the module's declared range
//  - the raw input passes the module's input schema
//  - required inputs are present (constant parameter defaults are auto-filled)
//    and every input value matches its parameter's kind and unit dimension
//  - every input value's magnitude falls within its parameter's declared range,
//    when one is declared (added in SDK 1.1.0 — a release audit found ranges
//    like buckling_safety_margin's [0, 1] were declared but never enforced,
//    letting an out-of-range input compute through and false-pass a check)
//  - the computation is well-formed; every declared output is produced with the
//    right kind/dimension and no undeclared outputs are returned
//  - the trace is structurally valid and every cited source is declared in the
//    manifest
//
// `computeIsDeterministic` supports the conformance suite's nondeterminism check.

import { convert, dimensionsEqual, getUnit, hasUnit } from "../units";
import { engineeringValuesEqual, type EngineeringValue } from "../values";
import type { ParameterDefinition, ParameterRegistry } from "../parameters";
import { PARAMETER_REGISTRY } from "../parameters";
import { validateCalculationTrace, walkTrace, TraceError } from "../trace";
import type { ClauseReference } from "../../standards/types";
import { ModuleSdkError, type ModuleSdkErrorCode } from "./errors";
import { ModuleComputationSchema } from "./schemas";
import { ENGINE_SDK_VERSION, isSdkCompatible } from "./sdk";
import type { ModuleComputation, ModuleInput, ModulePackage } from "./types";

/** Options for {@link executeModule}. */
export interface ExecuteOptions {
  /** Parameter registry to validate ports/values against. Defaults to the released one. */
  readonly registry?: ParameterRegistry;
  /** Running engine SDK version. Defaults to {@link ENGINE_SDK_VERSION}. */
  readonly engineSdkVersion?: string;
}

function fail(
  code: ModuleSdkErrorCode,
  message: string,
  subjectId?: string,
): never {
  throw new ModuleSdkError(code, message, subjectId);
}

/** The unit of a physical value, else `undefined`. */
function unitOf(value: EngineeringValue): string | undefined {
  return value.kind === "quantity" || value.kind === "vector_quantity"
    ? value.unit
    : undefined;
}

/**
 * Asserts a value matches its parameter's value family and, for a physical
 * parameter, is expressed in the parameter's canonical unit. Values cross ports
 * in canonical units (context/architecture.md Quantity "stored in its
 * parameter's canonical unit"); display-unit conversion is the caller's concern,
 * so a module compute can read a value's magnitude directly. `code` selects the
 * error class so the same check serves both input and output validation.
 */
function assertValueMatchesParameter(
  value: EngineeringValue,
  def: ParameterDefinition,
  key: string,
  code: ModuleSdkErrorCode,
): void {
  const wrongKind = (): never =>
    fail(
      code,
      `Port "${key}" expects a "${def.valueType}" but got a "${value.kind}".`,
      key,
    );

  switch (def.valueType) {
    case "quantity":
      if (value.kind !== "quantity") wrongKind();
      break;
    case "vector_quantity":
      if (value.kind !== "vector_quantity") wrongKind();
      break;
    case "enum":
      if (value.kind !== "enum") wrongKind();
      else if (
        value.enumId !== def.enumId ||
        def.enumOptions?.includes(value.value) !== true
      ) {
        fail(
          code,
          `Port "${key}" enum value is not a valid option of "${def.enumId}".`,
          key,
        );
      }
      return;
    case "boolean":
      if (value.kind !== "boolean") wrongKind();
      return;
    default: {
      const exhaustive: never = def.valueType;
      fail(code, `Unhandled parameter value type: ${String(exhaustive)}`, key);
    }
  }

  // Physical parameter: the value must carry the parameter's canonical unit.
  const unit = unitOf(value);
  const canonicalUnit = def.canonicalUnit as string;
  if (unit === undefined || !hasUnit(unit)) {
    fail(
      code,
      `Port "${key}" value carries unknown unit "${unit ?? "?"}".`,
      key,
    );
  }
  if (
    !dimensionsEqual(getUnit(unit).dimension, getUnit(canonicalUnit).dimension)
  ) {
    fail(
      code,
      `Port "${key}" value unit "${unit}" is not dimension-compatible with "${canonicalUnit}".`,
      key,
    );
  }
  if (unit !== canonicalUnit) {
    fail(
      code,
      `Port "${key}" value unit "${unit}" must be the canonical unit "${canonicalUnit}".`,
      key,
    );
  }
}

/**
 * Asserts a quantity input's magnitude falls within its parameter's declared
 * {@link ParameterDefinition.range}, when one is declared. Input-only: an
 * out-of-range output would misreport a formula defect as an SDK contract
 * violation instead of surfacing the real bug, and some released modules
 * intentionally produce a signed output a one-sided range would reject (see
 * `screw.drive_torque`). Ranges are declared engineer-facing constraints
 * (e.g. `buckling_safety_margin` in `[0, 1]`); an out-of-range input was
 * previously silently accepted and computed through — see the release audit
 * this closes.
 */
function assertValueInRange(
  value: EngineeringValue,
  def: ParameterDefinition,
  key: string,
): void {
  if (value.kind !== "quantity" || def.range === undefined) return;
  const { min, max, unit: rangeUnit } = def.range;
  const magnitude = convert(value.value, value.unit, rangeUnit);
  if (min !== undefined && magnitude < min) {
    fail(
      "input_value_out_of_range",
      `Port "${key}" value ${magnitude} ${rangeUnit} is below the parameter's minimum of ${min} ${rangeUnit}.`,
      key,
    );
  }
  if (max !== undefined && magnitude > max) {
    fail(
      "input_value_out_of_range",
      `Port "${key}" value ${magnitude} ${rangeUnit} is above the parameter's maximum of ${max} ${rangeUnit}.`,
      key,
    );
  }
}

/** Collects the source-revision IDs cited anywhere in a computation. */
function citedRevisions(computation: ModuleComputation): Set<string> {
  const cited = new Set<string>();
  const add = (refs: readonly ClauseReference[] | undefined): void => {
    for (const ref of refs ?? []) cited.add(ref.sourceRevisionId);
  };
  walkTrace(computation.trace, { step: (step) => add(step.sources) });
  for (const check of computation.checks) add(check.sources);
  for (const warning of computation.warnings) add(warning.sources);
  for (const validity of computation.validity) add(validity.sources);
  for (const assumption of computation.assumptions) add(assumption.sources);
  return cited;
}

/**
 * Resolves a raw input into a validated {@link ModuleInput} ready for compute:
 * parses it against the module's input schema, fills constant parameter
 * defaults for absent ports, and asserts every value matches its parameter's
 * kind and canonical unit. This is the input half of {@link executeModule},
 * exposed so tooling (e.g. the conformance suite's determinism check) can build
 * the exact input the module would compute on.
 *
 * @throws {@link ModuleSdkError} on any input contract violation.
 */
export function resolveModuleInput(
  pkg: ModulePackage,
  rawInput: unknown,
  options: { readonly registry?: ParameterRegistry } = {},
): ModuleInput {
  const registry = options.registry ?? PARAMETER_REGISTRY;

  const parsed = pkg.inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    fail(
      "input_schema_mismatch",
      `Input rejected by module schema: ${parsed.error.message}`,
      pkg.manifest.id,
    );
  }

  const values: Record<string, EngineeringValue> = { ...parsed.data.values };
  for (const port of pkg.ports.inputs) {
    const def = registry.get(port.parameterId);
    let value = values[port.key];
    if (value === undefined) {
      if (def?.defaultPolicy.kind === "constant") {
        value = def.defaultPolicy.value;
        values[port.key] = value;
      } else if (port.required) {
        fail(
          "missing_required_input",
          `Missing required input "${port.key}".`,
          port.key,
        );
      } else {
        continue;
      }
    }
    if (def !== undefined) {
      assertValueMatchesParameter(value, def, port.key, "input_value_mismatch");
      assertValueInRange(value, def, port.key);
    }
  }

  return {
    values,
    ...(parsed.data.loadCaseId !== undefined && {
      loadCaseId: parsed.data.loadCaseId,
    }),
  };
}

/**
 * Executes a module package against a raw input, returning its validated
 * {@link ModuleComputation}.
 *
 * @throws {@link ModuleSdkError} on any contract violation.
 */
export function executeModule(
  pkg: ModulePackage,
  rawInput: unknown,
  options: ExecuteOptions = {},
): ModuleComputation {
  const registry = options.registry ?? PARAMETER_REGISTRY;
  const engineSdkVersion = options.engineSdkVersion ?? ENGINE_SDK_VERSION;

  if (!isSdkCompatible(pkg.manifest.sdkRange, engineSdkVersion)) {
    fail(
      "incompatible_sdk",
      `Engine SDK ${engineSdkVersion} is outside module "${pkg.manifest.id}" range [${pkg.manifest.sdkRange.min}, ${pkg.manifest.sdkRange.maxExclusive ?? "∞"}).`,
      pkg.manifest.id,
    );
  }

  const resolvedInput = resolveModuleInput(pkg, rawInput, { registry });

  const computation = pkg.compute(resolvedInput);

  const parsedComputation = ModuleComputationSchema.safeParse(computation);
  if (!parsedComputation.success) {
    fail(
      "invalid_computation",
      `Module "${pkg.manifest.id}" returned a malformed computation: ${parsedComputation.error.message}`,
      pkg.manifest.id,
    );
  }

  // Outputs: every declared port produced with matching kind/dimension; no extras.
  const remaining = new Set(Object.keys(parsedComputation.data.outputs));
  for (const port of pkg.ports.outputs) {
    const value = parsedComputation.data.outputs[port.key];
    if (value === undefined) {
      fail(
        "output_schema_mismatch",
        `Module "${pkg.manifest.id}" did not produce output "${port.key}".`,
        port.key,
      );
    }
    const def = registry.get(port.parameterId);
    if (def !== undefined) {
      assertValueMatchesParameter(
        value,
        def,
        port.key,
        "output_schema_mismatch",
      );
    }
    remaining.delete(port.key);
  }
  if (remaining.size > 0) {
    fail(
      "output_schema_mismatch",
      `Module "${pkg.manifest.id}" produced undeclared outputs: ${[...remaining].join(", ")}.`,
      pkg.manifest.id,
    );
  }

  // Trace invariants (unique node IDs, complete source locations).
  try {
    validateCalculationTrace(parsedComputation.data.trace);
  } catch (error) {
    if (error instanceof TraceError) {
      fail(
        "invalid_computation",
        `Module "${pkg.manifest.id}" trace is invalid: ${error.message}`,
        pkg.manifest.id,
      );
    }
    throw error;
  }

  // Every cited source must be declared on the manifest.
  const declared = new Set<string>(pkg.manifest.sourceRevisionIds);
  for (const revisionId of citedRevisions(parsedComputation.data)) {
    if (!declared.has(revisionId)) {
      fail(
        "missing_trace_source",
        `Module "${pkg.manifest.id}" cites source "${revisionId}" not declared in its manifest.`,
        revisionId,
      );
    }
  }

  return computation;
}

/**
 * Runs `pkg.compute` `runs` times on the same input and returns whether every
 * run produced identical outputs. Supports the conformance suite's
 * nondeterminism detection (context/implementation-map.md Unit 1.6). Compares
 * output values in canonical units; does not convert.
 */
export function computeIsDeterministic(
  pkg: ModulePackage,
  input: ModuleInput,
  runs = 2,
): boolean {
  const first = pkg.compute(input).outputs;
  const firstKeys = Object.keys(first);
  for (let i = 1; i < runs; i++) {
    const next = pkg.compute(input).outputs;
    const nextKeys = Object.keys(next);
    if (nextKeys.length !== firstKeys.length) return false;
    for (const key of firstKeys) {
      const a = first[key];
      const b = next[key];
      if (b === undefined || !engineeringValuesEqual(a, b)) return false;
    }
  }
  return true;
}
