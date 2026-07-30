// Pure compute for the example-relay fixture: the required thrust force is
// relayed unchanged. The SDK has already enforced that the declared input is
// present and expressed in the parameter's canonical unit before this runs, so
// the output is rebuilt from that magnitude in the same unit.

import {
  makeQuantity,
  type ModuleComputation,
  type ModuleInput,
  type Quantity,
} from "@/lib/engine";
import { buildTrace } from "./trace";
import { buildChecks } from "./checks";

export function compute(input: ModuleInput): ModuleComputation {
  const thrustForceIn = input.values.thrust_force_in;
  const magnitude =
    thrustForceIn?.kind === "quantity" ? thrustForceIn.value : 0;
  const thrustForceOut: Quantity = makeQuantity(magnitude, "N");

  return {
    outputs: { thrust_force_out: thrustForceOut },
    trace: buildTrace(thrustForceIn, thrustForceOut),
    checks: buildChecks(thrustForceIn, thrustForceOut),
    warnings: [],
    assumptions: [],
    validity: [],
  };
}
