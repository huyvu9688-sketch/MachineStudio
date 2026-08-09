// PMI's own full worked numerical example (Linear Guideway catalog, Chapter 9,
// "Calculation Example", printed pages B28-B33), reproduced end to end as this
// module's Stage 4 reference evidence.
//
// This is the example every earlier stage deferred. Stage 1 declined to
// reproduce it because it "uses a bespoke two-mass, two-height geometry with
// its own No.1-No.4 carriage numbering, and this session could not confirm
// with confidence that its numbering/sign convention maps onto the generic
// Section 6 diagrams' P1-P4 convention" (see ./math.test.ts's own header).
// That mapping is now pinned — not by squinting at the illustration, but from
// the printed sign patterns, which are unambiguous. See CARRIAGE_MAP below.
//
// Reproducing it found two real defects in the kernel's lateral treatment,
// both now fixed and both described on ./math.ts's
// ResultantBlockLoadInput.yawMomentNm. This file is the evidence for that fix,
// so it deliberately computes the resolved force and moment from PMI's own
// given data by hand and feeds them through the module's actual integration
// path (resolveBlockLoadsFromResultant), rather than calling the
// installation-specific functions that merely restate PMI's printed formulas.
// Restating a formula proves nothing; reproducing twenty printed numbers
// through the code the module really runs does.
//
// It is a reproduction of a published example, not an independent benchmark.
// A genuinely independent second implementation (IKO's own method, the
// equivalent of lib/modules/ball-screw/0.1.0/thk-benchmark.ts) does not exist
// yet — see validation/linear-guide/0.1.0.md.

import {
  resolveBlockLoadsFromResultant,
  resolveEquivalentLoad,
  resolveMeanLoad,
  resolveNominalLife,
  resolveStaticSafetyFactor,
  type BlockLoad,
  type FourBlockLoads,
} from "./math";

/**
 * PMI's given operating conditions (printed page B28), model
 * `MSA35LA2SSFC + R2520-20/20 P II`.
 *
 * `l1` and `l2` are named here exactly as PMI names them, with this module's
 * reading of which is which stated explicitly: `l1` is the carriage spacing
 * along the direction of travel and `l2` the transverse rail spacing (see
 * ./math.ts's header for the evidence). Getting this pair backwards is the
 * mistake this file exists to have caught.
 */
export const PMI_EXAMPLE = {
  dynamicLoadRatingN: 63_600,
  staticLoadRatingN: 100_600,
  /** Upper mass (the workpiece/box), kg. */
  m1: 700,
  /** Lower mass (the table), kg. */
  m2: 450,
  velocityMps: 0.75,
  accelTimeS: 0.05,
  uniformTimeS: 1.9,
  decelTimeS: 0.15,
  /** Acceleration rate, m/s^2. PMI's own `a1`. */
  a1: 15,
  /** Deceleration rate, m/s^2. PMI's own `a3` — distinct from `a1`. */
  a3: 5,
  strokeM: 1.5,
  /** Carriage spacing along travel, m. PMI's `l1`. */
  l1: 0.65,
  /** Transverse rail spacing, m. PMI's `l2`. */
  l2: 0.45,
  /** `m1` centre-of-gravity offset along travel, m. PMI's `l3`. */
  l3: 0.135,
  /** `m1` centre-of-gravity offset across the rails, m. PMI's `l4`. */
  l4: 0.06,
  /** `m2` centre-of-gravity height above the mounting plane, m. PMI's `l5`. */
  l5: 0.175,
  /** `m1` centre-of-gravity height above the mounting plane, m. PMI's `l6`. */
  l6: 0.4,
  /** Load factor PMI assumes in its own section 9.5. */
  loadFactor: 1.5,
  /**
   * PMI computes with g = 9.8 m/s^2, not the standard 9.80665 this project
   * uses elsewhere (`motion.axis.gravity`'s registry default). Confirmed by
   * arithmetic, not assumed: 9.80665 reproduces PMI's own printed section
   * 9.1.1 figures to about 2.7 N, while 9.8 reproduces all four exactly.
   */
  gravityMps2: 9.8,
} as const;

/**
 * PMI's carriage numbering mapped onto this kernel's block numbering.
 *
 * Derived from the printed sign patterns, which pin it uniquely. This kernel
 * places blocks 1 and 4 at the `+` end along travel (the pitching pair) and
 * blocks 3 and 4 on the `+` rail (the rolling pair). PMI's section 9.1.1
 * gives its `No.2` and `No.3` the `+l3` sign and its `No.1` and `No.2` the
 * `+l4` sign. Matching the two groupings leaves exactly one assignment.
 */
export const CARRIAGE_MAP = {
  no1: "block3",
  no2: "block4",
  no3: "block1",
  no4: "block2",
} as const satisfies Readonly<Record<string, keyof FourBlockLoads>>;

/** The five motion phases PMI works through, in its own order and naming. */
export type PmiPhase =
  "uniform" | "accelLeft" | "decelLeft" | "accelRight" | "decelRight";

export const PMI_PHASES: readonly PmiPhase[] = [
  "uniform",
  "accelLeft",
  "decelLeft",
  "accelRight",
  "decelRight",
];

/**
 * Resolves the applied force and moment at the guide reference point for one
 * phase, from PMI's own given data.
 *
 * This is the step `axis-load-cases` performs in a real calculation; done by
 * hand here so the reproduction exercises this module's integration path
 * without depending on another module's kernel.
 *
 * Sign convention, matching ./frame.ts's guide frame: `+X` is travel to the
 * right, `+Y` the rail this kernel calls positive, `+Z` up out of the mounting
 * plane. Accelerating to the left means an inertial reaction toward `+X`.
 */
export function resolvePhaseResultant(phase: PmiPhase): {
  readonly normalForceN: number;
  readonly rollMomentNm: number;
  readonly pitchMomentNm: number;
  readonly yawMomentNm: number;
} {
  const e = PMI_EXAMPLE;
  const weightN = (e.m1 + e.m2) * e.gravityMps2;

  // Gravity's own moments: only m1 is offset in plan, which is why PMI's
  // section 9.1.1 gives m2 a bare m2*g/4 share with no moment term.
  const m1WeightN = e.m1 * e.gravityMps2;
  const gravityPitchNm = m1WeightN * e.l3;
  const gravityRollNm = m1WeightN * e.l4;

  if (phase === "uniform") {
    return {
      normalForceN: weightN,
      rollMomentNm: gravityRollNm,
      pitchMomentNm: gravityPitchNm,
      yawMomentNm: 0,
    };
  }

  const accelerating = phase === "accelLeft" || phase === "accelRight";
  const rate = accelerating ? e.a1 : e.a3;
  // Travelling left and accelerating throws the load one way; the other three
  // combinations follow from flipping travel direction and accel/decel.
  const toTheLeft = phase === "accelLeft" || phase === "decelLeft";
  const sign = (toTheLeft ? 1 : -1) * (accelerating ? 1 : -1);

  // Axial inertia acting at each mass's height is a pitching moment; acting at
  // m1's transverse offset it is also a yawing moment.
  const inertiaPitchNm = sign * (e.m1 * rate * e.l6 + e.m2 * rate * e.l5);
  const inertiaYawNm = sign * (e.m1 * rate * e.l4);

  return {
    normalForceN: weightN,
    rollMomentNm: gravityRollNm,
    pitchMomentNm: gravityPitchNm + inertiaPitchNm,
    yawMomentNm: inertiaYawNm,
  };
}

/** Per-block loads for one phase, through the module's real integration path. */
export function resolvePhaseBlockLoads(phase: PmiPhase): FourBlockLoads {
  const { normalForceN, rollMomentNm, pitchMomentNm, yawMomentNm } =
    resolvePhaseResultant(phase);
  return resolveBlockLoadsFromResultant({
    normalForceN,
    lateralForceN: 0,
    rollMomentNm,
    pitchMomentNm,
    yawMomentNm,
    railSpacingM: PMI_EXAMPLE.l2,
    blockSpacingM: PMI_EXAMPLE.l1,
  });
}

/** Equivalent load on each block for one phase (PMI's `PE = |PR| + |PT|`). */
export function resolvePhaseEquivalentLoads(
  phase: PmiPhase,
): Record<keyof FourBlockLoads, number> {
  const loads = resolvePhaseBlockLoads(phase);
  return {
    block1: resolveEquivalentLoad(loads.block1),
    block2: resolveEquivalentLoad(loads.block2),
    block3: resolveEquivalentLoad(loads.block3),
    block4: resolveEquivalentLoad(loads.block4),
  };
}

/**
 * Distance travelled in each phase of one stroke, in m. PMI's own `X1`, `X2`,
 * `X3` — the weights its section 9.4 mean-load formula uses. They sum to the
 * stroke, which is asserted in the test rather than taken on trust.
 */
export const PHASE_DISTANCES_M = {
  accel: 0.5 * PMI_EXAMPLE.velocityMps * PMI_EXAMPLE.accelTimeS,
  uniform: PMI_EXAMPLE.velocityMps * PMI_EXAMPLE.uniformTimeS,
  decel: 0.5 * PMI_EXAMPLE.velocityMps * PMI_EXAMPLE.decelTimeS,
} as const;

/**
 * Mean load on one block over the full round trip (PMI section 9.4): six
 * phases — accelerate, run, decelerate, in each direction — weighted by the
 * distance travelled in each and cube-averaged.
 */
export function resolveBlockMeanLoad(block: keyof FourBlockLoads): number {
  const d = PHASE_DISTANCES_M;
  const weightByPhase: Record<PmiPhase, number> = {
    accelLeft: d.accel,
    uniform: d.uniform,
    decelLeft: d.decel,
    accelRight: d.accel,
    decelRight: d.decel,
  };
  // The uniform phase happens once in each direction, so it enters twice.
  const phases: readonly PmiPhase[] = [
    "accelLeft",
    "uniform",
    "decelLeft",
    "accelRight",
    "uniform",
    "decelRight",
  ];
  return resolveMeanLoad(
    phases.map((phase) => ({
      loadN: resolvePhaseEquivalentLoads(phase)[block],
      runningDistance: weightByPhase[phase],
    })),
  );
}

/** Nominal life of one block, in km (PMI section 9.5). */
export function resolveBlockNominalLifeKm(block: keyof FourBlockLoads): number {
  return resolveNominalLife({
    dynamicLoadRatingN: PMI_EXAMPLE.dynamicLoadRatingN,
    equivalentLoadN: resolveBlockMeanLoad(block),
    rollingElementType: "ball",
    loadFactor: PMI_EXAMPLE.loadFactor,
  }).lifeKm;
}

/**
 * The governing static safety factor (PMI section 9.3): the static load rating
 * over the largest equivalent load reached by any block in any phase.
 */
export function resolveGoverningStaticSafetyFactor(): {
  readonly staticSafetyFactor: number;
  readonly governingLoadN: number;
  readonly governingBlock: keyof FourBlockLoads;
  readonly governingPhase: PmiPhase;
} {
  let governingLoadN = -Infinity;
  let governingBlock: keyof FourBlockLoads = "block1";
  let governingPhase: PmiPhase = "uniform";

  for (const phase of PMI_PHASES) {
    const loads = resolvePhaseEquivalentLoads(phase);
    for (const block of [
      "block1",
      "block2",
      "block3",
      "block4",
    ] as const satisfies readonly (keyof FourBlockLoads)[]) {
      if (loads[block] > governingLoadN) {
        governingLoadN = loads[block];
        governingBlock = block;
        governingPhase = phase;
      }
    }
  }

  return {
    staticSafetyFactor: resolveStaticSafetyFactor({
      staticLoadRatingN: PMI_EXAMPLE.staticLoadRatingN,
      appliedLoadN: governingLoadN,
    }).staticSafetyFactor,
    governingLoadN,
    governingBlock,
    governingPhase,
  };
}

/** Convenience accessor used by the test to read one PMI carriage's load. */
export function blockFor(
  carriage: keyof typeof CARRIAGE_MAP,
): keyof FourBlockLoads {
  return CARRIAGE_MAP[carriage];
}

/** Convenience accessor: one PMI carriage's block load in a given phase. */
export function carriageLoad(
  carriage: keyof typeof CARRIAGE_MAP,
  phase: PmiPhase,
): BlockLoad {
  return resolvePhaseBlockLoads(phase)[blockFor(carriage)];
}
