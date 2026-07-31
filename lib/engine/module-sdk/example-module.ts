// A minimal but complete example module that proves the SDK (Unit 1.6 exit
// criterion: "A complete example module executes through the public SDK only").
// It imports solely from the engine's public surface (`../..`) — no internal
// module-sdk paths — and computes a horizontal-axis friction thrust
// F_a = μ · m · g. It is a test/proof fixture, NOT a released production module
// (a real linear-axis module is Milestone 4 with a full validation record); it
// is intentionally not re-exported from the package barrel.

import {
  asParameterId,
  buildCalculationTrace,
  makeQuantity,
  ModuleInputSchema,
  sealModulePackage,
  type ModuleComputation,
  type ModuleInput,
  type ModulePackage,
  type ModulePackageDraft,
  type Quantity,
} from "..";

/** Reads a physical input magnitude; values cross ports in canonical units. */
function magnitude(input: ModuleInput, key: string): number {
  const value = input.values[key];
  return value !== undefined && value.kind === "quantity" ? value.value : 0;
}

function compute(input: ModuleInput): ModuleComputation {
  const mass = input.values.payload_mass;
  const friction = input.values.friction_coefficient;
  const gravity = input.values.gravity;

  const thrustValue =
    magnitude(input, "friction_coefficient") *
    magnitude(input, "payload_mass") *
    magnitude(input, "gravity");
  const thrust: Quantity = makeQuantity(thrustValue, "N");

  const trace = buildCalculationTrace([
    {
      node: "section",
      id: "thrust",
      title: "Required thrust",
      children: [
        {
          node: "step",
          id: "friction-thrust",
          title: "Friction thrust",
          methodId: "axis.friction_thrust",
          expression: "F_a = μ · m · g",
          inputs: [
            {
              label: "μ",
              value: friction,
              ref: "motion.axis.friction_coefficient",
            },
            { label: "m", value: mass, ref: "motion.axis.payload_mass" },
            { label: "g", value: gravity, ref: "motion.axis.gravity" },
          ],
          outputs: [{ label: "F_a", value: thrust }],
        },
      ],
    },
  ]);

  return {
    outputs: { thrust },
    trace,
    checks: [
      {
        id: "thrust-nonnegative",
        status: thrustValue >= 0 ? "pass" : "fail",
        message:
          thrustValue >= 0
            ? "Required thrust is non-negative."
            : "Computed thrust is negative.",
        criterion: "F_a ≥ 0",
        observed: thrust,
      },
    ],
    warnings: [],
    assumptions: [
      {
        id: "horizontal",
        statement:
          "Axis assumed horizontal; gravity acts normal to travel and adds no axial load.",
      },
    ],
    validity: [
      {
        id: "friction-model",
        status: "within_limits",
        limit: "Coulomb friction model with μ in [0, 1].",
      },
    ],
  };
}

const draft: ModulePackageDraft = {
  manifest: {
    id: "example-linear-thrust",
    version: "0.1.0",
    sdkRange: { min: "1.0.0" },
    // Test/proof fixture authored against the first released registry.
    parameterRegistryVersion: "1.0.0",
    category: "motion",
    tags: ["example", "linear-axis"],
    workflowRoles: ["linear-axis.example"],
    validityEnvelopeSummary:
      "Horizontal axis, Coulomb friction thrust only. Not valid for inclined or vertical axes.",
    sourceRevisionIds: [],
  },
  ports: {
    inputs: [
      {
        key: "payload_mass",
        parameterId: asParameterId("motion.axis.payload_mass"),
        required: true,
      },
      {
        key: "friction_coefficient",
        parameterId: asParameterId("motion.axis.friction_coefficient"),
        required: true,
      },
      {
        key: "gravity",
        parameterId: asParameterId("motion.axis.gravity"),
        required: true,
      },
    ],
    outputs: [
      { key: "thrust", parameterId: asParameterId("motion.axis.thrust_force") },
    ],
  },
  inputSchema: ModuleInputSchema,
  compute,
  uiSchema: {
    groups: [
      {
        id: "loads",
        title: "Loads",
        fields: [
          { portKey: "payload_mass" },
          { portKey: "friction_coefficient" },
        ],
      },
    ],
  },
  reportSchema: {
    sections: [
      { id: "inputs", title: "Inputs", include: "inputs" },
      { id: "calc", title: "Calculation", include: "trace" },
      { id: "checks", title: "Checks", include: "checks" },
      { id: "results", title: "Results", include: "outputs" },
    ],
  },
  validation: {
    moduleId: "example-linear-thrust",
    moduleVersion: "0.1.0",
    methods: ["Coulomb friction thrust F = μ·m·g"],
    sourceRevisionIds: [],
    referenceExamples: [
      {
        id: "hand-1",
        description: "μ=0.01, m=12 kg, g=9.80665 m/s² → 1.177 N",
        tolerance: "±0.5% on required thrust",
      },
    ],
    independentBenchmark: "Hand calculation",
    reviewer: "self (documented benchmark substitute)",
    reviewDate: "2026-07-28",
    supportedUseLimits: ["Horizontal axis only", "μ in [0, 1]"],
    deviations: [],
  },
};

/** The sealed example module package (content hash stamped). */
export const exampleThrustModule: ModulePackage = sealModulePackage(draft);
