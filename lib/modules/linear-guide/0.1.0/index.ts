// The linear-guide module package (Unit 4.4). Assembles the manifest,
// ports, compute, UI, report, and validation record into a single
// `ModulePackage` and seals it (the content hash is stamped here).
//
// Named `index.ts` so `npm run registry:generate`
// (scripts/generate-registry.mts) discovers this package. Released and
// registered 2026-08-12 (lib/modules/registry.generated.ts,
// validation/linear-guide/0.1.0.md).

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
