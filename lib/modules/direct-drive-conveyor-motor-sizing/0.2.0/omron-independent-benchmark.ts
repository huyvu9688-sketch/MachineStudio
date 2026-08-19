// Omron Corporation's own general conveyor inertia formula
// (jp.omron.servo_motor_selection_guide@csm-tg-e-3-1, Servo Selection.pdf
// p. 8, "Inertia when Carrying Object via Conveyor Belt"), reimplemented
// here as a genuinely separate, mm-based computation -- a structurally
// independent second-manufacturer source stating the identical formula
// shape this module's own kernel implements (stage-1-spec.md "Candidate
// Methods" item 1) -- the independent-benchmark comparison
// ./omron-independent-benchmark.test.ts uses.
//
// Test-only: not part of the module package itself (never imported by
// manifest/compute/trace/checks/ui/report/validation or package.ts).

export interface OmronConveyorInertiaInput {
  /** Drive-roller mass, in kg (M1). */
  readonly driveRollerMassKg: number;
  /** Drive-roller diameter, in mm (D1). */
  readonly driveRollerDiameterMm: number;
  /** Idler-roller mass, in kg (M2). */
  readonly idlerRollerMassKg: number;
  /** Idler-roller diameter, in mm (D2). */
  readonly idlerRollerDiameterMm: number;
  /** Carried-load mass, in kg (M3). */
  readonly carriedLoadMassKg: number;
  /** Belt mass, in kg (M4). */
  readonly beltMassKg: number;
}

export interface OmronConveyorInertiaResult {
  readonly totalInertiaKgM2: number;
}

/**
 * `JW = J1+J2+J3+J4 = ( M1*D1^2/8 + M2*D2^2/8*(D1/D2)^2 + M3*D1^2/4 +
 * M4*D1^2/4 ) * 1e-6` -- Omron's own combined formula, `D` in mm (the
 * `1e-6` factor converts `mm^2` to `m^2`). Includes the drive roller's own
 * inertia (`J1`) directly, unlike this module's own `reflected_load_
 * inertia` port, which excludes it (`stage-2-contract.md` "Method
 * Sources": a naming-consistency split, not a physics difference) -- so
 * the test-only comparison this function feeds is against this module's
 * own `drive_roller_inertia + reflected_load_inertia` sum (its full
 * on-shaft inertia, excluding only the motor's own rotor), not against
 * `reflected_load_inertia` alone.
 */
export function resolveOmronConveyorInertia(
  input: OmronConveyorInertiaInput,
): OmronConveyorInertiaResult {
  const j1 = (input.driveRollerMassKg * input.driveRollerDiameterMm ** 2) / 8;
  const j2 =
    ((input.idlerRollerMassKg * input.idlerRollerDiameterMm ** 2) / 8) *
    (input.driveRollerDiameterMm / input.idlerRollerDiameterMm) ** 2;
  const j3 = (input.carriedLoadMassKg * input.driveRollerDiameterMm ** 2) / 4;
  const j4 = (input.beltMassKg * input.driveRollerDiameterMm ** 2) / 4;

  return { totalInertiaKgM2: (j1 + j2 + j3 + j4) * 1e-6 };
}
