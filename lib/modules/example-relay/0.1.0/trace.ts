// Calculation trace for the example-relay fixture: one step recording that the
// input value was passed through unchanged. No source citations — there is no
// method to cite.

import {
  buildCalculationTrace,
  type CalculationTrace,
  type EngineeringValue,
} from "@/lib/engine";

export function buildTrace(
  thrustForceIn: EngineeringValue,
  thrustForceOut: EngineeringValue,
): CalculationTrace {
  return buildCalculationTrace([
    {
      node: "section",
      id: "relay",
      title: "Pass-through",
      children: [
        {
          node: "step",
          id: "relay-thrust-force",
          title: "Relay required thrust force",
          methodId: "fixture.identity",
          expression: "F_out = F_in",
          inputs: [
            {
              label: "F_in",
              value: thrustForceIn,
              ref: "motion.axis.thrust_force",
            },
          ],
          outputs: [{ label: "F_out", value: thrustForceOut }],
        },
      ],
    },
  ]);
}
