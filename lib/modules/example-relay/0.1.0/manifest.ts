// Manifest and ports for the example-relay development fixture.
//
// This module is NOT an engineering module: it computes nothing and carries no
// validated method. It exists because `confirmParameterLink`
// (lib/application/parameters/) enforces semantic link compatibility, so a
// module-output → module-input link is only authorized between the *same*
// canonical parameter (no approved cross-parameter mappings are declared yet).
// example-scaffold consumes a mass and produces a force, so a chain of
// example-scaffold instances can only be wired through a semantically invalid
// link. This package declares the same parameter on both sides
// (`motion.axis.thrust_force` in, `motion.axis.thrust_force` out), which makes a
// valid multi-module chain expressible for the integration tests that must
// exercise cycle rejection and multi-level stale propagation against a real
// database.
//
// Replace nothing here when writing a real module: scaffold a new one with
// `npm run module:new`.

import {
  PARAMETER_REGISTRY_VERSION,
  asParameterId,
  type ModuleManifest,
  type ModulePorts,
} from "@/lib/engine";

export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "example-relay",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  parameterRegistryVersion: PARAMETER_REGISTRY_VERSION,
  category: "development-fixture",
  tags: ["fixture"],
  workflowRoles: [],
  validityEnvelopeSummary:
    "Development fixture. Passes a required thrust force through unchanged; not valid for any engineering use.",
  sourceRevisionIds: [],
};

export const ports: ModulePorts = {
  inputs: [
    {
      key: "thrust_force_in",
      parameterId: asParameterId("motion.axis.thrust_force"),
      required: true,
    },
  ],
  outputs: [
    {
      key: "thrust_force_out",
      parameterId: asParameterId("motion.axis.thrust_force"),
    },
  ],
};
