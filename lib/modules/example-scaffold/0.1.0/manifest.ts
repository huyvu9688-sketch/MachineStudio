// Manifest and ports for the example-scaffold module.
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
  id: "example-scaffold",
  version: "0.1.0",
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
