// The index-table-motor-sizing module package, 0.2.0 (the consistency-pass
// follow-on to 0.1.0). Assembles the manifest, ports, compute, UI, report,
// and validation record into a single `ModulePackage` and seals it (the
// content hash is stamped here).
//
// Named `index.ts` so `npm run registry:generate`
// (scripts/generate-registry.mts) discovers this package. Released and
// registered 2026-08-19 (lib/modules/registry.generated.ts,
// validation/index-table-motor-sizing/0.2.0.md). 0.1.0 stays released,
// registered, and untouched (its own index.ts is unaffected by this file).
//
// No custom input-schema.ts: every input port in this module's own 0.1.0
// scope is either unconditionally required or has a registry-level
// constant default (attached_load_inertia, gear_ratio, load_torque) --
// the generic ModuleInputSchema already expresses that, the same "no
// author rule needed" case every prior Motor Sizing Tool module's own
// index.ts already establishes.

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

export const indexTableMotorSizingModule: ModulePackage = sealModulePackage({
  manifest,
  ports,
  inputSchema: ModuleInputSchema,
  compute,
  uiSchema,
  reportSchema,
  validation,
});

export default indexTableMotorSizingModule;
