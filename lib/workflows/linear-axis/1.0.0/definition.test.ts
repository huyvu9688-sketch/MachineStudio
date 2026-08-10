// Static conformance of linear-axis@1.0.0 against the real seven modules'
// own manifest.ts ports — the same "real ports, not hand-typed parameter-id
// strings" discipline every module's own cross-module-links.test.ts already
// follows (see e.g. lib/modules/ball-screw/0.1.0/cross-module-links.test.ts).
// If a future module version renames or removes a port this definition
// relies on, this test starts failing and needs re-examining, not silently
// passing.

import { describe, expect, it } from "vitest";
import type { ModuleManifest, ModulePorts } from "@/lib/engine";
import {
  runWorkflowConformance,
  type WorkflowRoleInstance,
} from "@/lib/workflows/workflow-sdk";
import { linearAxisDefinition } from "./definition";

import {
  manifest as axisManifest,
  ports as axisPorts,
} from "@/lib/modules/axis-load-cases/0.1.0/manifest";
import {
  manifest as motionManifest,
  ports as motionPorts,
} from "@/lib/modules/motion-profile/0.1.0/manifest";
import {
  manifest as screwManifest,
  ports as screwPorts,
} from "@/lib/modules/ball-screw/0.1.0/manifest";
import {
  manifest as guideManifest,
  ports as guidePorts,
} from "@/lib/modules/linear-guide/0.1.0/manifest";
import {
  manifest as couplingManifest,
  ports as couplingPorts,
} from "@/lib/modules/coupling/0.1.0/manifest";
import {
  manifest as bearingManifest,
  ports as bearingPorts,
} from "@/lib/modules/support-bearing/0.1.0/manifest";
import {
  manifest as driveManifest,
  ports as drivePorts,
} from "@/lib/modules/drive-train/0.1.0/manifest";

interface RealModule {
  readonly manifest: Omit<ModuleManifest, "contentHash">;
  readonly ports: ModulePorts;
}

const REAL_MODULES: Readonly<Record<string, RealModule>> = {
  "axis-load-cases": { manifest: axisManifest, ports: axisPorts },
  "motion-profile": { manifest: motionManifest, ports: motionPorts },
  "ball-screw": { manifest: screwManifest, ports: screwPorts },
  "linear-guide": { manifest: guideManifest, ports: guidePorts },
  coupling: { manifest: couplingManifest, ports: couplingPorts },
  "support-bearing": { manifest: bearingManifest, ports: bearingPorts },
  "drive-train": { manifest: driveManifest, ports: drivePorts },
};

describe("linear-axis@1.0.0 roles reference real, existing modules", () => {
  it.each(linearAxisDefinition.roles)("role $id", (role) => {
    for (const moduleId of role.moduleIds) {
      expect(REAL_MODULES[moduleId]).toBeDefined();
    }
  });
});

describe("linear-axis@1.0.0 link rules are grounded in real module ports", () => {
  it.each(linearAxisDefinition.linkRules)(
    "rule $id: $parameterId ($fromRoleId -> $toRoleId)",
    (rule) => {
      const fromRole = linearAxisDefinition.roles.find(
        (r) => r.id === rule.fromRoleId,
      );
      const toRole = linearAxisDefinition.roles.find(
        (r) => r.id === rule.toRoleId,
      );
      expect(fromRole).toBeDefined();
      expect(toRole).toBeDefined();

      const fromHasOutput = (fromRole?.moduleIds ?? []).some((moduleId) =>
        REAL_MODULES[moduleId]?.ports.outputs.some(
          (p) => p.parameterId === rule.parameterId,
        ),
      );
      const toHasInput = (toRole?.moduleIds ?? []).some((moduleId) =>
        REAL_MODULES[moduleId]?.ports.inputs.some(
          (p) => p.parameterId === rule.parameterId,
        ),
      );

      expect(fromHasOutput).toBe(true);
      expect(toHasInput).toBe(true);
    },
  );
});

function instanceFor(
  instanceId: string,
  roleId: string,
  moduleId: string,
): WorkflowRoleInstance {
  const real = REAL_MODULES[moduleId];
  if (real === undefined) {
    throw new Error(`Unknown module "${moduleId}" — fixture is out of date.`);
  }
  return { instanceId, roleId, moduleId, ports: real.ports };
}

const REPRESENTATIVE_INSTANCES: readonly WorkflowRoleInstance[] = [
  instanceFor("axis-1", "linear-axis.axis", "axis-load-cases"),
  instanceFor("motion-1", "linear-axis.motion", "motion-profile"),
  instanceFor("screw-1", "linear-axis.screw", "ball-screw"),
  instanceFor("guide-1", "linear-axis.guide", "linear-guide"),
  instanceFor("coupling-1", "linear-axis.coupling", "coupling"),
  instanceFor("bearing-fixed", "linear-axis.bearing", "support-bearing"),
  instanceFor("bearing-supported", "linear-axis.bearing", "support-bearing"),
  instanceFor("drive-1", "linear-axis.drive", "drive-train"),
];

describe("linear-axis@1.0.0 conformance", () => {
  it("passes every conformance check against a full representative instance set", () => {
    const report = runWorkflowConformance(linearAxisDefinition, {
      instances: REPRESENTATIVE_INSTANCES,
    });
    const failing = report.checks.filter((c) => c.status === "fail");
    expect(failing).toEqual([]);
    expect(report.ok).toBe(true);
  });
});
