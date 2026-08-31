// The shaft-key-bolt-checks module package (Unit 7.5, Stage 6 -- released).
// Assembles the manifest, ports, compute, UI, report, and validation record
// into a single `ModulePackage` and seals it (the content hash is stamped
// here). Named `index.ts` so `npm run registry:generate`
// (scripts/generate-registry.mts) discovers and registers it -- previously
// `package.ts` during Stages 3-5, the same "draft not auto-registered until
// renamed at release" convention every other module in this project
// follows (context/modules/shaft-key-bolt-checks/stage-1-spec.md,
// stage-2-contract.md).

import { sealModulePackage, type ModulePackage } from "@/lib/engine";
import { manifest, ports } from "./manifest";
import { inputSchema } from "./input-schema";
import { compute } from "./compute";
import { uiSchema } from "./ui";
import { reportSchema } from "./report";
import { validation } from "./validation";

export const shaftKeyBoltChecksModule: ModulePackage = sealModulePackage({
  manifest,
  ports,
  inputSchema,
  compute,
  uiSchema,
  reportSchema,
  validation,
});

export default shaftKeyBoltChecksModule;
