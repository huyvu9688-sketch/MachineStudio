// The guided-cylinder-sizing module package (Unit 7.3). Assembles the
// manifest, ports, compute, UI, report, validation record, and catalog
// adapter into a single ModulePackage and seals it.
//
// Named `index.ts` so `npm run registry:generate` discovers this package,
// matching every other released module's own convention.
//
// No author-provided `superRefine` cross-field input-schema rule is
// needed here: every input this module declares is either unconditionally
// required at the port level (see ./manifest.ts) or unconditionally
// optional with a registry-level constant default (process_force -> 0 N),
// the same precedent pneumatic-cylinder-sizing@0.1.0 already established.

import { sealModulePackage, ModuleInputSchema, type ModulePackage } from "@/lib/engine";
import { manifest, ports } from "./manifest";
import { compute } from "./compute";
import { uiSchema } from "./ui";
import { reportSchema } from "./report";
import { validation } from "./validation";

export const guidedCylinderSizingModule: ModulePackage = sealModulePackage({
  manifest,
  ports,
  inputSchema: ModuleInputSchema,
  compute,
  uiSchema,
  reportSchema,
  validation,
  catalogAdapter: {
    componentType: "pneumatic_cylinder_guided",
    requiredSpec: (computation) => ({
      required_extend_force: computation.outputs.required_extend_force,
      required_retract_force: computation.outputs.required_retract_force,
      required_moment: computation.outputs.required_moment,
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

export default guidedCylinderSizingModule;
