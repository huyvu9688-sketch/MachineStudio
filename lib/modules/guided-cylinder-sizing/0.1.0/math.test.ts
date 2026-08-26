import { describe, expect, it } from "vitest";
import {
  GuidedCylinderSizingInputError,
  resolveBucklingLoad,
  resolveCushionKineticEnergy,
  resolvePermissibleCompressiveLoad,
  resolvePistonAreas,
  resolveRequiredForce,
  resolveRequiredMoment,
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
    ).toThrow(GuidedCylinderSizingInputError);
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
    ).toThrow(GuidedCylinderSizingInputError);
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
    ).toThrow(GuidedCylinderSizingInputError);
  });

  it("rejects non-positive geometry", () => {
    expect(() =>
      resolvePistonAreas({ boreDiameterMm: 0, rodDiameterMm: 0 }),
    ).toThrow(GuidedCylinderSizingInputError);
    expect(() =>
      resolvePistonAreas({ boreDiameterMm: -50, rodDiameterMm: 16 }),
    ).toThrow(GuidedCylinderSizingInputError);
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
    ).toThrow(GuidedCylinderSizingInputError);
  });

  it("rejects non-positive area or pressure", () => {
    expect(() =>
      resolveTheoreticalForce({ areaMm2: 0, pressureMPa: 0.5, loadFactor: 0.7 }),
    ).toThrow(GuidedCylinderSizingInputError);
    expect(() =>
      resolveTheoreticalForce({ areaMm2: 100, pressureMPa: 0, loadFactor: 0.7 }),
    ).toThrow(GuidedCylinderSizingInputError);
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
    ).toThrow(GuidedCylinderSizingInputError);
    expect(() =>
      resolveCushionKineticEnergy({ loadMassKg: 10, maxPistonSpeedMps: 0 }),
    ).toThrow(GuidedCylinderSizingInputError);
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
    ).toThrow(GuidedCylinderSizingInputError);
    expect(() =>
      resolveBucklingLoad({
        rodDiameterMm: 16,
        columnLengthMm: 0,
        mountingStyle: "fixed-supported",
      }),
    ).toThrow(GuidedCylinderSizingInputError);
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
    ).toThrow(GuidedCylinderSizingInputError);
  });
});

describe("resolveRequiredMoment", () => {
  it("computes each axis moment as F * d (mm converted to m)", () => {
    const { rollMomentNm, pitchMomentNm, yawMomentNm } = resolveRequiredMoment({
      lateralForceN: 1000,
      rollOffsetMm: 50,
      pitchOffsetMm: 30,
      yawOffsetMm: 20,
    });
    expect(rollMomentNm).toBeCloseTo(1000 * (50 / 1000), 9);
    expect(pitchMomentNm).toBeCloseTo(1000 * (30 / 1000), 9);
    expect(yawMomentNm).toBeCloseTo(1000 * (20 / 1000), 9);
  });

  it("combines the three components as a Euclidean sum", () => {
    const { rollMomentNm, pitchMomentNm, yawMomentNm, requiredMomentNm } =
      resolveRequiredMoment({
        lateralForceN: 1000,
        rollOffsetMm: 50,
        pitchOffsetMm: 30,
        yawOffsetMm: 20,
      });
    const expected = Math.sqrt(
      rollMomentNm ** 2 + pitchMomentNm ** 2 + yawMomentNm ** 2,
    );
    expect(requiredMomentNm).toBeCloseTo(expected, 9);
  });

  it("is zero when every offset is zero", () => {
    const { requiredMomentNm } = resolveRequiredMoment({
      lateralForceN: 1000,
      rollOffsetMm: 0,
      pitchOffsetMm: 0,
      yawOffsetMm: 0,
    });
    expect(requiredMomentNm).toBe(0);
  });

  it("is zero when the lateral force is zero, regardless of offsets", () => {
    const { requiredMomentNm } = resolveRequiredMoment({
      lateralForceN: 0,
      rollOffsetMm: 50,
      pitchOffsetMm: 30,
      yawOffsetMm: 20,
    });
    expect(requiredMomentNm).toBe(0);
  });

  it("is monotonically non-decreasing in each offset", () => {
    const base = resolveRequiredMoment({
      lateralForceN: 500,
      rollOffsetMm: 10,
      pitchOffsetMm: 10,
      yawOffsetMm: 10,
    });
    const larger = resolveRequiredMoment({
      lateralForceN: 500,
      rollOffsetMm: 20,
      pitchOffsetMm: 10,
      yawOffsetMm: 10,
    });
    expect(larger.requiredMomentNm).toBeGreaterThan(base.requiredMomentNm);
  });

  it("rejects a negative lateral force or offset", () => {
    expect(() =>
      resolveRequiredMoment({
        lateralForceN: -1,
        rollOffsetMm: 10,
        pitchOffsetMm: 10,
        yawOffsetMm: 10,
      }),
    ).toThrow(GuidedCylinderSizingInputError);
    expect(() =>
      resolveRequiredMoment({
        lateralForceN: 500,
        rollOffsetMm: -10,
        pitchOffsetMm: 10,
        yawOffsetMm: 10,
      }),
    ).toThrow(GuidedCylinderSizingInputError);
  });
});
