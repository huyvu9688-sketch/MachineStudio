// The ball-screw-motor-sizing module package, 0.2.0 (the consistency-pass
// follow-on to 0.1.0). Assembles the manifest, ports, compute, UI, report,
// and validation record into a single `ModulePackage` and seals it (the
// content hash is stamped here).
//
// Named `index.ts` so `npm run registry:generate`
// (scripts/generate-registry.mts) discovers this package. Released and
// registered 2026-08-19 (lib/modules/registry.generated.ts,
// validation/ball-screw-motor-sizing/0.2.0.md). 0.1.0 stays released,
// registered, and untouched (its own index.ts is unaffected by this file).

import { sealModulePackage, type ModulePackage } from "@/lib/engine";
import { manifest, ports } from "./manifest";
import { inputSchema } from "./input-schema";
import { compute } from "./compute";
import { uiSchema } from "./ui";
import { reportSchema } from "./report";
import { validation } from "./validation";

export const ballScrewMotorSizingModule: ModulePackage = sealModulePackage({
  manifest,
  ports,
  inputSchema,
  compute,
  uiSchema,
  reportSchema,
  validation,
});

export default ballScrewMotorSizingModule;
