import { describe, expect, it } from "vitest";
import { MechanicsInputError } from "./errors";
import {
  hollowCylinderInertia,
  hollowCylinderInertiaFromDensity,
  linearMotionInertia,
  offsetAxisInertia,
  pointMassInertia,
  rectangularPillarInertia,
  solidCylinderInertia,
  solidCylinderInertiaFromDensity,
} from "./inertia";

// Densities used below are ordinary engineering values (steel ~7850 kg/m^3),
// chosen only to exercise the density forms; nothing here depends on the exact
// material.
const STEEL_DENSITY_KG_PER_M3 = 7850;

describe("pointMassInertia", () => {
  it("returns m*L^2", () => {
    expect(
      pointMassInertia({ massKg: 4, radiusM: 0.5 }).inertiaKgM2,
    ).toBeCloseTo(1, 12);
  });

  it("allows a zero radius (mass on the axis of rotation)", () => {
    expect(pointMassInertia({ massKg: 4, radiusM: 0 }).inertiaKgM2).toBe(0);
  });

  it("rejects a non-positive mass", () => {
    expect(() => pointMassInertia({ massKg: 0, radiusM: 0.5 })).toThrow(
      MechanicsInputError,
    );
  });

  it("rejects a negative radius", () => {
    expect(() => pointMassInertia({ massKg: 4, radiusM: -0.1 })).toThrow(
      MechanicsInputError,
    );
  });
});

describe("solidCylinderInertia", () => {
  it("returns (1/8)*m*D1^2", () => {
    const { inertiaKgM2 } = solidCylinderInertia({
      massKg: 2,
      outerDiameterM: 0.04,
    });
    expect(inertiaKgM2).toBeCloseTo(0.0004, 12);
  });

  it("agrees with the textbook radius form (1/2)*m*r^2", () => {
    const massKg = 3.7;
    const radiusM = 0.031;
    const { inertiaKgM2 } = solidCylinderInertia({
      massKg,
      outerDiameterM: 2 * radiusM,
    });
    expect(inertiaKgM2).toBeCloseTo(0.5 * massKg * radiusM ** 2, 12);
  });

  it("scales with the square of the diameter", () => {
    const base = solidCylinderInertia({
      massKg: 1,
      outerDiameterM: 0.05,
    }).inertiaKgM2;
    const doubled = solidCylinderInertia({
      massKg: 1,
      outerDiameterM: 0.1,
    }).inertiaKgM2;
    expect(doubled / base).toBeCloseTo(4, 12);
  });

  it("rejects a non-positive diameter", () => {
    expect(() =>
      solidCylinderInertia({ massKg: 2, outerDiameterM: 0 }),
    ).toThrow(MechanicsInputError);
  });

  it("rejects a non-finite mass", () => {
    expect(() =>
      solidCylinderInertia({ massKg: Number.NaN, outerDiameterM: 0.04 }),
    ).toThrow(MechanicsInputError);
  });
});

describe("solidCylinderInertiaFromDensity", () => {
  it("returns (pi/32)*rho*L*D1^4", () => {
    const { inertiaKgM2 } = solidCylinderInertiaFromDensity({
      densityKgPerM3: STEEL_DENSITY_KG_PER_M3,
      lengthM: 0.5,
      outerDiameterM: 0.02,
    });
    expect(inertiaKgM2).toBeCloseTo(
      (Math.PI / 32) * STEEL_DENSITY_KG_PER_M3 * 0.5 * 0.02 ** 4,
      15,
    );
  });

  it("is identical to the mass form when the mass is the cylinder's own", () => {
    const densityKgPerM3 = STEEL_DENSITY_KG_PER_M3;
    const lengthM = 0.42;
    const outerDiameterM = 0.025;
    const massKg =
      densityKgPerM3 * ((Math.PI * outerDiameterM ** 2) / 4) * lengthM;

    expect(
      solidCylinderInertiaFromDensity({
        densityKgPerM3,
        lengthM,
        outerDiameterM,
      }).inertiaKgM2,
    ).toBeCloseTo(
      solidCylinderInertia({ massKg, outerDiameterM }).inertiaKgM2,
      15,
    );
  });

  it("rejects a non-positive length", () => {
    expect(() =>
      solidCylinderInertiaFromDensity({
        densityKgPerM3: STEEL_DENSITY_KG_PER_M3,
        lengthM: 0,
        outerDiameterM: 0.02,
      }),
    ).toThrow(MechanicsInputError);
  });
});

describe("hollowCylinderInertia", () => {
  it("returns (1/8)*m*(D1^2 + D2^2)", () => {
    const { inertiaKgM2 } = hollowCylinderInertia({
      massKg: 2,
      outerDiameterM: 0.04,
      innerDiameterM: 0.02,
    });
    expect(inertiaKgM2).toBeCloseTo((2 * (0.04 ** 2 + 0.02 ** 2)) / 8, 15);
  });

  it("degrades to the solid cylinder as the bore approaches zero", () => {
    const solid = solidCylinderInertia({
      massKg: 2,
      outerDiameterM: 0.04,
    }).inertiaKgM2;
    const nearlySolid = hollowCylinderInertia({
      massKg: 2,
      outerDiameterM: 0.04,
      innerDiameterM: 1e-9,
    }).inertiaKgM2;
    expect(nearlySolid).toBeCloseTo(solid, 12);
  });

  it("is larger than a solid cylinder of the same mass and outer diameter", () => {
    const solid = solidCylinderInertia({
      massKg: 2,
      outerDiameterM: 0.04,
    }).inertiaKgM2;
    const hollow = hollowCylinderInertia({
      massKg: 2,
      outerDiameterM: 0.04,
      innerDiameterM: 0.03,
    }).inertiaKgM2;
    expect(hollow).toBeGreaterThan(solid);
  });

  it("rejects an inner diameter that is not smaller than the outer diameter", () => {
    expect(() =>
      hollowCylinderInertia({
        massKg: 2,
        outerDiameterM: 0.04,
        innerDiameterM: 0.04,
      }),
    ).toThrow(MechanicsInputError);
  });

  it("rejects a negative inner diameter", () => {
    expect(() =>
      hollowCylinderInertia({
        massKg: 2,
        outerDiameterM: 0.04,
        innerDiameterM: -0.01,
      }),
    ).toThrow(MechanicsInputError);
  });
});

describe("hollowCylinderInertiaFromDensity", () => {
  it("returns (pi/32)*rho*L*(D1^4 - D2^4)", () => {
    const { inertiaKgM2 } = hollowCylinderInertiaFromDensity({
      densityKgPerM3: STEEL_DENSITY_KG_PER_M3,
      lengthM: 0.3,
      outerDiameterM: 0.05,
      innerDiameterM: 0.03,
    });
    expect(inertiaKgM2).toBeCloseTo(
      (Math.PI / 32) * STEEL_DENSITY_KG_PER_M3 * 0.3 * (0.05 ** 4 - 0.03 ** 4),
      15,
    );
  });

  it("is identical to the mass form when the mass is the tube's own", () => {
    const densityKgPerM3 = STEEL_DENSITY_KG_PER_M3;
    const lengthM = 0.3;
    const outerDiameterM = 0.05;
    const innerDiameterM = 0.03;
    const massKg =
      densityKgPerM3 *
      ((Math.PI * (outerDiameterM ** 2 - innerDiameterM ** 2)) / 4) *
      lengthM;

    expect(
      hollowCylinderInertiaFromDensity({
        densityKgPerM3,
        lengthM,
        outerDiameterM,
        innerDiameterM,
      }).inertiaKgM2,
    ).toBeCloseTo(
      hollowCylinderInertia({ massKg, outerDiameterM, innerDiameterM })
        .inertiaKgM2,
      15,
    );
  });
});

describe("rectangularPillarInertia", () => {
  it("returns (1/12)*m*(A^2 + B^2)", () => {
    const { inertiaKgM2 } = rectangularPillarInertia({
      massKg: 6,
      widthAM: 0.1,
      widthBM: 0.2,
    });
    expect(inertiaKgM2).toBeCloseTo((6 * (0.1 ** 2 + 0.2 ** 2)) / 12, 15);
  });

  it("is symmetric in its two cross-section widths", () => {
    const oneWay = rectangularPillarInertia({
      massKg: 6,
      widthAM: 0.1,
      widthBM: 0.2,
    }).inertiaKgM2;
    const other = rectangularPillarInertia({
      massKg: 6,
      widthAM: 0.2,
      widthBM: 0.1,
    }).inertiaKgM2;
    expect(other).toBeCloseTo(oneWay, 15);
  });

  it("rejects a non-positive width", () => {
    expect(() =>
      rectangularPillarInertia({ massKg: 6, widthAM: 0.1, widthBM: 0 }),
    ).toThrow(MechanicsInputError);
  });
});

describe("offsetAxisInertia", () => {
  it("adds the parallel-axis transfer term m*l^2", () => {
    const { inertiaKgM2 } = offsetAxisInertia({
      centroidalInertiaKgM2: 0.002,
      massKg: 3,
      offsetM: 0.05,
    });
    expect(inertiaKgM2).toBeCloseTo(0.002 + 3 * 0.05 ** 2, 15);
  });

  it("returns the centroidal inertia unchanged at zero offset", () => {
    expect(
      offsetAxisInertia({
        centroidalInertiaKgM2: 0.002,
        massKg: 3,
        offsetM: 0,
      }).inertiaKgM2,
    ).toBeCloseTo(0.002, 15);
  });

  it("matches the source's rectangular-pillar off-center form", () => {
    // Oriental Motor prints the composed result for a rectangular body:
    // Jx = Jx0 + m*l^2 = (1/12)*m*(A^2 + B^2 + 12*l^2).
    const massKg = 6;
    const widthAM = 0.1;
    const widthBM = 0.2;
    const offsetM = 0.07;

    const composed = offsetAxisInertia({
      centroidalInertiaKgM2: rectangularPillarInertia({
        massKg,
        widthAM,
        widthBM,
      }).inertiaKgM2,
      massKg,
      offsetM,
    }).inertiaKgM2;

    expect(composed).toBeCloseTo(
      (massKg * (widthAM ** 2 + widthBM ** 2 + 12 * offsetM ** 2)) / 12,
      15,
    );
  });

  it("rejects a negative centroidal inertia", () => {
    expect(() =>
      offsetAxisInertia({
        centroidalInertiaKgM2: -1e-6,
        massKg: 3,
        offsetM: 0.05,
      }),
    ).toThrow(MechanicsInputError);
  });

  it("rejects a negative offset", () => {
    expect(() =>
      offsetAxisInertia({
        centroidalInertiaKgM2: 0.002,
        massKg: 3,
        offsetM: -0.05,
      }),
    ).toThrow(MechanicsInputError);
  });
});

describe("linearMotionInertia", () => {
  it("returns m*(A/(2*pi))^2", () => {
    const { inertiaKgM2 } = linearMotionInertia({
      massKg: 40,
      travelPerRevolutionM: 0.01,
    });
    expect(inertiaKgM2).toBeCloseTo(40 * (0.01 / (2 * Math.PI)) ** 2, 15);
  });

  it("equals the point-mass form at the radius the travel implies", () => {
    const massKg = 40;
    const travelPerRevolutionM = 0.01;
    expect(
      linearMotionInertia({ massKg, travelPerRevolutionM }).inertiaKgM2,
    ).toBeCloseTo(
      pointMassInertia({
        massKg,
        radiusM: travelPerRevolutionM / (2 * Math.PI),
      }).inertiaKgM2,
      18,
    );
  });

  it("scales with the square of the travel per revolution", () => {
    const base = linearMotionInertia({
      massKg: 40,
      travelPerRevolutionM: 0.005,
    }).inertiaKgM2;
    const doubled = linearMotionInertia({
      massKg: 40,
      travelPerRevolutionM: 0.01,
    }).inertiaKgM2;
    expect(doubled / base).toBeCloseTo(4, 12);
  });

  it("rejects a non-positive travel per revolution", () => {
    expect(() =>
      linearMotionInertia({ massKg: 40, travelPerRevolutionM: 0 }),
    ).toThrow(MechanicsInputError);
  });
});

describe("dimensional consistency", () => {
  // Every formula in this package is homogeneous of degree 1 in mass and
  // degree 2 in length: scaling every length by k and the mass by c must
  // scale the resulting inertia by c*k^2. This holds independently of the
  // numeric constants, so it catches a mis-transcribed exponent that a
  // single-point check would not.
  it("scales as mass * length^2 across every mass-form shape", () => {
    const c = 3;
    const k = 2;

    const cases: readonly [number, number][] = [
      [
        pointMassInertia({ massKg: 4, radiusM: 0.5 }).inertiaKgM2,
        pointMassInertia({ massKg: 4 * c, radiusM: 0.5 * k }).inertiaKgM2,
      ],
      [
        solidCylinderInertia({ massKg: 4, outerDiameterM: 0.04 }).inertiaKgM2,
        solidCylinderInertia({
          massKg: 4 * c,
          outerDiameterM: 0.04 * k,
        }).inertiaKgM2,
      ],
      [
        hollowCylinderInertia({
          massKg: 4,
          outerDiameterM: 0.04,
          innerDiameterM: 0.02,
        }).inertiaKgM2,
        hollowCylinderInertia({
          massKg: 4 * c,
          outerDiameterM: 0.04 * k,
          innerDiameterM: 0.02 * k,
        }).inertiaKgM2,
      ],
      [
        rectangularPillarInertia({ massKg: 4, widthAM: 0.1, widthBM: 0.2 })
          .inertiaKgM2,
        rectangularPillarInertia({
          massKg: 4 * c,
          widthAM: 0.1 * k,
          widthBM: 0.2 * k,
        }).inertiaKgM2,
      ],
      [
        linearMotionInertia({ massKg: 4, travelPerRevolutionM: 0.01 })
          .inertiaKgM2,
        linearMotionInertia({
          massKg: 4 * c,
          travelPerRevolutionM: 0.01 * k,
        }).inertiaKgM2,
      ],
    ];

    for (const [base, scaled] of cases) {
      expect(scaled / base).toBeCloseTo(c * k ** 2, 10);
    }
  });

  it("scales as mass * length^2 across the density-form shapes", () => {
    // The density forms carry an extra length (the cylinder's own length), so
    // scaling every length by k scales rho*L*D^4 by k^5 — and the implied mass
    // by k^3. Holding density fixed, the inertia must scale by k^5.
    const k = 2;

    const solidBase = solidCylinderInertiaFromDensity({
      densityKgPerM3: STEEL_DENSITY_KG_PER_M3,
      lengthM: 0.3,
      outerDiameterM: 0.02,
    }).inertiaKgM2;
    const solidScaled = solidCylinderInertiaFromDensity({
      densityKgPerM3: STEEL_DENSITY_KG_PER_M3,
      lengthM: 0.3 * k,
      outerDiameterM: 0.02 * k,
    }).inertiaKgM2;
    expect(solidScaled / solidBase).toBeCloseTo(k ** 5, 10);

    const hollowBase = hollowCylinderInertiaFromDensity({
      densityKgPerM3: STEEL_DENSITY_KG_PER_M3,
      lengthM: 0.3,
      outerDiameterM: 0.05,
      innerDiameterM: 0.03,
    }).inertiaKgM2;
    const hollowScaled = hollowCylinderInertiaFromDensity({
      densityKgPerM3: STEEL_DENSITY_KG_PER_M3,
      lengthM: 0.3 * k,
      outerDiameterM: 0.05 * k,
      innerDiameterM: 0.03 * k,
    }).inertiaKgM2;
    expect(hollowScaled / hollowBase).toBeCloseTo(k ** 5, 10);
  });
});
