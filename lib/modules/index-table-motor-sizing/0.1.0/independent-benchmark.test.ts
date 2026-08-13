import { describe, expect, it } from "vitest";
import {
  accelerationTorque,
  angularAccelerationFromSpeedRamp,
  resolveInertiaRatio,
  resolveLoadInertia,
  resolveOperatingSpeed,
  resolveReflectedLoadInertia,
  resolveTableInertia,
  resolveTotalSystemInertia,
} from "./math";
import { resolveIndexTableAccelerationTorque } from "./independent-benchmark";

// Independent-benchmark cross-check (stage-1-spec.md "Independent
// benchmark"): this module's own kernel -- six separate function calls,
// composed by compute.ts -- against a single combined expression
// reimplementing the same underlying physics, written independently in
// ./independent-benchmark.ts. A deterministic property-based sweep (not
// just one hand-verified scenario) confirms algebraic identity across a
// wide range of table/load/gear/motor/motion combinations.

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

function kernelAccelerationTorque(input: {
  tableMassKg: number;
  tableDiameterM: number;
  attachedLoadInertiaKgM2: number;
  gearRatio: number;
  motorRotorInertiaKgM2: number;
  indexAngleRad: number;
  indexTimeS: number;
  accelerationTimeS: number;
}): { totalSystemInertiaKgM2: number; accelerationTorqueNm: number } {
  const { inertiaKgM2: tableInertiaKgM2 } = resolveTableInertia({
    tableMassKg: input.tableMassKg,
    tableDiameterM: input.tableDiameterM,
  });
  const { loadInertiaKgM2 } = resolveLoadInertia({
    tableInertiaKgM2,
    attachedLoadInertiaKgM2: input.attachedLoadInertiaKgM2,
  });
  const { reflectedLoadInertiaKgM2 } = resolveReflectedLoadInertia({
    loadInertiaKgM2,
    gearRatio: input.gearRatio,
  });
  const { totalSystemInertiaKgM2 } = resolveTotalSystemInertia({
    motorRotorInertiaKgM2: input.motorRotorInertiaKgM2,
    reflectedLoadInertiaKgM2,
  });
  const { operatingSpeedRadPerS } = resolveOperatingSpeed({
    indexAngleRad: input.indexAngleRad,
    indexTimeS: input.indexTimeS,
    accelerationTimeS: input.accelerationTimeS,
    gearRatio: input.gearRatio,
  });
  const { angularAccelerationRadPerS2 } = angularAccelerationFromSpeedRamp({
    angularVelocityChangeRadPerS: operatingSpeedRadPerS,
    rampTimeS: input.accelerationTimeS,
  });
  const { torqueNm } = accelerationTorque({
    inertiaKgM2: totalSystemInertiaKgM2,
    angularAccelerationRadPerS2,
  });

  return { totalSystemInertiaKgM2, accelerationTorqueNm: torqueNm };
}

describe("index-table-motor-sizing 0.1.0 independent benchmark: this module's own six-function kernel vs. one combined expression", () => {
  it("agree to floating-point precision on a representative scenario (AutomationDirect's own index-table example, i=6)", () => {
    const scenario = {
      tableMassKg: 46.68,
      tableDiameterM: 0.3048,
      attachedLoadInertiaKgM2: 0,
      gearRatio: 6,
      motorRotorInertiaKgM2: 0.0015818,
      indexAngleRad: Math.PI / 4,
      indexTimeS: 0.5,
      accelerationTimeS: 0.125,
    };

    const kernel = kernelAccelerationTorque(scenario);
    const benchmark = resolveIndexTableAccelerationTorque(scenario);

    expect(kernel.totalSystemInertiaKgM2).toBeCloseTo(
      benchmark.totalSystemInertiaKgM2,
      12,
    );
    expect(kernel.accelerationTorqueNm).toBeCloseTo(
      benchmark.accelerationTorqueNm,
      9,
    );
  });

  it("agree to floating-point precision across 300 random scenarios", () => {
    const rng = mulberry32(0x495449); // "ITI" -- fixed seed, reproducible.

    for (let i = 0; i < 300; i++) {
      const tableMassKg = randomInRange(rng, 0.5, 500);
      const tableDiameterM = randomInRange(rng, 0.05, 1.5);
      const attachedLoadInertiaKgM2 = randomInRange(rng, 0, 2);
      const gearRatio = randomInRange(rng, 0.5, 30);
      const motorRotorInertiaKgM2 = randomInRange(rng, 1e-5, 0.05);
      const indexAngleRad = randomInRange(rng, 0.01, Math.PI);
      const indexTimeS = randomInRange(rng, 0.2, 5);
      const accelerationTimeS = randomInRange(rng, 0.01, indexTimeS * 0.49);

      const scenario = {
        tableMassKg,
        tableDiameterM,
        attachedLoadInertiaKgM2,
        gearRatio,
        motorRotorInertiaKgM2,
        indexAngleRad,
        indexTimeS,
        accelerationTimeS,
      };

      const kernel = kernelAccelerationTorque(scenario);
      const benchmark = resolveIndexTableAccelerationTorque(scenario);

      const relativeDifference =
        Math.abs(kernel.accelerationTorqueNm - benchmark.accelerationTorqueNm) /
        Math.abs(benchmark.accelerationTorqueNm);
      expect(relativeDifference).toBeLessThan(1e-9);
    }
  });

  it("inertia ratio is unaffected by the benchmark comparison method (sanity: resolveInertiaRatio still composes correctly)", () => {
    const { inertiaKgM2: tableInertiaKgM2 } = resolveTableInertia({
      tableMassKg: 46.68,
      tableDiameterM: 0.3048,
    });
    const { loadInertiaKgM2 } = resolveLoadInertia({
      tableInertiaKgM2,
      attachedLoadInertiaKgM2: 0,
    });
    const { reflectedLoadInertiaKgM2 } = resolveReflectedLoadInertia({
      loadInertiaKgM2,
      gearRatio: 6,
    });
    const { inertiaRatio } = resolveInertiaRatio({
      reflectedLoadInertiaKgM2,
      motorRotorInertiaKgM2: 0.0015818,
    });
    expect(inertiaRatio).toBeCloseTo(9.52, 1);
  });
});
