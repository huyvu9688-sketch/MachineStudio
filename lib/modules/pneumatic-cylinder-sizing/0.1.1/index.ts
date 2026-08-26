// The pneumatic-cylinder-sizing module package (Unit 7.2). Assembles the
// manifest, ports, compute, UI, report, validation record, and catalog
// adapter into a single ModulePackage and seals it.
//
// Named `index.ts` so `npm run registry:generate` discovers this
// package, matching every other released module's own convention.
//
// 0.1.1 is a UI-clarity-only patch on 0.1.0 (see ./manifest.ts) --
// see ./validation.ts "deviations", the same in-code-only validation
// record pattern ball-screw@0.1.1's own patch release used (no separate
// validation/<module>/0.1.1.md file for a non-formula patch).
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
  catalogAdapter: {
    componentType: "pneumatic_cylinder",
    requiredSpec: (computation) => ({
      required_extend_force: computation.outputs.required_extend_force,
      required_retract_force: computation.outputs.required_retract_force,
      kinetic_energy: computation.outputs.kinetic_energy,
      required_stroke: computation.outputs.required_stroke_out,
      operating_pressure: computation.outputs.operating_pressure_out,
      load_factor: computation.outputs.load_factor_out,
      buckling_safety_factor: computation.outputs.buckling_safety_factor_out,
      mounting_style: computation.outputs.mounting_style_out,
      cushion_type: computation.outputs.cushion_type_out,
    }),
  },
});

export default pneumaticCylinderSizingModule;
