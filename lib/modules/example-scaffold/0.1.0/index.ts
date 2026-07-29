// The example-scaffold module package. Assembles the manifest, ports, compute, UI,
// report, and validation record into a single ModulePackage and seals it (the
// content hash is stamped at this point). This is the only object the engine
// executes and reports on; it is registered via `npm run registry:generate`.

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

export const exampleScaffoldModule: ModulePackage = sealModulePackage({
  manifest,
  ports,
  inputSchema: ModuleInputSchema,
  compute,
  uiSchema,
  reportSchema,
  validation,
});

export default exampleScaffoldModule;
