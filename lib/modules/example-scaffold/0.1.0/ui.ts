// Generic UI schema for the example-scaffold module. Selects and groups input ports
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
