// The direct-drive-conveyor-motor-sizing module package (Unit 6.3).
// Assembles the manifest, ports, compute, UI, report, and validation
// record into a single `ModulePackage` and seals it (the content hash is
// stamped here).
//
// Named `index.ts` (renamed from `package.ts`) so `npm run
// registry:generate` (scripts/generate-registry.mts) discovers this
// package. Released and registered 2026-08-13
// (lib/modules/registry.generated.ts,
// validation/direct-drive-conveyor-motor-sizing/0.1.0.md) -- the second
// module in the Motor Sizing Tool family (ADR-0011), after
// ball-screw-motor-sizing@0.1.0.
//
// No custom input-schema.ts: unlike ball-screw-motor-sizing@0.1.0 (whose
// optional return-move ports need a co-requirement rule), every input
// port in this module's own 0.1.0 scope is either unconditionally
// required or has a registry-level constant default (gravity) -- the
// generic ModuleInputSchema already expresses that, the same "no author
// rule needed" case example-scaffold's own index.ts already establishes.

import {
  ModuleInputSchema,
  sealModulePackage,
  type ModulePackage,
} from "@/lib/engine";
import { manifest, ports } from "./manifest";
import { compute } from "./compute";
import { uiSchema } from "./ui";
import { reportSchema } from "./report";
import { validation } from "./validation";

export const directDriveConveyorMotorSizingModule: ModulePackage =
  sealModulePackage({
    manifest,
    ports,
    inputSchema: ModuleInputSchema,
    compute,
    uiSchema,
    reportSchema,
    validation,
  });

export default directDriveConveyorMotorSizingModule;
