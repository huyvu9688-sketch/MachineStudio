// The dual-rod-cylinder-sizing module package (Unit 7.4). Assembles the
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
// the same precedent both prior sizing modules already established.

import { sealModulePackage, ModuleInputSchema, type ModulePackage } from "@/lib/engine";
import { manifest, ports } from "./manifest";
import { compute } from "./compute";
import { uiSchema } from "./ui";
import { reportSchema } from "./report";
import { validation } from "./validation";

export const dualRodCylinderSizingModule: ModulePackage = sealModulePackage({
  manifest,
  ports,
  inputSchema: ModuleInputSchema,
  compute,
  uiSchema,
  reportSchema,
  validation,
  catalogAdapter: {
    componentType: "pneumatic_cylinder_dual_rod",
    requiredSpec: (computation) => ({
      required_extend_force: computation.outputs.required_extend_force,
      required_retract_force: computation.outputs.required_retract_force,
      kinetic_energy: computation.outputs.kinetic_energy,
      required_stroke: computation.outputs.required_stroke_out,
      overhang_length: computation.outputs.overhang_length_out,
      mounting_orientation: computation.outputs.mounting_orientation_out,
      operating_pressure: computation.outputs.operating_pressure_out,
      load_factor: computation.outputs.load_factor_out,
      max_piston_speed: computation.outputs.max_piston_speed_out,
      cushion_type: computation.outputs.cushion_type_out,
      load_mass: computation.outputs.load_mass_out,
    }),
  },
});

export default dualRodCylinderSizingModule;
