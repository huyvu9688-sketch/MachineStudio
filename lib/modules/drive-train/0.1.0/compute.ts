// Pure, deterministic compute function for the drive-train module (v0.1.0
// draft, Stage 3). Resolves the `normal` and `peak` load cases only,
// matching every other Milestone 4 module's own scope (see ./manifest.ts).
// Reads input magnitudes in their canonical units, delegates the physics to
// the pure kernel in ./math, and returns a structured computation. Performs
// no I/O and imports only the engine's public surface and this module's own
// files.

import { makeQuantity } from "@/lib/engine";
import type { ModuleComputation, ModuleInput, Quantity } from "@/lib/engine";
import {
  resolveAccelerationTorque,
  resolveEffectiveTorque,
  resolveGearboxDeratedLoadTorque,
  resolveInertiaRatio,
  resolveMomentaryTorque,
  resolveOperatingSpeed,
  resolveRegenEnergy,
  resolveTotalSystemInertia,
} from "./math";
import { buildChecks, type DriveTrainCase } from "./checks";
import { buildTrace, type TraceCaseInput } from "./trace";
import { quantityAt } from "./values";

const CASES: readonly DriveTrainCase[] = ["normal", "peak"];

export function compute(input: ModuleInput): ModuleComputation {
  const values = input.values;

  const lead = quantityAt(values, "lead");
  const gearRatio = quantityAt(values, "gear_ratio");
  const gearboxEfficiency = quantityAt(values, "gearbox_efficiency");
  const motorRatedTorque = quantityAt(values, "motor_rated_torque");
  const motorPeakTorque = quantityAt(values, "motor_peak_torque");
  const motorRatedSpeed = quantityAt(values, "motor_rated_speed");
  const motorRotorInertia = quantityAt(values, "motor_rotor_inertia");
  const reflectedLoadInertia = quantityAt(values, "reflected_load_inertia");
  const rmsTorqueMargin = quantityAt(values, "rms_torque_margin");
  const peakTorqueMargin = quantityAt(values, "peak_torque_margin");
  const inertiaRatioMaximum = quantityAt(values, "inertia_ratio_maximum");
  const regenAbsorptionCapacity = quantityAt(
    values,
    "regen_absorption_capacity",
  );
  const brakeRatedTorque = quantityAt(values, "brake_rated_torque");
  const peakAcceleration = quantityAt(values, "peak_acceleration");
  const peakDeceleration = quantityAt(values, "peak_deceleration");
  const rmsAcceleration = quantityAt(values, "rms_acceleration");

  if (
    lead === undefined ||
    gearRatio === undefined ||
    motorRatedTorque === undefined ||
    motorPeakTorque === undefined ||
    motorRatedSpeed === undefined ||
    motorRotorInertia === undefined ||
    reflectedLoadInertia === undefined ||
    rmsTorqueMargin === undefined ||
    peakTorqueMargin === undefined ||
    inertiaRatioMaximum === undefined ||
    peakAcceleration === undefined ||
    peakDeceleration === undefined ||
    rmsAcceleration === undefined
  ) {
    throw new Error(
      "drive-train requires its full set of motor, drivetrain, and motion-profile inputs.",
    );
  }

  const isGeared = gearRatio.value !== 1;
  if (isGeared && gearboxEfficiency === undefined) {
    // input-schema.ts already rejects this combination before compute() is
    // ever called; this is a defense-in-depth guard, not the primary check.
    throw new Error(
      "drive-train requires gearbox_efficiency when gear_ratio is not 1.",
    );
  }
  const effectiveGearboxEfficiency = isGeared ? gearboxEfficiency!.value : 1;

  const { totalSystemInertiaKgM2 } = resolveTotalSystemInertia({
    motorRotorInertiaKgM2: motorRotorInertia.value,
    reflectedLoadInertiaKgM2: reflectedLoadInertia.value,
  });

  const { inertiaRatio } = resolveInertiaRatio({
    reflectedLoadInertiaKgM2: reflectedLoadInertia.value,
    motorRotorInertiaKgM2: motorRotorInertia.value,
  });

  const { accelerationTorqueNm } = resolveAccelerationTorque({
    totalSystemInertiaKgM2,
    peakAccelerationMps2: peakAcceleration.value,
    peakDecelerationMps2: peakDeceleration.value,
    leadM: lead.value,
    gearRatio: gearRatio.value,
  });

  const cases = {} as Record<DriveTrainCase, TraceCaseInput>;
  for (const loadCase of CASES) {
    const driveTorque = quantityAt(values, `${loadCase}_drive_torque`);
    const linearVelocity = quantityAt(values, `${loadCase}_linear_velocity`);
    if (driveTorque === undefined || linearVelocity === undefined) {
      throw new Error(
        `drive-train requires drive torque and linear velocity for the "${loadCase}" case.`,
      );
    }

    const { rotationalSpeedRadPerS: operatingSpeedRadPerS } =
      resolveOperatingSpeed({
        linearVelocityMps: linearVelocity.value,
        leadM: lead.value,
        gearRatio: gearRatio.value,
      });

    const { loadTorqueNm } = resolveGearboxDeratedLoadTorque({
      driveTorqueNm: driveTorque.value,
      gearboxEfficiency: effectiveGearboxEfficiency,
    });

    const { momentaryTorqueNm } = resolveMomentaryTorque({
      accelerationTorqueNm,
      loadTorqueNm,
    });

    const { effectiveTorqueNm } = resolveEffectiveTorque({
      totalSystemInertiaKgM2,
      rmsAccelerationMps2: rmsAcceleration.value,
      leadM: lead.value,
      gearRatio: gearRatio.value,
      loadTorqueNm,
    });

    const { regenEnergyJ } = resolveRegenEnergy({
      totalSystemInertiaKgM2,
      linearVelocityMps: linearVelocity.value,
      leadM: lead.value,
      gearRatio: gearRatio.value,
    });

    cases[loadCase] = {
      driveTorque,
      linearVelocity,
      loadTorqueNm,
      operatingSpeedRadPerS,
      momentaryTorqueNm,
      effectiveTorqueNm,
      regenEnergyJ,
    };
  }

  const outputs: Record<string, Quantity> = {
    total_system_inertia: makeQuantity(totalSystemInertiaKgM2, "kg*m^2"),
    inertia_ratio: makeQuantity(inertiaRatio, "ratio"),
    acceleration_torque: makeQuantity(accelerationTorqueNm, "N*m"),
  };
  for (const loadCase of CASES) {
    const c = cases[loadCase];
    outputs[`${loadCase}_operating_speed`] = makeQuantity(
      c.operatingSpeedRadPerS,
      "rad/s",
    );
    outputs[`${loadCase}_momentary_torque`] = makeQuantity(
      c.momentaryTorqueNm,
      "N*m",
    );
    outputs[`${loadCase}_effective_torque`] = makeQuantity(
      c.effectiveTorqueNm,
      "N*m",
    );
    outputs[`${loadCase}_regen_energy_released`] = makeQuantity(
      c.regenEnergyJ,
      "J",
    );
  }

  return {
    outputs,
    trace: buildTrace({
      lead,
      gearRatio,
      gearboxEfficiency,
      motorRatedTorque,
      motorPeakTorque,
      motorRatedSpeed,
      motorRotorInertia,
      reflectedLoadInertia,
      totalSystemInertiaKgM2,
      inertiaRatio,
      inertiaRatioMaximum,
      rmsTorqueMargin,
      peakTorqueMargin,
      regenAbsorptionCapacity,
      brakeRatedTorque,
      peakAcceleration,
      peakDeceleration,
      rmsAcceleration,
      accelerationTorqueNm,
      cases,
    }),
    checks: buildChecks({
      motorRatedTorque,
      motorPeakTorque,
      motorRatedSpeed,
      rmsTorqueMargin,
      peakTorqueMargin,
      inertiaRatio,
      inertiaRatioMaximum,
      regenAbsorptionCapacity,
      cases: {
        normal: {
          effectiveTorqueNm: cases.normal.effectiveTorqueNm,
          momentaryTorqueNm: cases.normal.momentaryTorqueNm,
          operatingSpeedRadPerS: cases.normal.operatingSpeedRadPerS,
          regenEnergyJ: cases.normal.regenEnergyJ,
        },
        peak: {
          effectiveTorqueNm: cases.peak.effectiveTorqueNm,
          momentaryTorqueNm: cases.peak.momentaryTorqueNm,
          operatingSpeedRadPerS: cases.peak.operatingSpeedRadPerS,
          regenEnergyJ: cases.peak.regenEnergyJ,
        },
      },
    }),
    warnings: [],
    assumptions: [
      {
        id: "scope-normal-peak-only",
        statement:
          "This module version (0.1.0) resolves only the normal and peak load cases, matching every other Milestone 4 module's own scope.",
      },
      {
        id: "closed-cycle-rms-assumption",
        statement:
          "The effective (RMS) torque formula relies on a closed-cycle assumption: motion.profile.rms_acceleration is sufficient only when total system inertia and the per-case load torque both stay constant across a cycle that returns to its starting velocity — this project's own derivation, not yet verified against a synthetic per-phase torque profile (context/modules/drive-train/stage-2-contract.md 'Decisions' item 4).",
      },
      {
        id: "regen-100-percent-efficient",
        statement:
          "Regenerative energy assumes 100% of the released kinetic energy reaches the drive's own absorption path and that the case's own deceleration phase brings the axis to rest — no drive-electronics efficiency loss or DC-bus capacitor-absorption credit is modeled (stage-2-contract.md 'Decisions' item 6).",
      },
      {
        id: "gearbox-efficiency-not-registry-default",
        statement: isGeared
          ? "screw.gear_ratio != 1: drive.gearbox_efficiency was engineer-supplied and applied as an additional derating on top of screw.drive_torque."
          : "screw.gear_ratio = 1: no gearbox is declared, so no gearbox-efficiency derating is applied (eta_g treated as 1 in code, not a registry default).",
      },
      {
        id: "current-sizing-out-of-scope",
        statement:
          "Drive/amplifier current and voltage compatibility are out of scope entirely in 0.1.0 — this project's unit registry has no electrical-current dimension yet.",
      },
    ],
    validity: [],
  };
}
