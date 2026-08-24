// The ball-screw module package (Unit 4.3). Assembles the manifest, ports,
// compute, UI, report, and validation record into a single `ModulePackage`
// and seals it (the content hash is stamped here).
//
// Named `index.ts` so `npm run registry:generate`
// (scripts/generate-registry.mts) discovers this package. 0.1.1 is a
// formula-correctness patch on 0.1.0 (see manifest.ts) —
// validation/ball-screw/0.1.1.md.

import { sealModulePackage, type ModulePackage } from "@/lib/engine";
import { manifest, ports } from "./manifest";
import { inputSchema } from "./input-schema";
import { compute } from "./compute";
import { uiSchema } from "./ui";
import { reportSchema } from "./report";
import { validation } from "./validation";

export const ballScrewModule: ModulePackage = sealModulePackage({
  manifest,
  ports,
  inputSchema,
  compute,
  uiSchema,
  reportSchema,
  validation,
});

export default ballScrewModule;
