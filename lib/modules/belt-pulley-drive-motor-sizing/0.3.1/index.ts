// The belt-pulley-drive-motor-sizing 0.3.0 package -- the consistency-pass
// follow-on to 0.2.0, and the last of the five Motor Sizing Tool
// module-version bumps
// (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md).
// Assembles the manifest, ports, compute, UI, report, and validation
// record into a single `ModulePackage` and seals it (the content hash is
// stamped here).
//
// 0.3.1: formula-correctness patch (momentary torque now considers the
// deceleration phase; effective/RMS torque now includes a dwell holding
// term) -- see manifest.ts and validation.ts.
//
// Named `index.ts` so `npm run registry:generate`
// (scripts/generate-registry.mts) discovers this package.
// validation/belt-pulley-drive-motor-sizing/0.3.1.md. 0.1.0, 0.2.0, and
// 0.3.0 stay released, registered, and untouched (their own index.ts files
// are unaffected by this one).

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
