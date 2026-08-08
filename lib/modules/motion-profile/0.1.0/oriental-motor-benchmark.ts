/**
 * Independent-benchmark reproduction of Oriental Motor's general
 * trapezoidal/triangular positioning-time method — Oriental Motor, *General
 * Catalog 2015/2016*, p. H-23, "Selecting Electric Linear Slides and
 * Cylinders (Using formula calculations)" / "Calculate the Positioning
 * Time". Page-verified 2026-08-07 (context/modules/motion-profile/
 * stage-1-spec.md "Evidence Gaps").
 *
 * The catalog's method is more general than `resolveTrapezoidalMove`
 * (lib/modules/motion-profile/0.1.0/math.ts): it allows independent
 * acceleration/deceleration rates (`a1`/`a2`) and a non-zero
 * starting/ending speed `Vs` (the low speed a stepper/servo indexer ramps
 * from and back down to, rather than a full stop). `resolveTrapezoidalMove`
 * is deliberately narrower (v0.1.0 scope: `a1 = a2`, `Vs = 0`). This module
 * exists only to reproduce the catalog's general method as an independent
 * check against that narrower kernel, per context/code-standards.md "Module
 * Testing" ("Independent benchmark comparison") — it is not a module
 * package, ships no registered behavior, and is not more general-purpose
 * than the one benchmark test that uses it.
 *
 * The catalog states its formulas in mixed mm/(m/s^2)/ms units with
 * explicit x10^3 conversion factors; this reproduction works entirely in SI
 * base units (meters, seconds) instead, since that is what `math.ts` and
 * the rest of the engine use — the underlying physics is unchanged.
 *
 * Source formulas (p. H-23, SI-converted):
 *   VRmax = sqrt( 2*a1*a2*L / (a1+a2) + Vs^2 )
 *   VRmax <= VR -> triangular drive; VRmax > VR -> trapezoidal drive
 *   Triangular:  T = T1 + T2 = (VRmax-Vs)/a1 + (VRmax-Vs)/a2
 *   Trapezoidal: T = T1 + T2 + T3
 *              = (VR-Vs)/a1 + (VR-Vs)/a2
 *                + [ L/VR - (a1+a2)*(VR^2-Vs^2) / (2*a1*a2*VR) ]
 */

export type OrientalMotorProfileType = "trapezoidal" | "triangular";

export interface OrientalMotorPositioningInput {
  /** Positioning distance L, in meters. Must be > 0. */
  readonly moveDistanceM: number;
  /** Operating (cruise) speed VR, in m/s. Must be > 0. */
  readonly operatingVelocityMps: number;
  /** Starting/ending speed Vs, in m/s. Must be >= 0 and < operatingVelocityMps. */
  readonly startingVelocityMps: number;
  /** Acceleration rate a1, in m/s^2. Must be > 0. */
  readonly accelerationMps2: number;
  /** Deceleration rate a2, in m/s^2. Must be > 0. */
  readonly decelerationMps2: number;
}

export interface OrientalMotorPositioningResult {
  readonly profileType: OrientalMotorProfileType;
  /** Resolved peak speed, in m/s: VR (trapezoidal) or VRmax (triangular). */
  readonly peakVelocityMps: number;
  /** Total positioning time T, in seconds. */
  readonly positioningTimeS: number;
}

/** Thrown when an input falls outside this reproduction's validity envelope. */
export class OrientalMotorBenchmarkInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrientalMotorBenchmarkInputError";
  }
}

function fail(message: string): never {
  throw new OrientalMotorBenchmarkInputError(message);
}

/**
 * Resolves the positioning time T and peak speed for the catalog's general
 * asymmetric, non-zero-starting-speed trapezoidal/triangular method.
 */
export function resolveOrientalMotorPositioningTime(
  input: OrientalMotorPositioningInput,
): OrientalMotorPositioningResult {
  const {
    moveDistanceM: L,
    operatingVelocityMps: VR,
    startingVelocityMps: Vs,
    accelerationMps2: a1,
    decelerationMps2: a2,
  } = input;

  if (!Number.isFinite(L) || L <= 0) fail("moveDistanceM must be positive.");
  if (!Number.isFinite(VR) || VR <= 0)
    fail("operatingVelocityMps must be positive.");
  if (!Number.isFinite(a1) || a1 <= 0)
    fail("accelerationMps2 must be positive.");
  if (!Number.isFinite(a2) || a2 <= 0)
    fail("decelerationMps2 must be positive.");
  if (!Number.isFinite(Vs) || Vs < 0)
    fail("startingVelocityMps must be non-negative.");
  if (Vs >= VR)
    fail("startingVelocityMps must be less than operatingVelocityMps.");

  const peakVelocityAtLimitMps = Math.sqrt(
    (2 * a1 * a2 * L) / (a1 + a2) + Vs * Vs,
  );

  if (peakVelocityAtLimitMps <= VR) {
    const positioningTimeS =
      (peakVelocityAtLimitMps - Vs) / a1 + (peakVelocityAtLimitMps - Vs) / a2;
    return {
      profileType: "triangular",
      peakVelocityMps: peakVelocityAtLimitMps,
      positioningTimeS,
    };
  }

  const t1 = (VR - Vs) / a1;
  const t2 = (VR - Vs) / a2;
  const t3 = L / VR - ((a1 + a2) * (VR * VR - Vs * Vs)) / (2 * a1 * a2 * VR);
  return {
    profileType: "trapezoidal",
    peakVelocityMps: VR,
    positioningTimeS: t1 + t2 + t3,
  };
}
