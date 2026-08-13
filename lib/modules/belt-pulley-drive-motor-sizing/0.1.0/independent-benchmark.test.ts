import { describe, expect, it } from "vitest";
import { resolveDriveForce, resolveLoadTorque } from "./math";
import { resolveOrientalMotorLoadTorque } from "./independent-benchmark";

// Independent-benchmark cross-check (stage-1-spec.md "Independent
// benchmark"): this module's own kernel -- two separate function calls
// (resolveDriveForce then resolveLoadTorque) -- against a single combined
// expression reimplementing the same Oriental Motor formula, written
// independently in ./independent-benchmark.ts. A deterministic
// property-based sweep (not just one hand-verified scenario) confirms
// algebraic identity across a wide range of mass/incline/friction/
// diameter/efficiency/gear-ratio combinations.

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

describe("belt-pulley-drive-motor-sizing 0.1.0 independent benchmark: this module's own decomposed force/load-torque kernel vs. Oriental Motor's own combined F/TL formula", () => {
  it("agree to floating-point precision on a representative horizontal scenario", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 20,
      totalMovingMassKg: 40.8233,
      gravityMps2: 9.80665,
      inclineAngleRad: 0,
      frictionCoefficient: 0.05,
    });
    const { loadTorqueNm } = resolveLoadTorque({
      forceN,
      pulleyPitchDiameterM: 0.0508,
      mechanicalEfficiency: 0.8,
      gearRatio: 10,
    });

    const benchmark = resolveOrientalMotorLoadTorque({
      totalMovingMassKg: 40.8233,
      gravityMps2: 9.80665,
      inclineAngleRad: 0,
      frictionCoefficient: 0.05,
      externalForceN: 20,
      pulleyPitchDiameterM: 0.0508,
      mechanicalEfficiency: 0.8,
      gearRatio: 10,
    });

    expect(forceN).toBeCloseTo(benchmark.forceN, 12);
    expect(loadTorqueNm).toBeCloseTo(benchmark.loadTorqueNm, 12);
  });

  it("agree to floating-point precision across 300 random scenarios, including inclined orientations", () => {
    const rng = mulberry32(0x42504d); // "BPM" -- fixed seed, reproducible.

    for (let i = 0; i < 300; i++) {
      const totalMovingMassKg = randomInRange(rng, 0.5, 2000);
      const gravityMps2 = 9.80665;
      const inclineAngleRad = randomInRange(rng, 0, Math.PI / 2);
      const frictionCoefficient = randomInRange(rng, 0, 0.6);
      const externalForceN = randomInRange(rng, -500, 500);
      const pulleyPitchDiameterM = randomInRange(rng, 0.01, 0.5);
      const mechanicalEfficiency = randomInRange(rng, 0.3, 1);
      const gearRatio = randomInRange(rng, 0.5, 50);

      const { forceN } = resolveDriveForce({
        externalForceN,
        totalMovingMassKg,
        gravityMps2,
        inclineAngleRad,
        frictionCoefficient,
      });
      const { loadTorqueNm } = resolveLoadTorque({
        forceN,
        pulleyPitchDiameterM,
        mechanicalEfficiency,
        gearRatio,
      });

      const benchmark = resolveOrientalMotorLoadTorque({
        totalMovingMassKg,
        gravityMps2,
        inclineAngleRad,
        frictionCoefficient,
        externalForceN,
        pulleyPitchDiameterM,
        mechanicalEfficiency,
        gearRatio,
      });

      const relativeDifference =
        Math.abs(loadTorqueNm - benchmark.loadTorqueNm) /
        Math.max(Math.abs(benchmark.loadTorqueNm), 1e-12);
      expect(relativeDifference).toBeLessThan(1e-9);
    }
  });
});
