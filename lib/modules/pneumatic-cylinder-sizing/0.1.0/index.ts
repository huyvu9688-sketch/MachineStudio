// The pneumatic-cylinder-sizing module package (Unit 7.2). Assembles the
// manifest, ports, compute, UI, report, and validation record into a
// single ModulePackage and seals it. catalogAdapter is added by a later
// task, once the catalog schema and matcher exist.
//
// Named `index.ts` so `npm run registry:generate` discovers this
// package, matching every other released module's own convention.
//
// No author-provided `superRefine` cross-field input-schema rule is
// needed here (unlike pneumatic-cylinder@0.1.0's own input-schema.ts,
// which enforces "at least one of required_extend_force/
// required_retract_force" and three other conditional rules): every
// input this module declares is either unconditionally required at the
// port level (see ./manifest.ts) or unconditionally optional with a
// registry-level constant default (process_force -> 0 N). The generic
// `ModuleInputSchema` (shape-only: values/loadCaseId) is therefore the
// right input schema, matching lib/engine/module-sdk/types.ts's
// `ModulePackage.inputSchema: z.ZodType<ModuleInput>` contract directly.

import { sealModulePackage, ModuleInputSchema, type ModulePackage } from "@/lib/engine";
import { manifest, ports } from "./manifest";
import { compute } from "./compute";
import { uiSchema } from "./ui";
import { reportSchema } from "./report";
import { validation } from "./validation";

export const pneumaticCylinderSizingModule: ModulePackage = sealModulePackage({
  manifest,
  ports,
  inputSchema: ModuleInputSchema,
  compute,
  uiSchema,
  reportSchema,
  validation,
});

export default pneumaticCylinderSizingModule;
