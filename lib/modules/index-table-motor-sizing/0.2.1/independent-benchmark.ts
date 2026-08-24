// AutomationDirect's own general "Belt (or Gear) Reducer Equations"
// combined-inertia formula (us.automationdirect.sureservo_selection_
// appendix@2nd-ed-rev-b-08-2011, Table 1, p. B-6, `Jtotal = Jmotor +
// Jmotorpulley + ((Jloadpulley+JLoad)/i^2)`), reimplemented here as a
// genuinely separate, single-expression computation of this module's own
// full inertia-to-acceleration-torque chain -- the independent-benchmark
// comparison ./independent-benchmark.test.ts uses, the same "structurally
// separate reimplementation, proved identical" pattern every prior Motor
// Sizing Tool module's own independent benchmark already establishes.
// This module's own kernel (six separate functions in ./math.ts) is a
// real, independently authored implementation of the same underlying
// physics, not a call into this file.
//
// Test-only: not part of the module package itself (never imported by
// manifest/compute/trace/checks/ui/report/validation or index.ts).

export interface IndexTableAccelerationTorqueInput {
  /** Table mass, in kg. */
  readonly tableMassKg: number;
  /** Table diameter, in m. */
  readonly tableDiameterM: number;
  /** Combined mounted-load inertia, in kg*m^2. */
  readonly attachedLoadInertiaKgM2: number;
  /** Gear ratio between the table shaft and the motor shaft. */
  readonly gearRatio: number;
  /** Candidate motor rotor inertia, in kg*m^2. */
  readonly motorRotorInertiaKgM2: number;
  /** Angle rotated per index move, at the table shaft, in rad. */
  readonly indexAngleRad: number;
  /** Total move time for one index, in s. */
  readonly indexTimeS: number;
  /** Ramp (accel = decel) time within indexTimeS, in s. */
  readonly accelerationTimeS: number;
}

export interface IndexTableAccelerationTorqueResult {
  readonly totalSystemInertiaKgM2: number;
  readonly accelerationTorqueNm: number;
}

/**
 * `J_total = J_motor + (((1/8)*M_table*D^2 + J_load)/i^2)`;
 * `T_A = J_total * (((theta_index/(t_index-t_A))*i)/t_A)` -- one combined
 * expression, written independently of `./math.ts`'s own six-function
 * decomposition (`resolveTableInertia`, `resolveLoadInertia`,
 * `resolveReflectedLoadInertia`, `resolveTotalSystemInertia`,
 * `resolveOperatingSpeed`, `accelerationTorque`).
 */
export function resolveIndexTableAccelerationTorque(
  input: IndexTableAccelerationTorqueInput,
): IndexTableAccelerationTorqueResult {
  const tableInertiaKgM2 = (input.tableMassKg * input.tableDiameterM ** 2) / 8;
  const loadInertiaKgM2 = tableInertiaKgM2 + input.attachedLoadInertiaKgM2;
  const reflectedLoadInertiaKgM2 = loadInertiaKgM2 / input.gearRatio ** 2;
  const totalSystemInertiaKgM2 =
    input.motorRotorInertiaKgM2 + reflectedLoadInertiaKgM2;

  const tableOmegaRadPerS =
    input.indexAngleRad / (input.indexTimeS - input.accelerationTimeS);
  const motorOmegaRadPerS = tableOmegaRadPerS * input.gearRatio;
  const alphaRadPerS2 = motorOmegaRadPerS / input.accelerationTimeS;

  return {
    totalSystemInertiaKgM2,
    accelerationTorqueNm: totalSystemInertiaKgM2 * alphaRadPerS2,
  };
}
