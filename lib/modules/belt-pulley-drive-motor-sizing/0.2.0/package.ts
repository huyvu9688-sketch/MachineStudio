// The belt-pulley-drive-motor-sizing 0.2.0 package draft. Assembles the
// manifest, ports, compute, UI, report, and validation record into a
// single `ModulePackage` and seals it. Named `package.ts`, not `index.ts`,
// so `npm run registry:generate` does not discover it yet -- Task 14
// renames it to `index.ts` at Stage 6 release, the same convention every
// prior module followed (see e.g. drive-train@0.1.0's own README.md
// "Stage 6").

import { sealModulePackage, type ModulePackage } from "@/lib/engine";
import { manifest, ports } from "./manifest";
import { inputSchema } from "./input-schema";
import { compute } from "./compute";
import { uiSchema } from "./ui";
import { reportSchema } from "./report";
import { validation } from "./validation";

export const beltPulleyDriveMotorSizingModule: ModulePackage =
  sealModulePackage({
    manifest,
    ports,
    inputSchema,
    compute,
    uiSchema,
    reportSchema,
    validation,
  });

export default beltPulleyDriveMotorSizingModule;
