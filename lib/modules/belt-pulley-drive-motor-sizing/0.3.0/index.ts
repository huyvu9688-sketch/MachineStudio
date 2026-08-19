// The belt-pulley-drive-motor-sizing 0.2.0 package (Stage 6 release).
// Assembles the manifest, ports, compute, UI, report, and validation
// record into a single `ModulePackage` and seals it (the content hash is
// stamped here).
//
// Named `index.ts` so `npm run registry:generate` discovers this package
// -- 0.1.0 stays registered, edited, and immutable exactly as released
// (CLAUDE.md); this is the first module-version bump in this project.

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
