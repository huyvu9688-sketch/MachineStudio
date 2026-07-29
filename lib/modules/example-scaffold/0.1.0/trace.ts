// Calculation trace for the example-scaffold module. The trace is the single
// report-renderable artifact; it embeds the actual input/output values and
// carries a stable step ID and method ID. Cite sources with a ClauseReference
// and declare their revisions on the manifest.

import {
  buildCalculationTrace,
  type CalculationTrace,
  type EngineeringValue,
} from "@/lib/engine";

export function buildTrace(
  payloadMass: EngineeringValue,
  result: EngineeringValue,
): CalculationTrace {
  return buildCalculationTrace([
    {
      node: "section",
      id: "result",
      title: "Result",
      children: [
        {
          node: "step",
          id: "compute-result",
          title: "Compute result", // TODO
          methodId: "TODO.method_id",
          // TODO: cite the method source: sources: [{ sourceRevisionId, clause }].
          inputs: [
            { label: "m", value: payloadMass, ref: "motion.axis.payload_mass" },
          ],
          outputs: [{ label: "result", value: result }],
        },
      ],
    },
  ]);
}
