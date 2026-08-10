// Shared helper for reading a role instance's resolved value at a canonical
// parameter ID — used by ./completion, ./checks, and ./comparison, which all
// need to map a parameterId back to a port key before they can read a value
// out of `WorkflowInstanceContext.inputValues`/`computation.outputs`.

import type {
  EngineeringValue,
  LoadCaseCategory,
  ParameterId,
} from "@/lib/engine";
import type { WorkflowInstanceContext } from "./types";

/**
 * Finds `instance`'s resolved value at `parameterId` (optionally scoped to
 * `loadCase`, matching only ports with the identical `loadCase`, including
 * `undefined`). Checks input ports first (`inputValues`), then output ports
 * (`computation.outputs`, `undefined` when not yet computed). Returns
 * `undefined` when the instance declares no such port or the value has not
 * been resolved yet.
 */
export function findValueForParameter(
  instance: WorkflowInstanceContext,
  parameterId: ParameterId,
  loadCase?: LoadCaseCategory,
): EngineeringValue | undefined {
  const inputPort = instance.ports.inputs.find(
    (p) => p.parameterId === parameterId && p.loadCase === loadCase,
  );
  if (inputPort !== undefined) {
    return instance.inputValues[inputPort.key];
  }

  const outputPort = instance.ports.outputs.find(
    (p) => p.parameterId === parameterId && p.loadCase === loadCase,
  );
  if (outputPort !== undefined) {
    return instance.computation?.outputs[outputPort.key];
  }

  return undefined;
}
