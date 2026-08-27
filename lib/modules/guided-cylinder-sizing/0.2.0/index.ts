import { sealModulePackage, type ModulePackage } from "@/lib/engine";
import { compute } from "./compute";
import { inputSchema } from "./input-schema";
import { manifest, ports } from "./manifest";
import { reportSchema } from "./report";
import { uiSchema } from "./ui";
import { validation } from "./validation";

export const guidedCylinderSizingMgpModule: ModulePackage = sealModulePackage({
  manifest,
  ports,
  inputSchema,
  compute,
  uiSchema,
  reportSchema,
  validation,
  catalogAdapter: {
    componentType: "pneumatic_cylinder_guided_mgp",
    requiredSpec: (computation) => ({
      factored_load_mass: computation.outputs.factored_load_mass,
      application_case: computation.outputs.application_case_out,
      required_stroke: computation.outputs.required_stroke_out,
      operating_pressure: computation.outputs.operating_pressure_out,
    }),
  },
});

export default guidedCylinderSizingMgpModule;
