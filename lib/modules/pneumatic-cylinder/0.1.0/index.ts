// The pneumatic-cylinder module package (Unit 7.1). Assembles the
// manifest, ports, compute, UI, report, and validation record into a
// single ModulePackage and seals it (the content hash is stamped here).
//
// Named `index.ts` so `npm run registry:generate`
// (scripts/generate-registry.mts) discovers this package, matching every
// other released module's own naming convention.

import { sealModulePackage, type ModulePackage } from "@/lib/engine";
import { manifest, ports } from "./manifest";
import { inputSchema } from "./input-schema";
import { compute } from "./compute";
import { uiSchema } from "./ui";
import { reportSchema } from "./report";
import { validation } from "./validation";

export const pneumaticCylinderModule: ModulePackage = sealModulePackage({
  manifest,
  ports,
  inputSchema,
  compute,
  uiSchema,
  reportSchema,
  validation,
});

export default pneumaticCylinderModule;
