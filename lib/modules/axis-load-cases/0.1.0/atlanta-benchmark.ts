/**
 * Independent benchmark: a rack-and-pinion drive manufacturer's catalog
 * method for the required axial/tangential drive force of a moving mass
 * under acceleration, friction, and gravity — "Rack and Pinion Drive
 * Calculations and Selection," pp. C-53-C-55
 * (`reference/source-material/Atlanta_Rack and Pinion Drive Calculations
 * and Selection.pdf`). Reproduced here as a distinct implementation from
 * ./math.ts's `resolveAxisLoadPhase`, cross-checked against it in the
 * sibling test file — the "independent numerical benchmark (a method/tool
 * distinct from the primary THK method)" context/modules/axis-load-cases/
 * stage-1-spec.md "Validation Gate and Evidence Intake" requires.
 *
 * A rack-and-pinion drive is a different transmission mechanism than THK's
 * ball screw, but both published worked examples reduce to the same
 * underlying Newtonian/Coulomb-friction physics `resolveAxisLoadPhase`
 * implements:
 *  - horizontal, friction-resisted (p. C-54): `Fu = m*g*mu + m*a`
 *  - vertical, lifting/gravity-resisted (p. C-55): `Fu = m*g + m*a`
 * This validates that shared core, not ball-screw-specific mechanics (lead-
 * angle efficiency, preload friction torque) THK's method separately covers
 * and this benchmark does not attempt to reproduce.
 *
 * This source's licensing status is unresolved
 * (context/progress-tracker.md "Open decisions": "Licensing status of the
 * ID39/ID42 training PDFs and the Omron/ATLANTA reference material —
 * internal reference only until cleared"). It is therefore deliberately
 * NOT registered in `lib/standards` and not cited via a `ClauseReference`/
 * `SourceRevisionId` anywhere — this is an internal cross-check only, the
 * same "not a customer-facing citation" treatment `Book1.xlsx` and the
 * Oriental Motor RMS-torque blog post already receive elsewhere in this
 * project for their own reasons.
 */

export class AtlantaBenchmarkInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AtlantaBenchmarkInputError";
  }
}

function fail(message: string): never {
  throw new AtlantaBenchmarkInputError(message);
}

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value)) fail(`${name} must be finite.`);
  if (value <= 0) fail(`${name} must be positive.`);
}

/** Shared kinematic inputs both Atlanta worked examples derive acceleration from. */
interface AtlantaKinematicInput {
  /** Moving mass, in kg. Must be > 0. */
  readonly movingMassKg: number;
  /** Operating velocity reached at the end of the accel ramp, in m/s. Must be > 0. */
  readonly velocityMps: number;
  /** Acceleration (ramp) time to reach `velocityMps`, in s. Must be > 0. */
  readonly accelerationTimeS: number;
  /** Gravitational acceleration, in m/s^2. Must be > 0. */
  readonly gravityMps2: number;
}

export interface AtlantaHorizontalInput extends AtlantaKinematicInput {
  /** Scalar Coulomb friction coefficient. Must be in [0, 1]. */
  readonly frictionCoefficient: number;
}

export type AtlantaVerticalInput = AtlantaKinematicInput;

function accelerationOf(input: AtlantaKinematicInput): number {
  assertPositive("movingMassKg", input.movingMassKg);
  assertPositive("velocityMps", input.velocityMps);
  assertPositive("accelerationTimeS", input.accelerationTimeS);
  assertPositive("gravityMps2", input.gravityMps2);
  return input.velocityMps / input.accelerationTimeS;
}

/**
 * Horizontal, friction-resisted case (p. C-54): `Fu = m*g*mu + m*a`, where
 * `a = v / t_b` (velocity over the acceleration ramp time). Returns the
 * required drive force in newtons.
 */
export function resolveAtlantaHorizontalForce(
  input: AtlantaHorizontalInput,
): number {
  const accelerationMps2 = accelerationOf(input);
  if (!Number.isFinite(input.frictionCoefficient)) {
    fail("frictionCoefficient must be finite.");
  }
  if (input.frictionCoefficient < 0 || input.frictionCoefficient > 1) {
    fail("frictionCoefficient must be between 0 and 1.");
  }
  return (
    input.movingMassKg * input.gravityMps2 * input.frictionCoefficient +
    input.movingMassKg * accelerationMps2
  );
}

/**
 * Vertical, lifting (gravity-resisted) case (p. C-55): `Fu = m*g + m*a`,
 * where `a = v / t_b`. Returns the required drive force in newtons.
 */
export function resolveAtlantaVerticalForce(
  input: AtlantaVerticalInput,
): number {
  const accelerationMps2 = accelerationOf(input);
  return (
    input.movingMassKg * input.gravityMps2 +
    input.movingMassKg * accelerationMps2
  );
}
