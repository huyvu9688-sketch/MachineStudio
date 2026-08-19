// The rack-pinion-motor-sizing module package (Unit 6.4). Assembles the
// manifest, ports, compute, UI, report, and validation record into a
// single `ModulePackage` and seals it (the content hash is stamped
// here).
//
// 0.2.0: consistency-pass follow-on
// (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md)
// -- drops the `gravity` port (hardcoded 9.80665 m/s^2 in ./math.ts
// instead) and repoints `inertia_ratio_maximum` at the new recommended-
// maximum parameter (registry 1.15.0). 0.1.0 stays released, registered,
// and untouched.
//
// Named `index.ts` so `npm run registry:generate` discovers this
// package. Registered 2026-08-19 (lib/modules/registry.generated.ts,
// validation/rack-pinion-motor-sizing/0.2.0.md).
//
// No custom input-schema.ts: every input port in this module's own
// scope is either unconditionally required or has a registry-level
// constant default (gear_ratio, external_force) -- the generic
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
