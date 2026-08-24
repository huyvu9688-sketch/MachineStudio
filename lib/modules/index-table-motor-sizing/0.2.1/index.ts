// The index-table-motor-sizing module package, 0.2.0 (the consistency-pass
// follow-on to 0.1.0). Assembles the manifest, ports, compute, UI, report,
// and validation record into a single `ModulePackage` and seals it (the
// content hash is stamped here).
//
// 0.2.1: formula-correctness patch (resolveOperatingSpeed now rejects an
// infeasible motion profile where 2*acceleration_time > index_time) --
// see manifest.ts and validation.ts.
//
// Named `index.ts` so `npm run registry:generate`
// (scripts/generate-registry.mts) discovers this package.
// validation/index-table-motor-sizing/0.2.1.md. 0.1.0 and 0.2.0 stay
// released, registered, and untouched (their own index.ts files are
// unaffected by this one).
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
