/**
 * Mass moment of inertia for standard rigid-body shapes, about the axis of
 * rotation.
 *
 * These are textbook rigid-body dynamics, not a manufacturer's own selection
 * method: no source disagrees on `J = (1/8)mD^2` for a solid cylinder the way
 * sources disagree on, say, a coupling service factor. They live in
 * `lib/engine` for exactly that reason — see
 * `context/adr/0011-motor-sizing-tool-architecture.md` "Reuse policy", which
 * makes generic, source-independent physics a shared engine package while
 * every mechanism-specific or method-dependent formula stays reproduced
 * inside its own immutable module version.
 *
 * Restated with the same symbols and constants in Oriental Motor Co., Ltd.,
 * *Motor Sizing Calculations*
 * (`jp.oriental_motor.motor_sizing_calculations@web-2026-08-08`, cached at
 * `reference/source-material/Oriental_Motor Sizing Calculators.pdf`, pp. 2-3,
 * "Moment of Inertia"). The citation records where this project read them,
 * not a claim that the formulas are that manufacturer's method.
 *
 * Contract: every argument and result is a bare number in the SI-coherent unit
 * named by its field suffix (`Kg`, `M`, `KgM2`, `KgPerM3`). This package sits
 * below the module-package boundary, where `EngineeringValue` conversion
 * happens (`context/code-standards.md` "Engineering Values and Units"), and is
 * called from module math kernels that already work in bare SI numbers — the
 * same convention every module's own `math.ts` uses.
 *
 * Only the rotation-axis (`Jx`) forms are implemented. The source also prints
 * transverse-axis (`Jy`) forms for the cylinder, hollow cylinder, and
 * rectangular pillar; no motor-sizing calculation uses them, and this project
 * does not build ahead of a consumer.
 */

import { MechanicsInputError } from "./errors";

function assertFinite(argument: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new MechanicsInputError(
      argument,
      `${argument} must be a finite number, received: ${value}`,
    );
  }
}

function assertPositive(argument: string, value: number): void {
  assertFinite(argument, value);
  if (value <= 0) {
    throw new MechanicsInputError(
      argument,
      `${argument} must be positive, received: ${value}`,
    );
  }
}

function assertNonNegative(argument: string, value: number): void {
  assertFinite(argument, value);
  if (value < 0) {
    throw new MechanicsInputError(
      argument,
      `${argument} must not be negative, received: ${value}`,
    );
  }
}

/** A mass moment of inertia about the axis of rotation, in kg*m^2. */
export interface InertiaResult {
  readonly inertiaKgM2: number;
}

export interface PointMassInertiaInput {
  /** Mass, in kg. Must be > 0. */
  readonly massKg: number;
  /**
   * Distance between the centre of gravity and the centre of rotation, in m.
   * Must be >= 0; zero means the mass sits on the axis.
   */
  readonly radiusM: number;
}

/**
 * A concentrated mass rotating at a radius: `J = m*L^2`.
 *
 * Source: *Motor Sizing Calculations*, p. 2 ("Moment of Inertia Calculation
 * for a Rotating Object").
 */
export function pointMassInertia(input: PointMassInertiaInput): InertiaResult {
  assertPositive("massKg", input.massKg);
  assertNonNegative("radiusM", input.radiusM);

  return { inertiaKgM2: input.massKg * input.radiusM ** 2 };
}

export interface SolidCylinderInertiaInput {
  /** Mass, in kg. Must be > 0. */
  readonly massKg: number;
  /** Outer diameter `D1`, in m. Must be > 0. */
  readonly outerDiameterM: number;
}

/**
 * A solid cylinder about its own axis: `Jx = (1/8)*m*D1^2` — the familiar
 * `(1/2)*m*r^2` in diameter form.
 *
 * Source: *Motor Sizing Calculations*, p. 2 ("Moment of Inertia Calculation
 * for a Cylinder").
 */
export function solidCylinderInertia(
  input: SolidCylinderInertiaInput,
): InertiaResult {
  assertPositive("massKg", input.massKg);
  assertPositive("outerDiameterM", input.outerDiameterM);

  return { inertiaKgM2: (input.massKg * input.outerDiameterM ** 2) / 8 };
}

export interface SolidCylinderInertiaFromDensityInput {
  /** Material density `rho`, in kg/m^3. Must be > 0. */
  readonly densityKgPerM3: number;
  /** Cylinder length `L`, in m. Must be > 0. */
  readonly lengthM: number;
  /** Outer diameter `D1`, in m. Must be > 0. */
  readonly outerDiameterM: number;
}

/**
 * A solid cylinder from its geometry and material density:
 * `Jx = (pi/32)*rho*L*D1^4`.
 *
 * Algebraically identical to {@link solidCylinderInertia} applied to the
 * cylinder's own mass `m = rho*(pi*D1^2/4)*L` — asserted directly in
 * `inertia.test.ts`, not assumed. Offered because a shaft or pulley is
 * usually known by geometry and material, not by weighed mass.
 *
 * Source: *Motor Sizing Calculations*, p. 2 ("Moment of Inertia Calculation
 * for a Cylinder").
 */
export function solidCylinderInertiaFromDensity(
  input: SolidCylinderInertiaFromDensityInput,
): InertiaResult {
  assertPositive("densityKgPerM3", input.densityKgPerM3);
  assertPositive("lengthM", input.lengthM);
  assertPositive("outerDiameterM", input.outerDiameterM);

  return {
    inertiaKgM2:
      (Math.PI / 32) *
      input.densityKgPerM3 *
      input.lengthM *
      input.outerDiameterM ** 4,
  };
}

export interface HollowCylinderInertiaInput {
  /** Mass, in kg. Must be > 0. */
  readonly massKg: number;
  /** Outer diameter `D1`, in m. Must be > 0. */
  readonly outerDiameterM: number;
  /**
   * Inner (bore) diameter `D2`, in m. Must be >= 0 and strictly less than
   * `outerDiameterM`; zero is the degenerate solid case.
   */
  readonly innerDiameterM: number;
}

function assertBore(outerDiameterM: number, innerDiameterM: number): void {
  assertPositive("outerDiameterM", outerDiameterM);
  assertNonNegative("innerDiameterM", innerDiameterM);
  if (innerDiameterM >= outerDiameterM) {
    throw new MechanicsInputError(
      "innerDiameterM",
      `innerDiameterM (${innerDiameterM}) must be smaller than outerDiameterM (${outerDiameterM}).`,
    );
  }
}

/**
 * A hollow cylinder (tube) about its own axis:
 * `Jx = (1/8)*m*(D1^2 + D2^2)`.
 *
 * For a given mass this is always larger than the solid cylinder of the same
 * outer diameter — the same mass sits further from the axis.
 *
 * Source: *Motor Sizing Calculations*, p. 2 ("Moment of Inertia Calculation
 * for a Hollow Cylinder").
 */
export function hollowCylinderInertia(
  input: HollowCylinderInertiaInput,
): InertiaResult {
  assertPositive("massKg", input.massKg);
  assertBore(input.outerDiameterM, input.innerDiameterM);

  return {
    inertiaKgM2:
      (input.massKg * (input.outerDiameterM ** 2 + input.innerDiameterM ** 2)) /
      8,
  };
}

export interface HollowCylinderInertiaFromDensityInput {
  /** Material density `rho`, in kg/m^3. Must be > 0. */
  readonly densityKgPerM3: number;
  /** Cylinder length `L`, in m. Must be > 0. */
  readonly lengthM: number;
  /** Outer diameter `D1`, in m. Must be > 0. */
  readonly outerDiameterM: number;
  /** Inner (bore) diameter `D2`, in m. Must be >= 0 and < `outerDiameterM`. */
  readonly innerDiameterM: number;
}

/**
 * A hollow cylinder from its geometry and material density:
 * `Jx = (pi/32)*rho*L*(D1^4 - D2^4)`.
 *
 * Algebraically identical to {@link hollowCylinderInertia} applied to the
 * tube's own mass `m = rho*(pi*(D1^2 - D2^2)/4)*L` — asserted directly in
 * `inertia.test.ts`.
 *
 * Source: *Motor Sizing Calculations*, p. 2 ("Moment of Inertia Calculation
 * for a Hollow Cylinder").
 */
export function hollowCylinderInertiaFromDensity(
  input: HollowCylinderInertiaFromDensityInput,
): InertiaResult {
  assertPositive("densityKgPerM3", input.densityKgPerM3);
  assertPositive("lengthM", input.lengthM);
  assertBore(input.outerDiameterM, input.innerDiameterM);

  return {
    inertiaKgM2:
      (Math.PI / 32) *
      input.densityKgPerM3 *
      input.lengthM *
      (input.outerDiameterM ** 4 - input.innerDiameterM ** 4),
  };
}

export interface RectangularPillarInertiaInput {
  /** Mass, in kg. Must be > 0. */
  readonly massKg: number;
  /** First cross-section width `A`, in m. Must be > 0. */
  readonly widthAM: number;
  /** Second cross-section width `B`, in m. Must be > 0. */
  readonly widthBM: number;
}

/**
 * A rectangular pillar about the axis through its centre of gravity, normal to
 * the `A`x`B` cross-section: `Jx = (1/12)*m*(A^2 + B^2)`.
 *
 * The third dimension `C` does not appear: it is parallel to the rotation
 * axis, so it contributes only through the mass.
 *
 * Source: *Motor Sizing Calculations*, p. 2 ("Moment of Inertia Calculation
 * for a Rectangular Pillar").
 */
export function rectangularPillarInertia(
  input: RectangularPillarInertiaInput,
): InertiaResult {
  assertPositive("massKg", input.massKg);
  assertPositive("widthAM", input.widthAM);
  assertPositive("widthBM", input.widthBM);

  return {
    inertiaKgM2:
      (input.massKg * (input.widthAM ** 2 + input.widthBM ** 2)) / 12,
  };
}

export interface OffsetAxisInertiaInput {
  /**
   * The body's own inertia `Jx0` about the parallel axis through its centre of
   * gravity, in kg*m^2. Must be >= 0.
   */
  readonly centroidalInertiaKgM2: number;
  /** Mass, in kg. Must be > 0. */
  readonly massKg: number;
  /** Distance `l` between the two parallel axes, in m. Must be >= 0. */
  readonly offsetM: number;
}

/**
 * The parallel-axis (Huygens-Steiner) transfer: `Jx = Jx0 + m*l^2`.
 *
 * Composes with any centroidal form in this package — applying it to
 * {@link rectangularPillarInertia} reproduces the source's own printed
 * composed result `(1/12)*m*(A^2 + B^2 + 12*l^2)`, asserted in
 * `inertia.test.ts`.
 *
 * Source: *Motor Sizing Calculations*, p. 2 ("Moment of Inertia Calculation
 * for an Off-Center Axis").
 */
export function offsetAxisInertia(
  input: OffsetAxisInertiaInput,
): InertiaResult {
  assertNonNegative("centroidalInertiaKgM2", input.centroidalInertiaKgM2);
  assertPositive("massKg", input.massKg);
  assertNonNegative("offsetM", input.offsetM);

  return {
    inertiaKgM2:
      input.centroidalInertiaKgM2 + input.massKg * input.offsetM ** 2,
  };
}

export interface LinearMotionInertiaInput {
  /** Mass in linear motion, in kg. Must be > 0. */
  readonly massKg: number;
  /**
   * The mechanism's own travel per revolution of the rotating shaft `A`, in m
   * — a ball screw's lead, or `pi*D` for a pulley or pinion of pitch diameter
   * `D`. Must be > 0.
   */
  readonly travelPerRevolutionM: number;
}

/**
 * A linearly moving mass converted to an equivalent inertia at the rotating
 * shaft: `J = m*(A/(2*pi))^2`, where `A` is the shaft's own travel per
 * revolution.
 *
 * Deriving `A` from a mechanism's geometry is the mechanism's own business,
 * not this package's: a ball screw's `A` is its lead, a pulley's or pinion's
 * is `pi*D`, and a gear stage changes it again. Those conversions stay inside
 * each mechanism module (ADR-0011 "Reuse policy"); this function takes the
 * already-resolved travel per revolution.
 *
 * Source: *Motor Sizing Calculations*, pp. 2-3 ("Moment of Inertia
 * Calculation for an Object in Linear Motion", `J = m*(A/(2*pi))^2`, `A`:
 * unit of movement).
 */
export function linearMotionInertia(
  input: LinearMotionInertiaInput,
): InertiaResult {
  assertPositive("massKg", input.massKg);
  assertPositive("travelPerRevolutionM", input.travelPerRevolutionM);

  return {
    inertiaKgM2:
      input.massKg * (input.travelPerRevolutionM / (2 * Math.PI)) ** 2,
  };
}
