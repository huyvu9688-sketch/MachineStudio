// Acceptance checks for the drive-train module. `math.ts`'s kernel
// functions already hard-reject non-positive/negative input, so the checks
// below restate the acceptance criteria for the report rather than
// guarding an unreachable failure path — the same pattern every other
// module in this project already uses.
//
// No holding-brake-torque or gearbox backlash/transmission-error/life
// check exists: both are reported catalog values in 0.1.0, not evaluated
// (context/modules/drive-train/stage-1-spec.md items 7, 9).

import { makeQuantity, type CheckResult, type Quantity } from "@/lib/engine";

export type DriveTrainCase = "normal" | "peak";

export interface CaseCheckInput {
  readonly effectiveTorqueNm: number;
  readonly momentaryTorqueNm: number;
  readonly operatingSpeedRadPerS: number;
  readonly regenEnergyJ: number;
}

export interface ChecksInput {
  readonly motorRatedTorque: Quantity;
  readonly motorPeakTorque: Quantity;
  readonly motorRatedSpeed: Quantity;
  readonly rmsTorqueMargin: Quantity;
  readonly peakTorqueMargin: Quantity;
  readonly inertiaRatio: number;
  readonly inertiaRatioMaximum: Quantity;
  readonly regenAbsorptionCapacity: Quantity | undefined;
  readonly cases: Readonly<Record<DriveTrainCase, CaseCheckInput>>;
}

export function buildChecks(input: ChecksInput): CheckResult[] {
  const checks: CheckResult[] = [];

  const inertiaOk = input.inertiaRatio <= input.inertiaRatioMaximum.value;
  checks.push({
    id: "inertia-ratio",
    status: inertiaOk ? "pass" : "fail",
    message: inertiaOk
      ? "Load-to-rotor inertia ratio is within the required maximum."
      : "Load-to-rotor inertia ratio exceeds the required maximum.",
    criterion: "R_J <= R_Jmax",
    observed: makeQuantity(input.inertiaRatio, "ratio"),
    allowable: input.inertiaRatioMaximum,
    margin: makeQuantity(
      input.inertiaRatioMaximum.value - input.inertiaRatio,
      "ratio",
    ),
  });

  for (const loadCase of ["normal", "peak"] as const) {
    const c = input.cases[loadCase];

    const rmsAllowableNm =
      input.motorRatedTorque.value * input.rmsTorqueMargin.value;
    const rmsOk = c.effectiveTorqueNm <= rmsAllowableNm;
    checks.push({
      id: `rms-torque-${loadCase}`,
      status: rmsOk ? "pass" : "fail",
      message: rmsOk
        ? `Effective (RMS) torque is within the allowed fraction of rated torque for the ${loadCase} case.`
        : `Effective (RMS) torque exceeds the allowed fraction of rated torque for the ${loadCase} case.`,
      criterion: "Trms <= T_M * k_rms",
      observed: makeQuantity(c.effectiveTorqueNm, "N*m"),
      allowable: makeQuantity(rmsAllowableNm, "N*m"),
      margin: makeQuantity(rmsAllowableNm - c.effectiveTorqueNm, "N*m"),
    });

    const peakAllowableNm =
      input.motorPeakTorque.value * input.peakTorqueMargin.value;
    const peakOk = c.momentaryTorqueNm <= peakAllowableNm;
    checks.push({
      id: `peak-torque-${loadCase}`,
      status: peakOk ? "pass" : "fail",
      message: peakOk
        ? `Maximum momentary torque is within the allowed fraction of peak torque for the ${loadCase} case.`
        : `Maximum momentary torque exceeds the allowed fraction of peak torque for the ${loadCase} case.`,
      criterion: "T1 <= T_Mmax * k_peak",
      observed: makeQuantity(c.momentaryTorqueNm, "N*m"),
      allowable: makeQuantity(peakAllowableNm, "N*m"),
      margin: makeQuantity(peakAllowableNm - c.momentaryTorqueNm, "N*m"),
    });

    const speedOk = c.operatingSpeedRadPerS <= input.motorRatedSpeed.value;
    checks.push({
      id: `speed-${loadCase}`,
      status: speedOk ? "pass" : "fail",
      message: speedOk
        ? `Operating speed is within the motor's rated speed for the ${loadCase} case.`
        : `Operating speed exceeds the motor's rated speed for the ${loadCase} case.`,
      criterion: "N_op <= N_rated",
      observed: makeQuantity(c.operatingSpeedRadPerS, "rad/s"),
      allowable: input.motorRatedSpeed,
      margin: makeQuantity(
        input.motorRatedSpeed.value - c.operatingSpeedRadPerS,
        "rad/s",
      ),
    });

    if (input.regenAbsorptionCapacity === undefined) {
      checks.push({
        id: `regen-energy-${loadCase}`,
        status: "not_applicable",
        message: `No drive regenerative-energy absorption capacity supplied; not checked for the ${loadCase} case.`,
        criterion: "E_regen <= E_abs",
      });
    } else {
      const regenOk = c.regenEnergyJ <= input.regenAbsorptionCapacity.value;
      checks.push({
        id: `regen-energy-${loadCase}`,
        status: regenOk ? "pass" : "fail",
        message: regenOk
          ? `Regenerative energy released is within the drive's own absorption capacity for the ${loadCase} case.`
          : `Regenerative energy released exceeds the drive's own absorption capacity for the ${loadCase} case.`,
        criterion: "E_regen <= E_abs",
        observed: makeQuantity(c.regenEnergyJ, "J"),
        allowable: input.regenAbsorptionCapacity,
        margin: makeQuantity(
          input.regenAbsorptionCapacity.value - c.regenEnergyJ,
          "J",
        ),
      });
    }
  }

  return checks;
}
