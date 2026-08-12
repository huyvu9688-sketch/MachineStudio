// The axis-load-cases module package (Unit 4.1). Assembles the manifest,
// ports, compute, UI, report, and validation record into a single
// `ModulePackage` and seals it (the content hash is stamped here).
//
// Named `index.ts` so `npm run registry:generate`
// (scripts/generate-registry.mts) discovers this package. Released and
// registered 2026-08-11 (lib/modules/registry.generated.ts,
// docs/superpowers/plans/2026-08-11-unit-4.1-release.md).

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
