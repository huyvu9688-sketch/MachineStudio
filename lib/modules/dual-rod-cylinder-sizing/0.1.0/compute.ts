// Pure, deterministic compute function for the dual-rod-cylinder-sizing module. Reads input
// magnitudes in their canonical units, computes outputs, and returns a
// structured computation (outputs, trace, checks, warnings, assumptions,
// validity). Performs no I/O and imports only the engine's public surface.

import {
  makeQuantity,
  type ModuleComputation,
  type ModuleInput,
  type Quantity,
} from "@/lib/engine";
import { buildTrace } from "./trace";
import { buildChecks } from "./checks";

export function compute(input: ModuleInput): ModuleComputation {
  const payloadMass = input.values.payload_mass;
  const mass = payloadMass?.kind === "quantity" ? payloadMass.value : 0;

  // TODO: implement the real method. This placeholder returns 0 N.
  const result: Quantity = makeQuantity(mass * 0, "N");

  return {
    outputs: { result },
    trace: buildTrace(payloadMass, result),
    checks: buildChecks(result),
    warnings: [],
    assumptions: [],
    validity: [],
  };
}
