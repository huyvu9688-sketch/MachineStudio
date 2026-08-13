// The belt-pulley-drive-motor-sizing module package (Unit 6.5). Assembles
// the manifest, ports, compute, UI, report, and validation record into a
// single `ModulePackage` and seals it (the content hash is stamped here).
//
// Named `index.ts` so `npm run registry:generate` discovers this package
// -- the fourth module in the Motor Sizing Tool family (ADR-0011), after
// ball-screw-motor-sizing@0.1.0, direct-drive-conveyor-motor-sizing@0.1.0,
// and rack-pinion-motor-sizing@0.1.0.
//
// No custom input-schema.ts: every input port in this module's own 0.1.0
// scope is either unconditionally required or has a registry-level
// constant default (gravity, gear_ratio, belt_mass, external_force) -- the
// generic ModuleInputSchema already expresses that, the same "no author
// rule needed" case every prior Motor Sizing Tool module's own index.ts
// already establishes.

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

export const beltPulleyDriveMotorSizingModule: ModulePackage =
  sealModulePackage({
    manifest,
    ports,
    inputSchema: ModuleInputSchema,
    compute,
    uiSchema,
    reportSchema,
    validation,
  });

export default beltPulleyDriveMotorSizingModule;
