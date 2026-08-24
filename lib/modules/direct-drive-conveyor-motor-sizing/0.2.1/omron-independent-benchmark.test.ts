import { describe, expect, it } from "vitest";
import {
  resolveLinearMassInertia,
  resolveReflectedIdlerInertia,
  resolveRollerInertia,
} from "./math";
import { resolveOmronConveyorInertia } from "./omron-independent-benchmark";

// Independent-benchmark cross-check (stage-1-spec.md "Reference Examples"
// item 4, "Independent benchmark"): this module's own kernel -- four
// separate function calls (resolveRollerInertia x2,
// resolveReflectedIdlerInertia, resolveLinearMassInertia x2,
// summed by the caller) -- against Omron Corporation's own single
// combined formula (JW=J1+J2+J3+J4, mm-based, structurally reimplemented
// in ./omron-independent-benchmark.ts), a genuinely independent
// second-manufacturer source stating the identical formula shape. A
// deterministic property-based sweep (not just the one hand-verified
// scenario in stage-1-spec.md) confirms algebraic identity across a wide
// range of roller/belt/load combinations.

/** A small, deterministic PRNG (mulberry32) -- reproducible across runs, no external dependency. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

describe("direct-drive-conveyor-motor-sizing 0.1.0 independent benchmark: this module's own decomposed inertia kernel vs. Omron Corporation's own combined JW formula", () => {
  it("agree to floating-point precision on the one scenario hand-verified in stage-1-spec.md (p. F-8)", () => {
    const driveRollerDiameterM = 4 * 0.0254;
    const rollerMassKg = 35.27 * (0.45359237 / 16);
    const loadMassKg = 30 * 0.45359237;

    const { inertiaKgM2: driveRollerInertiaKgM2 } = resolveRollerInertia({
      massKg: rollerMassKg,
      diameterM: driveRollerDiameterM,
    });
    const { inertiaKgM2: idlerOwnKgM2 } = resolveRollerInertia({
      massKg: rollerMassKg,
      diameterM: driveRollerDiameterM,
    });
    const { reflectedIdlerInertiaKgM2 } = resolveReflectedIdlerInertia({
      idlerInertiaOwnKgM2: idlerOwnKgM2,
      driveRollerDiameterM,
      idlerRollerDiameterM: driveRollerDiameterM,
    });
    const { inertiaKgM2: loadInertiaKgM2 } = resolveLinearMassInertia({
      massKg: loadMassKg,
      driveRollerDiameterM,
    });
    const kernelOnShaftInertiaKgM2 =
      driveRollerInertiaKgM2 + reflectedIdlerInertiaKgM2 + loadInertiaKgM2;

    const { totalInertiaKgM2: omronInertiaKgM2 } = resolveOmronConveyorInertia(
      {
        driveRollerMassKg: rollerMassKg,
        driveRollerDiameterMm: driveRollerDiameterM * 1000,
        idlerRollerMassKg: rollerMassKg,
        idlerRollerDiameterMm: driveRollerDiameterM * 1000,
        carriedLoadMassKg: loadMassKg,
        beltMassKg: 0,
      },
    );

    expect(kernelOnShaftInertiaKgM2).toBeCloseTo(omronInertiaKgM2, 12);
  });

  it("agree to floating-point precision across 200 random roller/belt/load scenarios, including unequal roller diameters", () => {
    const rng = mulberry32(0x4d4353); // "MCS" -- fixed seed, reproducible.

    for (let i = 0; i < 200; i++) {
      const driveRollerDiameterM = randomInRange(rng, 0.02, 0.5);
      const idlerRollerDiameterM = randomInRange(rng, 0.02, 0.5);
      const driveRollerMassKg = randomInRange(rng, 0.1, 50);
      const idlerRollerMassKg = randomInRange(rng, 0.1, 50);
      const beltMassKg = randomInRange(rng, 0, 200);
      const carriedLoadMassKg = randomInRange(rng, 0, 500);

      const { inertiaKgM2: driveRollerInertiaKgM2 } = resolveRollerInertia({
        massKg: driveRollerMassKg,
        diameterM: driveRollerDiameterM,
      });
      const { inertiaKgM2: idlerOwnKgM2 } = resolveRollerInertia({
        massKg: idlerRollerMassKg,
        diameterM: idlerRollerDiameterM,
      });
      const { reflectedIdlerInertiaKgM2 } = resolveReflectedIdlerInertia({
        idlerInertiaOwnKgM2: idlerOwnKgM2,
        driveRollerDiameterM,
        idlerRollerDiameterM,
      });
      const { inertiaKgM2: beltInertiaKgM2 } = resolveLinearMassInertia({
        massKg: beltMassKg,
        driveRollerDiameterM,
      });
      const { inertiaKgM2: loadInertiaKgM2 } = resolveLinearMassInertia({
        massKg: carriedLoadMassKg,
        driveRollerDiameterM,
      });
      const kernelOnShaftInertiaKgM2 =
        driveRollerInertiaKgM2 +
        reflectedIdlerInertiaKgM2 +
        beltInertiaKgM2 +
        loadInertiaKgM2;

      const { totalInertiaKgM2: omronInertiaKgM2 } =
        resolveOmronConveyorInertia({
          driveRollerMassKg,
          driveRollerDiameterMm: driveRollerDiameterM * 1000,
          idlerRollerMassKg,
          idlerRollerDiameterMm: idlerRollerDiameterM * 1000,
          carriedLoadMassKg,
          beltMassKg,
        });

      const relativeDifference =
        Math.abs(kernelOnShaftInertiaKgM2 - omronInertiaKgM2) /
        omronInertiaKgM2;
      expect(relativeDifference).toBeLessThan(1e-9);
    }
  });
});
