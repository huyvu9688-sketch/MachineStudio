// Acceptance check for the example-relay fixture: the relayed value must equal
// the value that went in. This is the only claim the fixture makes, so it is
// the only thing it checks.

import {
  engineeringValuesEqual,
  type CheckResult,
  type EngineeringValue,
} from "@/lib/engine";

export function buildChecks(
  thrustForceIn: EngineeringValue,
  thrustForceOut: EngineeringValue,
): CheckResult[] {
  const relayed = engineeringValuesEqual(thrustForceIn, thrustForceOut);
  return [
    {
      id: "relay-preserves-value",
      status: relayed ? "pass" : "fail",
      message: relayed
        ? "Relayed value equals the input value."
        : "Relayed value differs from the input value.",
      criterion: "F_out == F_in",
      observed: thrustForceOut,
      allowable: thrustForceIn,
    },
  ];
}
