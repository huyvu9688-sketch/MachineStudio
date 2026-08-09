// Acceptance checks for the coupling module. `math.ts`'s kernel functions
// already hard-reject non-positive capacity/speed/service-factor input, so
// the checks below restate the same acceptance criteria for the report
// rather than guarding an unreachable failure path — the same pattern every
// other module in this project already uses.

import { makeQuantity, type CheckResult, type Quantity } from "@/lib/engine";

export type CouplingCase = "normal" | "peak";

export interface CaseCheckInput {
  readonly torqueSafetyFactor: number;
  readonly speedSafetyFactor: number;
}

export interface ChecksInput {
  readonly drivingBoreMin: Quantity;
  readonly drivingBoreMax: Quantity;
  readonly drivenBoreMin: Quantity;
  readonly drivenBoreMax: Quantity;
  readonly drivingShaftDiameter: Quantity;
  readonly drivenShaftDiameter: Quantity;
  readonly allowableParallelMisalignment: Quantity;
  readonly allowableAngularMisalignment: Quantity;
  readonly allowableAxialMisalignment: Quantity;
  readonly actualParallelMisalignment: Quantity;
  readonly actualAngularMisalignment: Quantity;
  readonly actualAxialMisalignment: Quantity;
  readonly cases: Readonly<Record<CouplingCase, CaseCheckInput>>;
}

function boundCheck(
  id: string,
  label: string,
  actual: Quantity,
  allowable: Quantity,
): CheckResult {
  const ok = actual.value <= allowable.value;
  return {
    id,
    status: ok ? "pass" : "fail",
    message: ok
      ? `${label} is within the allowable limit.`
      : `${label} exceeds the allowable limit.`,
    criterion: "actual <= allowable",
    observed: actual,
    allowable,
    margin: makeQuantity(allowable.value - actual.value, allowable.unit),
  };
}

export function buildChecks(input: ChecksInput): CheckResult[] {
  const checks: CheckResult[] = [];

  for (const loadCase of ["normal", "peak"] as const) {
    const c = input.cases[loadCase];

    checks.push({
      id: `torque-safety-${loadCase}`,
      status: c.torqueSafetyFactor >= 1 ? "pass" : "fail",
      message:
        c.torqueSafetyFactor >= 1
          ? `Coupling torque capacity meets the required (service-factor-scaled) torque for the ${loadCase} case.`
          : `Coupling torque capacity is below the required (service-factor-scaled) torque for the ${loadCase} case.`,
      criterion: "fs_T >= 1",
      observed: makeQuantity(c.torqueSafetyFactor, "ratio"),
      allowable: makeQuantity(1, "ratio"),
      margin: makeQuantity(c.torqueSafetyFactor - 1, "ratio"),
    });

    checks.push({
      id: `speed-safety-${loadCase}`,
      status: c.speedSafetyFactor >= 1 ? "pass" : "fail",
      message:
        c.speedSafetyFactor >= 1
          ? `Operating speed is within the coupling's allowable speed for the ${loadCase} case.`
          : `Operating speed exceeds the coupling's allowable speed for the ${loadCase} case.`,
      criterion: "fs_n >= 1",
      observed: makeQuantity(c.speedSafetyFactor, "ratio"),
      allowable: makeQuantity(1, "ratio"),
      margin: makeQuantity(c.speedSafetyFactor - 1, "ratio"),
    });
  }

  checks.push(
    boundCheck(
      "misalignment-parallel",
      "Parallel misalignment",
      input.actualParallelMisalignment,
      input.allowableParallelMisalignment,
    ),
    boundCheck(
      "misalignment-angular",
      "Angular misalignment",
      input.actualAngularMisalignment,
      input.allowableAngularMisalignment,
    ),
    boundCheck(
      "misalignment-axial",
      "Axial misalignment",
      input.actualAxialMisalignment,
      input.allowableAxialMisalignment,
    ),
  );

  const drivingOk =
    input.drivingShaftDiameter.value >= input.drivingBoreMin.value &&
    input.drivingShaftDiameter.value <= input.drivingBoreMax.value;
  checks.push({
    id: "bore-compatibility-driving",
    status: drivingOk ? "pass" : "fail",
    message: drivingOk
      ? "Driving-side shaft diameter is within the coupling's catalog bore range."
      : "Driving-side shaft diameter is outside the coupling's catalog bore range.",
    criterion: "driving_bore_min <= driving_shaft_diameter <= driving_bore_max",
    observed: input.drivingShaftDiameter,
  });

  const drivenOk =
    input.drivenShaftDiameter.value >= input.drivenBoreMin.value &&
    input.drivenShaftDiameter.value <= input.drivenBoreMax.value;
  checks.push({
    id: "bore-compatibility-driven",
    status: drivenOk ? "pass" : "fail",
    message: drivenOk
      ? "Driven-side shaft diameter is within the coupling's catalog bore range."
      : "Driven-side shaft diameter is outside the coupling's catalog bore range.",
    criterion: "driven_bore_min <= driven_shaft_diameter <= driven_bore_max",
    observed: input.drivenShaftDiameter,
  });

  return checks;
}
