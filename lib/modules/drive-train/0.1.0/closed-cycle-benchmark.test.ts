import { describe, expect, it } from "vitest";
import {
  ClosedCycleBenchmarkInputError,
  resolveNetVelocityChange,
  resolvePhaseRmsAccel,
  resolvePhaseRmsTorque,
  type TorquePhase,
} from "./closed-cycle-benchmark";
import { resolveEffectiveTorque } from "./math";

// Cross-checks resolveEffectiveTorque's closed-form Trms against a
// structurally different, direct per-phase computation
// (resolvePhaseRmsTorque) -- the "independent benchmark source or tool
// comparison" context/roadmap.md Module Definition of Done item 9 requires,
// closing the gap validation.ts's own `independentBenchmark` field records.
//
// resolveEffectiveTorque takes a linear acceleration (rmsAccelerationMps2)
// and scales it by totalSystemInertiaKgM2*2*pi*gearRatio/leadM. Choosing
// leadM = 2*pi and gearRatio = 1 makes that scale factor exactly
// totalSystemInertiaKgM2, so the closed form reduces to the pure identity
// under test -- Trms^2 = totalInertia^2*a_rms^2 + loadTorque^2 -- decoupled
// from the physical lead/gear-ratio unit conversion, which
// ./omron-reference-example.ts already exercises end to end.
const UNIT_LEAD_M = 2 * Math.PI;
const UNIT_GEAR_RATIO = 1;

function closedFormTrms(
  phases: readonly TorquePhase[],
  totalInertia: number,
  loadTorque: number,
): number {
  return resolveEffectiveTorque({
    totalSystemInertiaKgM2: totalInertia,
    rmsAccelerationMps2: resolvePhaseRmsAccel(phases),
    leadM: UNIT_LEAD_M,
    gearRatio: UNIT_GEAR_RATIO,
    loadTorqueNm: loadTorque,
  }).effectiveTorqueNm;
}

// Repeating cycles (net velocity change == 0) -- the condition
// stage-1-spec.md "The RMS-Acceleration Dependency Question" derives the
// identity from. Chosen to cover varied phase counts and shapes: a
// symmetric 2-phase accel/decel, an asymmetric 2-phase accel/decel, a
// Voss-style 4-phase accel/dwell/decel/dwell cycle, and an asymmetric
// 5-phase cycle with multiple sign changes.
const REPEATING_CYCLES: Record<string, readonly TorquePhase[]> = {
  "symmetric 2-phase accel/decel": [
    { accel: 2, durationS: 1 },
    { accel: -2, durationS: 1 },
  ],
  "asymmetric 2-phase accel/decel": [
    { accel: 3, durationS: 0.5 },
    { accel: -1, durationS: 1.5 },
  ],
  "4-phase accel/dwell/decel/dwell (Voss-style)": [
    { accel: 1.5, durationS: 0.2 },
    { accel: 0, durationS: 0.6 },
    { accel: -0.5, durationS: 0.6 },
    { accel: 0, durationS: 0.5 },
  ],
  "asymmetric 5-phase, multiple sign changes": [
    { accel: 4, durationS: 0.25 },
    { accel: -1, durationS: 0.3 },
    { accel: -2, durationS: 0.2 },
    { accel: 0, durationS: 0.4 },
    { accel: -1, durationS: 0.3 },
  ],
};

// (totalInertia, loadTorque) pairs -- the identity holds for any positive
// inertia and non-negative load torque, so sweeping several pairs multiplies
// implementation coverage (catching a sign or exponent slip in either
// computation) even though the underlying algebra is the same for all of
// them.
const INERTIA_LOAD_TORQUE_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [2, 3],
  [1.753e-4, 7.8e-3], // Omron's own reference-example magnitude
  [0.01, 0],
  [50, 12.5],
];

describe("closed-cycle RMS-acceleration identity (independent benchmark)", () => {
  for (const [cycleName, phases] of Object.entries(REPEATING_CYCLES)) {
    describe(cycleName, () => {
      it("has zero net velocity change (the identity's own precondition)", () => {
        expect(resolveNetVelocityChange(phases)).toBeCloseTo(0, 9);
      });

      for (const [totalInertia, loadTorque] of INERTIA_LOAD_TORQUE_PAIRS) {
        it(`direct per-phase Trms matches the closed form (J=${totalInertia}, T_L=${loadTorque})`, () => {
          const direct = resolvePhaseRmsTorque(
            phases,
            totalInertia,
            loadTorque,
          );
          const closed = closedFormTrms(phases, totalInertia, loadTorque);
          expect(direct).toBeCloseTo(closed, 9);
        });
      }
    });
  }

  it("diverges from the closed form when the cycle does not repeat (net velocity change != 0)", () => {
    const nonRepeating: TorquePhase[] = [
      { accel: 2, durationS: 1 },
      { accel: -2, durationS: 0.5 },
    ];
    expect(resolveNetVelocityChange(nonRepeating)).not.toBeCloseTo(0, 6);

    const direct = resolvePhaseRmsTorque(nonRepeating, 2, 3);
    const closed = closedFormTrms(nonRepeating, 2, 3);
    // Not a floating-point rounding gap: the two methods disagree by a
    // large, physically meaningful margin once the repeating-cycle
    // precondition is violated, proving the precondition is load-bearing
    // rather than a vacuous restriction the algebra never actually needed.
    expect(Math.abs(direct - closed)).toBeGreaterThan(0.5);
  });
});

describe("resolvePhaseRmsTorque", () => {
  it("rejects an empty phase list", () => {
    expect(() => resolvePhaseRmsTorque([], 1, 0)).toThrow(
      ClosedCycleBenchmarkInputError,
    );
  });

  it("rejects a non-positive total inertia", () => {
    expect(() =>
      resolvePhaseRmsTorque([{ accel: 1, durationS: 1 }], 0, 0),
    ).toThrow(ClosedCycleBenchmarkInputError);
  });

  it("rejects a negative load torque", () => {
    expect(() =>
      resolvePhaseRmsTorque([{ accel: 1, durationS: 1 }], 1, -1),
    ).toThrow(ClosedCycleBenchmarkInputError);
  });

  it("rejects a non-positive phase duration", () => {
    expect(() =>
      resolvePhaseRmsTorque([{ accel: 1, durationS: 0 }], 1, 0),
    ).toThrow(ClosedCycleBenchmarkInputError);
  });
});

describe("resolveNetVelocityChange", () => {
  it("rejects an empty phase list", () => {
    expect(() => resolveNetVelocityChange([])).toThrow(
      ClosedCycleBenchmarkInputError,
    );
  });
});

describe("resolvePhaseRmsAccel", () => {
  it("rejects an empty phase list", () => {
    expect(() => resolvePhaseRmsAccel([])).toThrow(
      ClosedCycleBenchmarkInputError,
    );
  });
});
