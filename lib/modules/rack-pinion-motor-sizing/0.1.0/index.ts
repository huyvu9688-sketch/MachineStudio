// The rack-pinion-motor-sizing module package (Unit 6.4). Assembles the
// manifest, ports, compute, UI, report, and validation record into a
// single `ModulePackage` and seals it (the content hash is stamped
// here).
//
// Named `index.ts` (renamed from `package.ts`) so `npm run
// registry:generate` discovers this package. Released and registered
// 2026-08-13 (lib/modules/registry.generated.ts, validation/
// rack-pinion-motor-sizing/0.1.0.md) -- the third module in the Motor
// Sizing Tool family (ADR-0011), after ball-screw-motor-sizing@0.1.0 and
// direct-drive-conveyor-motor-sizing@0.1.0.
//
// No custom input-schema.ts: every input port in this module's own
// 0.1.0 scope is either unconditionally required or has a registry-level
// constant default (gravity, gear_ratio, external_force) -- the generic
// ModuleInputSchema already expresses that, the same "no author rule
// needed" case direct-drive-conveyor-motor-sizing@0.1.0's own index.ts
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

export const rackPinionMotorSizingModule: ModulePackage = sealModulePackage({
  manifest,
  ports,
  inputSchema: ModuleInputSchema,
  compute,
  uiSchema,
  reportSchema,
  validation,
});

export default rackPinionMotorSizingModule;
