// Author-provided input schema for the shaft-key-bolt-checks module. Every
// port is either genuinely required or carries a registry constant default
// (see ./manifest.ts) -- no cross-field consistency rule the generic port
// shape cannot already express, so this module reuses the generic
// `ModuleInputSchema` directly with no refinement, unlike e.g. coupling's
// own bore-range min/max check.

import type { ModuleInput } from "@/lib/engine";
import { ModuleInputSchema } from "@/lib/engine";
import type { z } from "zod";

export const inputSchema: z.ZodType<ModuleInput> = ModuleInputSchema;
