// The linear-guide module package (Unit 4.4, Stage 3 draft). Assembles the
// manifest, ports, compute, UI, report, and validation record into a single
// `ModulePackage` and seals it (the content hash is stamped here).
//
// Deliberately named `package.ts`, not `index.ts`: `npm run registry:generate`
// only discovers `lib/modules/<id>/<version>/index.ts`
// (scripts/generate-registry.mts), so this draft package stays unregistered.
// Unit 4.1 (axis-load-cases@0.1.0) released 2026-08-11
// (validation/axis-load-cases/0.1.0.md) and no longer gates registration;
// this module's own Stage 6 has not started (see ./validation.ts).

import { sealModulePackage, type ModulePackage } from "@/lib/engine";
import { manifest, ports } from "./manifest";
import { inputSchema } from "./input-schema";
import { compute } from "./compute";
import { uiSchema } from "./ui";
import { reportSchema } from "./report";
import { validation } from "./validation";

export const linearGuideModule: ModulePackage = sealModulePackage({
  manifest,
  ports,
  inputSchema,
  compute,
  uiSchema,
  reportSchema,
  validation,
});

export default linearGuideModule;
