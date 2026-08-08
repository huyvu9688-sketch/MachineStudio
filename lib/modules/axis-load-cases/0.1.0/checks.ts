// Acceptance checks for the axis-load-cases module. This module resolves
// loads rather than sizing a component, so its checks confirm the inputs sit
// within the Stage 1 validity envelope rather than an engineering safety
// factor (context/modules/axis-load-cases/stage-1-spec.md "Candidate Method
// and Supported Envelope").

import { makeQuantity, type CheckResult, type Quantity } from "@/lib/engine";

export interface ChecksInput {
  readonly inclineAngle: Quantity;
  readonly frictionCoefficient: number;
  readonly totalMovingMass: Quantity;
}

export function buildChecks(input: ChecksInput): CheckResult[] {
  const inclineOk =
    input.inclineAngle.value >= 0 && input.inclineAngle.value <= Math.PI / 2;
  const frictionOk =
    input.frictionCoefficient >= 0 && input.frictionCoefficient <= 1;
  const massOk = input.totalMovingMass.value > 0;

  return [
    {
      id: "incline-angle-envelope",
      status: inclineOk ? "pass" : "fail",
      message: inclineOk
        ? "Incline angle is within the supported horizontal-to-vertical envelope."
        : "Incline angle is outside the supported 0-90 degree envelope.",
      criterion: "0 <= beta <= 90 deg",
      observed: input.inclineAngle,
    },
    {
      id: "friction-coefficient-range",
      status: frictionOk ? "pass" : "fail",
      message: frictionOk
        ? "Friction coefficient is within the released [0, 1] range."
        : "Friction coefficient is outside the released [0, 1] range.",
      criterion: "0 <= mu <= 1",
      observed: makeQuantity(input.frictionCoefficient, "ratio"),
    },
    {
      id: "total-moving-mass-positive",
      status: massOk ? "pass" : "fail",
      message: massOk
        ? "Total moving mass is positive."
        : "Total moving mass must be positive.",
      criterion: "m_t > 0",
      observed: input.totalMovingMass,
    },
  ];
}
