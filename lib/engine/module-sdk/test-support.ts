// Shared builders for the module SDK tests. A fresh minimal valid draft plus a
// minimal valid compute, so each test can override one facet and seal it. Not a
// test file (no `.test.ts`) and not re-exported from the barrel, so vitest does
// not execute it and it is not part of the public API.

import { buildCalculationTrace } from "../trace";
import { makeQuantity } from "../units";
import { PARAMETER_REGISTRY_VERSION, asParameterId } from "../parameters";
import type { ModuleComputation, ModulePackageDraft } from "./types";
import { ModuleInputSchema } from "./schemas";

/** A minimal valid computation: one output, a one-step trace, no checks/warnings. */
export function baseCompute(): ModuleComputation {
  const out = makeQuantity(1, "N");
  return {
    outputs: { out },
    trace: buildCalculationTrace([
      {
        node: "section",
        id: "sec",
        title: "Section",
        children: [
          {
            node: "step",
            id: "step-1",
            methodId: "test.identity",
            inputs: [],
            outputs: [{ label: "out", value: out }],
          },
        ],
      },
    ]),
    checks: [],
    warnings: [],
    assumptions: [],
    validity: [],
  };
}

/**
 * A fresh minimal valid {@link ModulePackageDraft}: one required input port
 * (payload mass) and one output port (thrust force), both mapping to released
 * parameters, with a valid manifest, UI schema, report schema, and validation
 * record. Tests spread this and override a single facet.
 */
export function baseDraft(): ModulePackageDraft {
  return {
    manifest: {
      id: "test-mod",
      version: "1.0.0",
      sdkRange: { min: "1.0.0" },
      parameterRegistryVersion: PARAMETER_REGISTRY_VERSION,
      category: "test",
      tags: [],
      workflowRoles: [],
      validityEnvelopeSummary: "test module",
      sourceRevisionIds: [],
    },
    ports: {
      inputs: [
        {
          key: "mass",
          parameterId: asParameterId("motion.axis.payload_mass"),
          required: true,
        },
      ],
      outputs: [
        { key: "out", parameterId: asParameterId("motion.axis.thrust_force") },
      ],
    },
    inputSchema: ModuleInputSchema,
    compute: baseCompute,
    uiSchema: {
      groups: [{ id: "g", title: "G", fields: [{ portKey: "mass" }] }],
    },
    reportSchema: { sections: [{ id: "r", title: "R", include: "outputs" }] },
    validation: {
      moduleId: "test-mod",
      moduleVersion: "1.0.0",
      methods: ["identity"],
      sourceRevisionIds: [],
      referenceExamples: [
        { id: "ex", description: "example", tolerance: "0%" },
      ],
      independentBenchmark: "hand",
      reviewer: "self",
      reviewDate: "2026-07-28",
      supportedUseLimits: [],
      deviations: [],
    },
  };
}
