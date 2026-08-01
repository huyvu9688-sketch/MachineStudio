// Link compatibility evaluator (Unit 1.8). Decides whether a value may flow from
// a source node to a sink node. Semantic compatibility — not unit compatibility
// alone — authorizes a link (context/architecture.md "Link Compatibility";
// invariant "Semantic link safety"):
//
//   1. direction        — a value flows from a provider to a `module_input`
//   2. parameter identity — same canonical parameter, or an approved mapping
//   3. value family       — same EngineeringValue kind
//   4. physical dimension — equal (via the unit registry)
//   5. semantic qualifiers — bound / aggregation / load-nature agree on every
//                            populated axis (absent axes do not constrain)
//   6. coordinate frame    — equal
//   7. load case           — a load-case-pinned sink requires the source to
//                            declare the identical case; an unpinned source
//                            must never silently satisfy a pinned sink (an
//                            unpinned sink accepts a pinned or unpinned source)
//
// For a plain parameter-identity link (criteria 3–6 hold trivially: it is one
// parameter), only direction and load case are evaluated. Criteria 3–6 are
// enforced when an approved mapping joins two *different* parameters, so even an
// approved mapping cannot bind semantically incompatible ports.

import { dimensionsEqual, getUnit, hasUnit } from "../units";
import type { ParameterDefinition, ParameterRegistry } from "../parameters";
import { PARAMETER_REGISTRY } from "../parameters";
import type {
  ApprovedParameterMapping,
  GraphNode,
  LinkCompatibility,
  LinkIncompatibilityReason,
} from "./types";

/** Options for {@link evaluateLinkCompatibility}. */
export interface CompatibilityOptions {
  /** Parameter registry the nodes' parameters are defined in. Defaults to the released one. */
  readonly registry?: ParameterRegistry;
  /** Approved cross-parameter mappings that authorize non-identity links. */
  readonly mappings?: readonly ApprovedParameterMapping[];
}

const PHYSICAL_TYPES = new Set(["quantity", "vector_quantity"]);

/** True when an approved mapping authorizes `from` → `to`. */
function hasApprovedMapping(
  mappings: readonly ApprovedParameterMapping[],
  from: string,
  to: string,
): boolean {
  return mappings.some((m) => m.from === from && m.to === to);
}

/** Compares the semantic axes of two *different* parameters joined by a mapping. */
function semanticReasons(
  sourceDef: ParameterDefinition,
  sinkDef: ParameterDefinition,
): LinkIncompatibilityReason[] {
  const reasons: LinkIncompatibilityReason[] = [];

  if (sourceDef.valueType !== sinkDef.valueType) {
    reasons.push("value_type");
    // Value families differ; deeper physical/enum comparison is meaningless.
    return reasons;
  }

  if (PHYSICAL_TYPES.has(sourceDef.valueType)) {
    const su = sourceDef.canonicalUnit;
    const ku = sinkDef.canonicalUnit;
    if (
      su === undefined ||
      ku === undefined ||
      !hasUnit(su) ||
      !hasUnit(ku) ||
      !dimensionsEqual(getUnit(su).dimension, getUnit(ku).dimension)
    ) {
      reasons.push("dimension");
    }
  } else if (sourceDef.valueType === "enum" && sourceDef.enumId !== sinkDef.enumId) {
    reasons.push("enum_type");
  }

  // Qualifier axes: only a populated-on-both, differing axis constrains.
  const sq = sourceDef.qualifiers;
  const kq = sinkDef.qualifiers;
  if (sq.bound !== undefined && kq.bound !== undefined && sq.bound !== kq.bound) {
    reasons.push("bound");
  }
  if (
    sq.aggregation !== undefined &&
    kq.aggregation !== undefined &&
    sq.aggregation !== kq.aggregation
  ) {
    reasons.push("aggregation");
  }
  if (
    sq.loadNature !== undefined &&
    kq.loadNature !== undefined &&
    sq.loadNature !== kq.loadNature
  ) {
    reasons.push("load_nature");
  }

  if (sourceDef.frame !== sinkDef.frame) {
    reasons.push("frame");
  }

  return reasons;
}

/**
 * Evaluates whether `source` may link to `sink`. Returns the full set of
 * violated criteria (empty when compatible). Pure and deterministic; depends
 * only on the two nodes, the parameter registry, and the approved mappings.
 */
export function evaluateLinkCompatibility(
  source: GraphNode,
  sink: GraphNode,
  options: CompatibilityOptions = {},
): LinkCompatibility {
  const registry = options.registry ?? PARAMETER_REGISTRY;
  const mappings = options.mappings ?? [];

  // 1. Direction: a value flows from a provider to a consuming module input.
  if (sink.kind !== "module_input" || source.kind === "module_input") {
    return { compatible: false, reasons: ["direction"], mapped: false };
  }

  const sourceDef = registry.get(source.parameterId);
  const sinkDef = registry.get(sink.parameterId);
  if (sourceDef === undefined || sinkDef === undefined) {
    // A node references an unregistered parameter: no basis for identity.
    return { compatible: false, reasons: ["parameter_identity"], mapped: false };
  }

  const sameParameter = source.parameterId === sink.parameterId;
  const mapped =
    !sameParameter &&
    hasApprovedMapping(mappings, source.parameterId, sink.parameterId);

  if (!sameParameter && !mapped) {
    return { compatible: false, reasons: ["parameter_identity"], mapped: false };
  }

  const reasons: LinkIncompatibilityReason[] = mapped
    ? semanticReasons(sourceDef, sinkDef)
    : [];

  // 7. Load case: a pinned sink requires the identical case from the source,
  // including when the source declares none at all — an unpinned source's
  // value is not known to represent the sink's specific case, so it must not
  // silently satisfy it. An unpinned sink imposes no load-case constraint.
  if (sink.loadCase !== undefined && source.loadCase !== sink.loadCase) {
    reasons.push("load_case");
  }

  return { compatible: reasons.length === 0, reasons, mapped };
}
