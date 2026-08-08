// Author-provided input schema for the motion-profile module. Unlike
// axis-load-cases (exactly one mass route) this module has no cross-field
// rule the generic port shape cannot express, so the generic
// `ModuleInputSchema` is used directly.

import type { z } from "zod";
import { ModuleInputSchema, type ModuleInput } from "@/lib/engine";

export const inputSchema: z.ZodType<ModuleInput> = ModuleInputSchema;
