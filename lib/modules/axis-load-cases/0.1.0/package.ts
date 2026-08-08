// The axis-load-cases module package (Unit 4.1, Stage 3 draft). Assembles
// the manifest, ports, compute, UI, report, and validation record into a
// single `ModulePackage` and seals it (the content hash is stamped here).
//
// Deliberately named `package.ts`, not `index.ts`: `npm run registry:generate`
// only discovers `lib/modules/<id>/<version>/index.ts`
// (scripts/generate-registry.mts), so this draft package stays unregistered
// until the Stage 1 validation gate clears and a real `index.ts` is added
// (see ./README.md and context/progress-tracker.md "Blocked").

import { sealModulePackage, type ModulePackage } from "@/lib/engine";
import { manifest, ports } from "./manifest";
import { inputSchema } from "./input-schema";
import { compute } from "./compute";
import { uiSchema } from "./ui";
import { reportSchema } from "./report";
import { validation } from "./validation";

export const axisLoadCasesModule: ModulePackage = sealModulePackage({
  manifest,
  ports,
  inputSchema,
  compute,
  uiSchema,
  reportSchema,
  validation,
});

export default axisLoadCasesModule;
