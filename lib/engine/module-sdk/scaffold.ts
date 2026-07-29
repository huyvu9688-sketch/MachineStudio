// Module scaffold generator (Unit 1.7). Produces the file set for a new module
// package under lib/modules/<module-id>/<version>/: a manifest, split
// compute/trace/checks, generic UI and report schemas, a validation record, an
// assembling index, and a conformance test. The generated module maps its
// placeholder ports to real released parameters and returns a valid computation,
// so a fresh scaffold compiles and passes the conformance suite immediately;
// the author then replaces the `TODO` markers with real engineering
// (context/implementation-map.md Unit 1.7 exit criterion; New Module Workflow).
//
// This module is intentionally free of runtime imports (types are local) so the
// `scripts/module-new.ts` CLI can import it directly under Node's native
// TypeScript execution. It performs no I/O; the CLI writes the returned files.

/** A single generated file, its path relative to the repository root. */
export interface ScaffoldFile {
  readonly path: string;
  readonly contents: string;
}

/** The result of generating a module scaffold. */
export interface ScaffoldResult {
  readonly moduleId: string;
  readonly version: string;
  /** Module directory relative to the repository root. */
  readonly moduleDir: string;
  readonly files: readonly ScaffoldFile[];
}

/** Options for {@link generateModuleScaffold}. */
export interface ScaffoldOptions {
  /** Stable module ID in kebab-case, e.g. `"ball-screw"`. */
  readonly moduleId: string;
  /** Semantic version of the initial package. Defaults to `"0.1.0"`. */
  readonly version?: string;
}

const MODULE_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

/** Converts a kebab-case module ID to a camelCase identifier. */
function toCamelCase(moduleId: string): string {
  return moduleId.replace(/-([a-z0-9])/g, (_, ch: string) => ch.toUpperCase());
}

function manifestFile(moduleId: string, version: string): string {
  return `// Manifest and ports for the ${moduleId} module.
// TODO: set category/tags/workflowRoles/validity envelope, declare the real
// input and output ports (mapping to released canonical parameters), and list
// the source revisions the module's methods are based on.

import {
  PARAMETER_REGISTRY_VERSION,
  asParameterId,
  type ModuleManifest,
  type ModulePorts,
} from "@/lib/engine";

export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "${moduleId}",
  version: "${version}",
  sdkRange: { min: "1.0.0" },
  parameterRegistryVersion: PARAMETER_REGISTRY_VERSION,
  category: "TODO",
  tags: [],
  workflowRoles: [],
  validityEnvelopeSummary: "TODO: describe the supported application envelope.",
  sourceRevisionIds: [],
};

export const ports: ModulePorts = {
  inputs: [
    // TODO: replace with the module's real input ports.
    {
      key: "payload_mass",
      parameterId: asParameterId("motion.axis.payload_mass"),
      required: true,
    },
  ],
  outputs: [
    // TODO: replace with the module's real output ports.
    { key: "result", parameterId: asParameterId("motion.axis.thrust_force") },
  ],
};
`;
}

function traceFile(moduleId: string): string {
  return `// Calculation trace for the ${moduleId} module. The trace is the single
// report-renderable artifact; it embeds the actual input/output values and
// carries a stable step ID and method ID. Cite sources with a ClauseReference
// and declare their revisions on the manifest.

import {
  buildCalculationTrace,
  type CalculationTrace,
  type EngineeringValue,
} from "@/lib/engine";

export function buildTrace(
  payloadMass: EngineeringValue,
  result: EngineeringValue,
): CalculationTrace {
  return buildCalculationTrace([
    {
      node: "section",
      id: "result",
      title: "Result",
      children: [
        {
          node: "step",
          id: "compute-result",
          title: "Compute result", // TODO
          methodId: "TODO.method_id",
          // TODO: cite the method source: sources: [{ sourceRevisionId, clause }].
          inputs: [
            { label: "m", value: payloadMass, ref: "motion.axis.payload_mass" },
          ],
          outputs: [{ label: "result", value: result }],
        },
      ],
    },
  ]);
}
`;
}

function checksFile(moduleId: string): string {
  return `// Acceptance checks for the ${moduleId} module. Every check has a stable id, a
// status (pass/fail/warning/not_applicable/invalid_input), a message, and,
// where meaningful, a criterion, observed value, allowable limit, and margin.

import type { CheckResult, EngineeringValue } from "@/lib/engine";

export function buildChecks(result: EngineeringValue): CheckResult[] {
  const value = result.kind === "quantity" ? result.value : 0;
  return [
    // TODO: replace with the module's real acceptance checks.
    {
      id: "result-nonnegative",
      status: value >= 0 ? "pass" : "fail",
      message:
        value >= 0 ? "Result is non-negative." : "Result is negative.",
      criterion: "result >= 0",
      observed: result,
    },
  ];
}
`;
}

function computeFile(moduleId: string): string {
  return `// Pure, deterministic compute function for the ${moduleId} module. Reads input
// magnitudes in their canonical units, computes outputs, and returns a
// structured computation (outputs, trace, checks, warnings, assumptions,
// validity). Performs no I/O and imports only the engine's public surface.

import {
  makeQuantity,
  type ModuleComputation,
  type ModuleInput,
  type Quantity,
} from "@/lib/engine";
import { buildTrace } from "./trace";
import { buildChecks } from "./checks";

export function compute(input: ModuleInput): ModuleComputation {
  const payloadMass = input.values.payload_mass;
  const mass = payloadMass?.kind === "quantity" ? payloadMass.value : 0;

  // TODO: implement the real method. This placeholder returns 0 N.
  const result: Quantity = makeQuantity(mass * 0, "N");

  return {
    outputs: { result },
    trace: buildTrace(payloadMass, result),
    checks: buildChecks(result),
    warnings: [],
    assumptions: [],
    validity: [],
  };
}
`;
}

function uiFile(moduleId: string): string {
  return `// Generic UI schema for the ${moduleId} module. Selects and groups input ports
// for the generic module workspace (Unit 3.3); it encodes no computation.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "inputs",
      title: "Inputs",
      fields: [{ portKey: "payload_mass" }],
    },
  ],
};
`;
}

function reportFile(moduleId: string): string {
  return `// Generic report schema for the ${moduleId} module. Declares the sections a
// report renders from the stored trace and computation (Unit 5.2); it never
// reimplements formulas.

import type { ModuleReportSchema } from "@/lib/engine";

export const reportSchema: ModuleReportSchema = {
  sections: [
    { id: "inputs", title: "Inputs", include: "inputs" },
    { id: "calc", title: "Calculation", include: "trace" },
    { id: "checks", title: "Checks", include: "checks" },
    { id: "results", title: "Results", include: "outputs" },
  ],
};
`;
}

function validationFile(moduleId: string, version: string): string {
  return `// Validation record for the ${moduleId} module (roadmap module definition of
// done, item 10). TODO: reproduce at least three published reference examples,
// document an independent benchmark, and record the reviewer and use limits
// before releasing this module.

import type { ValidationRecord } from "@/lib/engine";

export const validation: ValidationRecord = {
  moduleId: "${moduleId}",
  moduleVersion: "${version}",
  methods: ["TODO: method / standard names"],
  sourceRevisionIds: [],
  referenceExamples: [
    { id: "example-1", description: "TODO: published worked example", tolerance: "TODO" },
  ],
  independentBenchmark: "TODO: independent method or tool comparison",
  reviewer: "TODO",
  reviewDate: "TODO",
  supportedUseLimits: ["TODO"],
  deviations: [],
};
`;
}

function indexFile(moduleId: string, camelId: string): string {
  return `// The ${moduleId} module package. Assembles the manifest, ports, compute, UI,
// report, and validation record into a single ModulePackage and seals it (the
// content hash is stamped at this point). This is the only object the engine
// executes and reports on; it is registered via \`npm run registry:generate\`.

import {
  ModuleInputSchema,
  sealModulePackage,
  type ModulePackage,
} from "@/lib/engine";
import { manifest, ports } from "./manifest";
import { compute } from "./compute";
import { uiSchema } from "./ui";
import { reportSchema } from "./report";
import { validation } from "./validation";

export const ${camelId}Module: ModulePackage = sealModulePackage({
  manifest,
  ports,
  inputSchema: ModuleInputSchema,
  compute,
  uiSchema,
  reportSchema,
  validation,
});

export default ${camelId}Module;
`;
}

function testFile(moduleId: string): string {
  return `import { describe, expect, it } from "vitest";
import { makeQuantity, runModuleConformance } from "@/lib/engine";
import modulePackage from "./index";

// The scaffold conforms out of the box. As you implement the real method,
// update the sample input(s) to exercise it and keep this suite green.
describe("${moduleId} conformance", () => {
  const report = runModuleConformance(modulePackage, {
    sampleInputs: [
      { values: { payload_mass: makeQuantity(10, "kg") } }, // TODO: realistic input
    ],
  });

  for (const check of report.checks) {
    it(\`\${check.id} (\${check.status})\`, () => {
      expect(check.status, check.detail).not.toBe("fail");
    });
  }

  it("passes overall conformance", () => {
    expect(report.ok, JSON.stringify(report.checks, null, 2)).toBe(true);
  });
});
`;
}

/**
 * Generates the file set for a new module scaffold. Pure: validates the ID and
 * version, then returns the files to write. Throws on an invalid module ID or
 * version.
 */
export function generateModuleScaffold(options: ScaffoldOptions): ScaffoldResult {
  const moduleId = options.moduleId;
  const version = options.version ?? "0.1.0";

  if (!MODULE_ID_PATTERN.test(moduleId)) {
    throw new Error(
      `Invalid module ID "${moduleId}": expected kebab-case (e.g. "ball-screw").`,
    );
  }
  if (!VERSION_PATTERN.test(version)) {
    throw new Error(`Invalid version "${version}": expected "x.y.z".`);
  }

  const camelId = toCamelCase(moduleId);
  const moduleDir = `lib/modules/${moduleId}/${version}`;
  const file = (name: string, contents: string): ScaffoldFile => ({
    path: `${moduleDir}/${name}`,
    contents,
  });

  return {
    moduleId,
    version,
    moduleDir,
    files: [
      file("manifest.ts", manifestFile(moduleId, version)),
      file("trace.ts", traceFile(moduleId)),
      file("checks.ts", checksFile(moduleId)),
      file("compute.ts", computeFile(moduleId)),
      file("ui.ts", uiFile(moduleId)),
      file("report.ts", reportFile(moduleId)),
      file("validation.ts", validationFile(moduleId, version)),
      file("index.ts", indexFile(moduleId, camelId)),
      file(`${moduleId}.test.ts`, testFile(moduleId)),
    ],
  };
}
