// Generic UI schema for the example-relay fixture.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "inputs",
      title: "Inputs",
      fields: [{ portKey: "thrust_force_in" }],
    },
  ],
};
