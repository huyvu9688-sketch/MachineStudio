// Pure, deterministic compute function for the index-table-motor-sizing
// module (v0.1.0, Stage 3). Reads input magnitudes in their canonical
// units, delegates the physics to the pure kernel in ./math, and returns
// a structured computation. Performs no I/O and imports only the
// engine's public surface and this module's own files.

import {
  accelerationTorque,
  angularAccelerationFromSpeedRamp,
  makeQuantity,
  rotationalPower,
  type ModuleComputation,
  type ModuleInput,
  type Quantity,
} from "@/lib/engine";
import {
  resolveInertiaRatio,
  resolveLoadInertia,
  resolveMomentaryTorque,
  resolveOperatingSpeed,
  resolveReflectedLoadInertia,
  resolveRequiredTorque,
  resolveTableInertia,
  resolveTotalSystemInertia,
} from "./math";
import { buildChecks } from "./checks";
import { buildTrace } from "./trace";
import { quantityAt } from "./values";

export function compute(input: ModuleInput): ModuleComputation {
  const values = input.values;

  const tableMass = quantityAt(values, "table_mass");
  const tableDiameter = quantityAt(values, "table_diameter");
  const attachedLoadInertia = quantityAt(values, "attached_load_inertia");
  const gearRatio = quantityAt(values, "gear_ratio");
  const indexAngle = quantityAt(values, "index_angle");
  const indexTime = quantityAt(values, "index_time");
  const accelerationTime = quantityAt(values, "acceleration_time");
  const loadTorque = quantityAt(values, "load_torque");
  const motorRotorInertia = quantityAt(values, "motor_rotor_inertia");
  const requiredTorqueSafetyFactor = quantityAt(
    values,
    "required_torque_safety_factor",
  );
  const inertiaRatioMaximum = quantityAt(values, "inertia_ratio_maximum");

  if (
    tableMass === undefined ||
    tableDiameter === undefined ||
    indexAngle === undefined ||
    indexTime === undefined ||
    accelerationTime === undefined ||
    motorRotorInertia === undefined ||
    requiredTorqueSafetyFactor === undefined ||
    inertiaRatioMaximum === undefined
  ) {
    throw new Error(
      "index-table-motor-sizing requires its full set of geometry, motion, motor, and safety-factor inputs.",
    );
  }
  // attached_load_inertia defaults to 0 kg*m^2; gear_ratio defaults to 1;
  // load_torque defaults to 0 N*m -- all auto-filled by the module SDK
  // when absent, so none should reach compute() as undefined. Guarded
  // anyway as a defense-in-depth measure, the same treatment every other
  // Motor Sizing Tool module already gives its own constant-default ports.
  if (
    attachedLoadInertia === undefined ||
    gearRatio === undefined ||
    loadTorque === undefined
  ) {
    throw new Error(
      "index-table-motor-sizing requires attached_load_inertia, gear_ratio, and load_torque to resolve (the registry defaults should have filled these).",
    );
  }

  // --- Inertia -------------------------------------------------------------

  const { inertiaKgM2: tableInertiaKgM2 } = resolveTableInertia({
    tableMassKg: tableMass.value,
    tableDiameterM: tableDiameter.value,
  });
  const { loadInertiaKgM2 } = resolveLoadInertia({
    tableInertiaKgM2,
    attachedLoadInertiaKgM2: attachedLoadInertia.value,
  });
  const { reflectedLoadInertiaKgM2 } = resolveReflectedLoadInertia({
    loadInertiaKgM2,
    gearRatio: gearRatio.value,
  });
  const { totalSystemInertiaKgM2 } = resolveTotalSystemInertia({
    motorRotorInertiaKgM2: motorRotorInertia.value,
    reflectedLoadInertiaKgM2,
  });
  const { inertiaRatio } = resolveInertiaRatio({
    reflectedLoadInertiaKgM2,
    motorRotorInertiaKgM2: motorRotorInertia.value,
  });

  // --- Operating speed and acceleration torque ------------------------------

  const { operatingSpeedRadPerS } = resolveOperatingSpeed({
    indexAngleRad: indexAngle.value,
    indexTimeS: indexTime.value,
    accelerationTimeS: accelerationTime.value,
    gearRatio: gearRatio.value,
  });
  const { angularAccelerationRadPerS2 } = angularAccelerationFromSpeedRamp({
    angularVelocityChangeRadPerS: operatingSpeedRadPerS,
    rampTimeS: accelerationTime.value,
  });
  const { torqueNm: accelerationTorqueNm } = accelerationTorque({
    inertiaKgM2: totalSystemInertiaKgM2,
    angularAccelerationRadPerS2,
  });

  // --- Momentary and required torque, required power ------------------------

  const { momentaryTorqueNm } = resolveMomentaryTorque({
    accelerationTorqueNm,
    loadTorqueNm: loadTorque.value,
  });
  const { requiredTorqueNm } = resolveRequiredTorque({
    computedTorqueNm: momentaryTorqueNm,
    safetyFactor: requiredTorqueSafetyFactor.value,
  });

  const requiredTorque = makeQuantity(requiredTorqueNm, "N*m");
  const operatingSpeed = makeQuantity(operatingSpeedRadPerS, "rad/s");
  const requiredPower = rotationalPower(requiredTorque, operatingSpeed);

  const outputs: Record<string, Quantity> = {
    table_inertia: makeQuantity(tableInertiaKgM2, "kg*m^2"),
    load_inertia: makeQuantity(loadInertiaKgM2, "kg*m^2"),
    reflected_load_inertia: makeQuantity(reflectedLoadInertiaKgM2, "kg*m^2"),
    total_system_inertia: makeQuantity(totalSystemInertiaKgM2, "kg*m^2"),
    inertia_ratio: makeQuantity(inertiaRatio, "ratio"),
    acceleration_torque: makeQuantity(accelerationTorqueNm, "N*m"),
    momentary_torque: makeQuantity(momentaryTorqueNm, "N*m"),
    required_torque: requiredTorque,
    operating_speed: operatingSpeed,
    required_power: requiredPower,
  };

  return {
    outputs,
    trace: buildTrace({
      tableMass,
      tableDiameter,
      attachedLoadInertia,
      gearRatio,
      indexAngle,
      indexTime,
      accelerationTime,
      loadTorque,
      motorRotorInertia,
      requiredTorqueSafetyFactor,
      inertiaRatioMaximum,
      tableInertiaKgM2,
      loadInertiaKgM2,
      reflectedLoadInertiaKgM2,
      totalSystemInertiaKgM2,
      inertiaRatio,
      operatingSpeedRadPerS,
      accelerationTorqueNm,
      momentaryTorqueNm,
      requiredTorqueNm,
      requiredPowerW: requiredPower.value,
    }),
    checks: buildChecks({
      inertiaRatio,
      inertiaRatioMaximum: inertiaRatioMaximum.value,
    }),
    warnings: [],
    assumptions: [
      {
        id: "self-contained-reproduction",
        statement:
          "This module reproduces, rather than links to, Oriental Motor Co., Ltd.'s and AutomationDirect's own index-table sizing methods (ADR-0011 'Reuse policy') -- it has no calculation-level dependency on any other Motor Sizing Tool or Milestone-4 discipline module.",
      },
      {
        id: "table-treated-as-solid-cylinder",
        statement:
          "The table is treated as a rigid, disk-shaped solid cylinder about its own rotation axis. Any mounted workpieces/fixtures are one engineer-supplied combined inertia figure (attached_load_inertia), not modeled as discrete geometry inside this module (stage-2-contract.md 'Decisions' item 4).",
      },
      {
        id: "load-torque-not-computed",
        statement:
          "load_torque is a required, engineer-supplied input, not computed by this module -- both primary sources independently omit a load-torque formula for this mechanism, stating bearing/support friction is negligible (stage-1-spec.md 'The central finding'). It defaults to 0 N*m.",
      },
      {
        id: "single-index-event",
        statement:
          "One accelerate-decelerate-to-stop index move, covering index_angle in index_time from standstill back to standstill -- not a repeating duty cycle: no effective (RMS) torque is computed.",
      },
      {
        id: "no-catalog-matching",
        statement:
          "No candidate motor's own rated/peak torque is taken as an input in 0.1.0 (ADR-0011 'Output scope'). required_torque and required_power are reported required-spec values, not pass/fail checks -- the engineer takes them to a catalog.",
      },
    ],
    validity: [],
  };
}
