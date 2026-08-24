import { describe, expect, it } from "vitest";
import {
  resolvePistonAreas,
  resolveTheoreticalForce,
  resolveCushionKineticEnergy,
  resolveBucklingLoad,
  resolvePermissibleCompressiveLoad,
  resolveAirDemand,
  PneumaticCylinderInputError,
  type PneumaticMountingStyle,
} from "./math";

describe("resolvePistonAreas", () => {
  it("computes A1 = pi*D^2/4 and A2 = pi*(D^2-d^2)/4", () => {
    const { extendAreaMm2, retractAreaMm2 } = resolvePistonAreas({
      boreDiameterMm: 50,
      rodDiameterMm: 20,
    });
    expect(extendAreaMm2).toBeCloseTo((Math.PI * 50 ** 2) / 4, 9);
    expect(retractAreaMm2).toBeCloseTo((Math.PI * (50 ** 2 - 20 ** 2)) / 4, 9);
  });

  // SMC's own printed piston-area table (Table (1)), spot-checked against
  // this kernel's direct geometric formula -- context/modules/
  // pneumatic-cylinder/stage-2-contract.md "Stage 3 Entry Criteria" item 3
  // ("both agree"). Matches to catalog-rounding precision (~3 significant
  // figures), never more than ~0.3% relative error across every bore size
  // sampled -- confirmed, not assumed.
  it.each([
    [6, 28.3],
    [10, 78.5],
    [20, 314],
    [40, 1260],
    [63, 3120],
    [100, 7850],
  ])(
    "matches SMC's own printed A1 for a %dmm bore to within 0.3%%",
    (boreDiameterMm, printedA1) => {
      const { extendAreaMm2 } = resolvePistonAreas({
        boreDiameterMm,
        // Rod diameter does not affect A1; any smaller value works.
        rodDiameterMm: boreDiameterMm / 2,
      });
      const relativeError = Math.abs(extendAreaMm2 - printedA1) / printedA1;
      expect(relativeError).toBeLessThan(0.003);
    },
  );

  it("rejects a rod diameter not smaller than the bore diameter", () => {
    expect(() =>
      resolvePistonAreas({ boreDiameterMm: 20, rodDiameterMm: 20 }),
    ).toThrow(PneumaticCylinderInputError);
    expect(() =>
      resolvePistonAreas({ boreDiameterMm: 20, rodDiameterMm: 25 }),
    ).toThrow(PneumaticCylinderInputError);
  });

  it("rejects non-positive geometry", () => {
    expect(() =>
      resolvePistonAreas({ boreDiameterMm: 0, rodDiameterMm: 0 }),
    ).toThrow(PneumaticCylinderInputError);
    expect(() =>
      resolvePistonAreas({ boreDiameterMm: -20, rodDiameterMm: 10 }),
    ).toThrow(PneumaticCylinderInputError);
  });
});

describe("resolveTheoreticalForce", () => {
  it("computes F = eta * A * P (SMC bore-selection Example 1: 63mm bore, eta=0.7, P=0.5MPa)", () => {
    const { extendAreaMm2 } = resolvePistonAreas({
      boreDiameterMm: 63,
      rodDiameterMm: 20,
    });
    const { forceN } = resolveTheoreticalForce({
      areaMm2: extendAreaMm2,
      pressureMPa: 0.5,
      loadFactor: 0.7,
    });
    expect(forceN).toBeCloseTo(1091.04, 2);
    // SMC's own selection: this bore clears the stated 1000 N requirement.
    expect(forceN).toBeGreaterThanOrEqual(1000);
  });

  it("rejects a load factor outside [0, 1]", () => {
    expect(() =>
      resolveTheoreticalForce({
        areaMm2: 100,
        pressureMPa: 0.5,
        loadFactor: 1.1,
      }),
    ).toThrow(PneumaticCylinderInputError);
    expect(() =>
      resolveTheoreticalForce({
        areaMm2: 100,
        pressureMPa: 0.5,
        loadFactor: -0.1,
      }),
    ).toThrow(PneumaticCylinderInputError);
  });

  it("rejects non-positive area or pressure", () => {
    expect(() =>
      resolveTheoreticalForce({
        areaMm2: 0,
        pressureMPa: 0.5,
        loadFactor: 0.7,
      }),
    ).toThrow(PneumaticCylinderInputError);
    expect(() =>
      resolveTheoreticalForce({
        areaMm2: 100,
        pressureMPa: 0,
        loadFactor: 0.7,
      }),
    ).toThrow(PneumaticCylinderInputError);
  });
});

describe("resolveCushionKineticEnergy", () => {
  it("computes E = (m/2)*V^2 (SMC cushion-graph example: 50kg, 300mm/s -> 2.25J)", () => {
    const { kineticEnergyJ } = resolveCushionKineticEnergy({
      loadMassKg: 50,
      maxPistonSpeedMps: 0.3,
    });
    expect(kineticEnergyJ).toBeCloseTo(2.25, 9);
  });

  it("rejects non-positive mass or speed", () => {
    expect(() =>
      resolveCushionKineticEnergy({ loadMassKg: 0, maxPistonSpeedMps: 1 }),
    ).toThrow(PneumaticCylinderInputError);
    expect(() =>
      resolveCushionKineticEnergy({ loadMassKg: 10, maxPistonSpeedMps: 0 }),
    ).toThrow(PneumaticCylinderInputError);
  });
});

describe("resolveBucklingLoad", () => {
  const CASE = { rodDiameterMm: 10, columnLengthMm: 500 };

  it("computes Fk = factor * pi^2 * E_steel * J / L^2, J = pi*d^4/64", () => {
    const { bucklingLoadN } = resolveBucklingLoad({
      ...CASE,
      mountingStyle: "supported-supported",
    });
    expect(bucklingLoadN).toBeCloseTo(4069.5738, 3);
  });

  it("scales with the same 0.25:1:2:4 end-fixity ratios ball-screw's own kernel uses", () => {
    const styles: readonly [PneumaticMountingStyle, number][] = [
      ["fixed-free", 0.25],
      ["supported-supported", 1.0],
      ["fixed-supported", 2.0],
      ["fixed-fixed", 4.0],
    ];
    const { bucklingLoadN: baseline } = resolveBucklingLoad({
      ...CASE,
      mountingStyle: "supported-supported",
    });
    for (const [mountingStyle, ratio] of styles) {
      const { bucklingLoadN } = resolveBucklingLoad({ ...CASE, mountingStyle });
      expect(bucklingLoadN).toBeCloseTo(baseline * ratio, 6);
    }
  });

  it("is proportional to 1/L^2 (halving the column length quadruples the load)", () => {
    const { bucklingLoadN: full } = resolveBucklingLoad({
      ...CASE,
      mountingStyle: "fixed-fixed",
    });
    const { bucklingLoadN: halved } = resolveBucklingLoad({
      rodDiameterMm: CASE.rodDiameterMm,
      columnLengthMm: CASE.columnLengthMm / 2,
      mountingStyle: "fixed-fixed",
    });
    expect(halved).toBeCloseTo(full * 4, 6);
  });

  it("is proportional to d^4 (doubling the rod diameter multiplies the load by 16)", () => {
    const { bucklingLoadN: base } = resolveBucklingLoad({
      ...CASE,
      mountingStyle: "fixed-supported",
    });
    const { bucklingLoadN: doubled } = resolveBucklingLoad({
      rodDiameterMm: CASE.rodDiameterMm * 2,
      columnLengthMm: CASE.columnLengthMm,
      mountingStyle: "fixed-supported",
    });
    expect(doubled).toBeCloseTo(base * 16, 3);
  });

  it("rejects non-positive geometry", () => {
    expect(() =>
      resolveBucklingLoad({
        rodDiameterMm: 0,
        columnLengthMm: 500,
        mountingStyle: "fixed-free",
      }),
    ).toThrow(PneumaticCylinderInputError);
  });
});

describe("resolvePermissibleCompressiveLoad", () => {
  it("computes F_perm = Fk / S (a divisor, not a multiplier)", () => {
    const { permissibleCompressiveLoadN } = resolvePermissibleCompressiveLoad({
      bucklingLoadN: 4000,
      bucklingSafetyFactor: 4,
    });
    expect(permissibleCompressiveLoadN).toBeCloseTo(1000, 9);
  });

  it("rejects a safety factor below 1", () => {
    expect(() =>
      resolvePermissibleCompressiveLoad({
        bucklingLoadN: 4000,
        bucklingSafetyFactor: 0.5,
      }),
    ).toThrow(PneumaticCylinderInputError);
  });
});

describe("resolveAirDemand", () => {
  // SMC's own worked example (recovered via a text-extraction proxy this
  // session -- see lib/standards/engineering-sources.ts): 50mm bore, 600mm
  // stroke, 0.5MPa, 2m/6mm piping. Printed sub-totals: cylinder ~13L,
  // piping ~0.56L. Reproduced here with a 20mm rod (inferred -- see
  // ./smc-reference-examples.ts).
  it("reproduces SMC's own worked air-consumption example (bore 50mm/rod 20mm/stroke 600mm/0.5MPa/2m,6mm piping)", () => {
    const { extendAreaMm2, retractAreaMm2 } = resolvePistonAreas({
      boreDiameterMm: 50,
      rodDiameterMm: 20,
    });
    const { airConsumptionPerCycleL } = resolveAirDemand({
      extendAreaMm2,
      retractAreaMm2,
      strokeMm: 600,
      pressureMPa: 0.5,
      pipingBoreMm: 6,
      pipingLengthMm: 2000,
      maxPistonSpeedMps: 0.5,
    });
    expect(airConsumptionPerCycleL).toBeCloseTo(13.57, 1);
  });

  it("drops the piping term entirely when pipingBoreMm is 0", () => {
    const { extendAreaMm2, retractAreaMm2 } = resolvePistonAreas({
      boreDiameterMm: 50,
      rodDiameterMm: 20,
    });
    const withPiping = resolveAirDemand({
      extendAreaMm2,
      retractAreaMm2,
      strokeMm: 600,
      pressureMPa: 0.5,
      pipingBoreMm: 6,
      pipingLengthMm: 2000,
      maxPistonSpeedMps: 0.5,
    });
    const withoutPiping = resolveAirDemand({
      extendAreaMm2,
      retractAreaMm2,
      strokeMm: 600,
      pressureMPa: 0.5,
      pipingBoreMm: 0,
      pipingLengthMm: 0,
      maxPistonSpeedMps: 0.5,
    });
    expect(withoutPiping.airConsumptionPerCycleL).toBeLessThan(
      withPiping.airConsumptionPerCycleL,
    );
  });

  it("increases the required air volume as max piston speed increases (shorter stroke time)", () => {
    const { extendAreaMm2, retractAreaMm2 } = resolvePistonAreas({
      boreDiameterMm: 50,
      rodDiameterMm: 20,
    });
    const slow = resolveAirDemand({
      extendAreaMm2,
      retractAreaMm2,
      strokeMm: 600,
      pressureMPa: 0.5,
      pipingBoreMm: 0,
      pipingLengthMm: 0,
      maxPistonSpeedMps: 0.2,
    });
    const fast = resolveAirDemand({
      extendAreaMm2,
      retractAreaMm2,
      strokeMm: 600,
      pressureMPa: 0.5,
      pipingBoreMm: 0,
      pipingLengthMm: 0,
      maxPistonSpeedMps: 0.8,
    });
    expect(fast.requiredAirVolumeLPerMin).toBeGreaterThan(
      slow.requiredAirVolumeLPerMin,
    );
    // Air consumption per cycle does not depend on speed (only on
    // geometry, stroke, and pressure) -- only the required *rate* does.
    expect(fast.airConsumptionPerCycleL).toBeCloseTo(
      slow.airConsumptionPerCycleL,
      9,
    );
  });

  it("rejects non-positive stroke, pressure, or speed", () => {
    expect(() =>
      resolveAirDemand({
        extendAreaMm2: 100,
        retractAreaMm2: 80,
        strokeMm: 0,
        pressureMPa: 0.5,
        pipingBoreMm: 0,
        pipingLengthMm: 0,
        maxPistonSpeedMps: 0.5,
      }),
    ).toThrow(PneumaticCylinderInputError);
  });
});
