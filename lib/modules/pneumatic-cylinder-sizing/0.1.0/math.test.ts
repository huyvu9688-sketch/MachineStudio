import { describe, expect, it } from "vitest";
import {
  PneumaticCylinderSizingInputError,
  resolveBucklingLoad,
  resolveCushionKineticEnergy,
  resolvePermissibleCompressiveLoad,
  resolvePistonAreas,
  resolveRequiredForce,
  resolveTheoreticalForce,
  STANDARD_GRAVITY_M_PER_S2,
} from "./math";

describe("resolveRequiredForce", () => {
  it("adds gravity and friction for the extend direction on a vertical lift", () => {
    const { forceN } = resolveRequiredForce({
      processForceN: 0,
      loadMassKg: 10,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0,
      direction: "extend",
    });
    expect(forceN).toBeCloseTo(10 * STANDARD_GRAVITY_M_PER_S2, 9);
  });

  it("subtracts gravity for the retract direction on a vertical lift", () => {
    const { forceN } = resolveRequiredForce({
      processForceN: 0,
      loadMassKg: 10,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0,
      direction: "retract",
    });
    expect(forceN).toBeCloseTo(-10 * STANDARD_GRAVITY_M_PER_S2, 9);
  });

  it("can go negative on retract for a strongly gravity-assisted heavy load", () => {
    const { forceN } = resolveRequiredForce({
      processForceN: 0,
      loadMassKg: 50,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0.02,
      direction: "retract",
    });
    expect(forceN).toBeLessThan(0);
  });

  it("applies process force only on the extend direction", () => {
    const extend = resolveRequiredForce({
      processForceN: 500,
      loadMassKg: 1,
      inclineAngleRad: 0,
      frictionCoefficient: 0,
      direction: "extend",
    });
    const retract = resolveRequiredForce({
      processForceN: 500,
      loadMassKg: 1,
      inclineAngleRad: 0,
      frictionCoefficient: 0,
      direction: "retract",
    });
    expect(extend.forceN).toBeCloseTo(500, 9);
    expect(retract.forceN).toBeCloseTo(0, 9);
  });

  it("keeps friction direction-symmetric (always added)", () => {
    const extend = resolveRequiredForce({
      processForceN: 0,
      loadMassKg: 10,
      inclineAngleRad: 0,
      frictionCoefficient: 0.3,
      direction: "extend",
    });
    const retract = resolveRequiredForce({
      processForceN: 0,
      loadMassKg: 10,
      inclineAngleRad: 0,
      frictionCoefficient: 0.3,
      direction: "retract",
    });
    expect(extend.forceN).toBeCloseTo(retract.forceN, 9);
    expect(extend.forceN).toBeGreaterThan(0);
  });

  it("rejects an incline angle outside [0, pi/2]", () => {
    expect(() =>
      resolveRequiredForce({
        processForceN: 0,
        loadMassKg: 1,
        inclineAngleRad: Math.PI,
        frictionCoefficient: 0,
        direction: "extend",
      }),
    ).toThrow(PneumaticCylinderSizingInputError);
  });

  it("rejects a negative process force", () => {
    expect(() =>
      resolveRequiredForce({
        processForceN: -1,
        loadMassKg: 1,
        inclineAngleRad: 0,
        frictionCoefficient: 0,
        direction: "extend",
      }),
    ).toThrow(PneumaticCylinderSizingInputError);
  });
});

describe("resolvePistonAreas", () => {
  it("computes A1 = pi*D^2/4 and A2 = pi*(D^2-d^2)/4", () => {
    const { extendAreaMm2, retractAreaMm2 } = resolvePistonAreas({
      boreDiameterMm: 50,
      rodDiameterMm: 16,
    });
    expect(extendAreaMm2).toBeCloseTo((Math.PI * 50 ** 2) / 4, 6);
    expect(retractAreaMm2).toBeCloseTo(
      (Math.PI * (50 ** 2 - 16 ** 2)) / 4,
      6,
    );
  });

  it("rejects a rod diameter not smaller than the bore diameter", () => {
    expect(() =>
      resolvePistonAreas({ boreDiameterMm: 50, rodDiameterMm: 50 }),
    ).toThrow(PneumaticCylinderSizingInputError);
  });

  it("rejects non-positive geometry", () => {
    expect(() =>
      resolvePistonAreas({ boreDiameterMm: 0, rodDiameterMm: 0 }),
    ).toThrow(PneumaticCylinderSizingInputError);
    expect(() =>
      resolvePistonAreas({ boreDiameterMm: -50, rodDiameterMm: 16 }),
    ).toThrow(PneumaticCylinderSizingInputError);
    expect(() =>
      resolvePistonAreas({ boreDiameterMm: 50, rodDiameterMm: 0 }),
    ).toThrow(PneumaticCylinderSizingInputError);
    expect(() =>
      resolvePistonAreas({ boreDiameterMm: 50, rodDiameterMm: -16 }),
    ).toThrow(PneumaticCylinderSizingInputError);
  });
});

describe("resolveTheoreticalForce", () => {
  it("computes F = eta * A * P", () => {
    const { forceN } = resolveTheoreticalForce({
      areaMm2: 1963.5,
      pressureMPa: 0.5,
      loadFactor: 0.7,
    });
    expect(forceN).toBeCloseTo(0.7 * 1963.5 * 0.5, 6);
  });

  it("rejects a load factor outside [0, 1]", () => {
    expect(() =>
      resolveTheoreticalForce({ areaMm2: 100, pressureMPa: 0.5, loadFactor: 1.5 }),
    ).toThrow(PneumaticCylinderSizingInputError);
  });

  it("rejects non-positive area or pressure", () => {
    expect(() =>
      resolveTheoreticalForce({ areaMm2: 0, pressureMPa: 0.5, loadFactor: 0.7 }),
    ).toThrow(PneumaticCylinderSizingInputError);
    expect(() =>
      resolveTheoreticalForce({ areaMm2: 100, pressureMPa: 0, loadFactor: 0.7 }),
    ).toThrow(PneumaticCylinderSizingInputError);
  });
});

describe("resolveCushionKineticEnergy", () => {
  it("computes E = (m/2) * V^2", () => {
    const { kineticEnergyJ } = resolveCushionKineticEnergy({
      loadMassKg: 50,
      maxPistonSpeedMps: 0.3,
    });
    expect(kineticEnergyJ).toBeCloseTo(2.25, 6);
  });

  it("rejects non-positive mass or speed", () => {
    expect(() =>
      resolveCushionKineticEnergy({ loadMassKg: 0, maxPistonSpeedMps: 1 }),
    ).toThrow(PneumaticCylinderSizingInputError);
    expect(() =>
      resolveCushionKineticEnergy({ loadMassKg: 10, maxPistonSpeedMps: 0 }),
    ).toThrow(PneumaticCylinderSizingInputError);
  });
});

describe("resolveBucklingLoad / resolvePermissibleCompressiveLoad", () => {
  it("computes a smaller buckling load for a longer column", () => {
    const short = resolveBucklingLoad({
      rodDiameterMm: 16,
      columnLengthMm: 200,
      mountingStyle: "fixed-supported",
    });
    const long = resolveBucklingLoad({
      rodDiameterMm: 16,
      columnLengthMm: 800,
      mountingStyle: "fixed-supported",
    });
    expect(long.bucklingLoadN).toBeLessThan(short.bucklingLoadN);
  });

  it("rejects non-positive geometry", () => {
    expect(() =>
      resolveBucklingLoad({
        rodDiameterMm: 0,
        columnLengthMm: 400,
        mountingStyle: "fixed-supported",
      }),
    ).toThrow(PneumaticCylinderSizingInputError);
    expect(() =>
      resolveBucklingLoad({
        rodDiameterMm: 16,
        columnLengthMm: 0,
        mountingStyle: "fixed-supported",
      }),
    ).toThrow(PneumaticCylinderSizingInputError);
  });

  it("computes permissible load as buckling load / safety factor", () => {
    const { bucklingLoadN } = resolveBucklingLoad({
      rodDiameterMm: 16,
      columnLengthMm: 400,
      mountingStyle: "fixed-free",
    });
    const { permissibleCompressiveLoadN } = resolvePermissibleCompressiveLoad({
      bucklingLoadN,
      bucklingSafetyFactor: 4,
    });
    expect(permissibleCompressiveLoadN).toBeCloseTo(bucklingLoadN / 4, 6);
  });

  it("rejects a safety factor below 1", () => {
    expect(() =>
      resolvePermissibleCompressiveLoad({
        bucklingLoadN: 1000,
        bucklingSafetyFactor: 0.5,
      }),
    ).toThrow(PneumaticCylinderSizingInputError);
  });
});
