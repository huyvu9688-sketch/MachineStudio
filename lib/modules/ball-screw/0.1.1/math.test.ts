import { describe, expect, it } from "vitest";
import {
  BallScrewInputError,
  resolveBucklingLoad,
  resolveDriveTorque,
  resolveEquivalentDynamicLoad,
  resolveCriticalSpeed,
  resolveLifeHours,
  resolveNominalLife,
  resolvePermissibleMeanLoad,
  resolveRotationalSpeed,
  resolveStaticSafetyFactor,
  type DutyCyclePhase,
} from "./math";

// Rockford Ball Screw, "How To Size A Ball Screw" (rockfordballscrew.com),
// full worked example (steps 1-11): R40 screw, .84" root diameter, .250"
// lead, 41.347" between bearings, Fixed-Simple end fixity, 500 lbf thrust,
// 90% efficiency. Converted to SI once here and reused by the reference-
// example tests below, so each test shows its own conversion arithmetic
// rather than a shared magic number.
const ROCKFORD_EXAMPLE = {
  rootDiameterM: 0.84 * 0.0254,
  unsupportedLengthM: 41.347 * 0.0254,
  leadM: 0.25 * 0.0254,
  thrustLbf: 500,
  thrustN: 500 * 4.4482216152605,
  efficiency: 0.9,
} as const;

describe("resolveRotationalSpeed", () => {
  it("resolves N = v / P", () => {
    const result = resolveRotationalSpeed({
      linearVelocityMps: 0.5,
      leadM: 0.01,
    });
    expect(result.rotationalSpeedRevPerS).toBeCloseTo(50, 12);
    expect(result.rotationalSpeedRevPerMin).toBeCloseTo(3000, 9);
  });

  it("scales linearly with velocity", () => {
    const base = resolveRotationalSpeed({
      linearVelocityMps: 0.2,
      leadM: 0.005,
    });
    const doubled = resolveRotationalSpeed({
      linearVelocityMps: 0.4,
      leadM: 0.005,
    });
    expect(doubled.rotationalSpeedRevPerS).toBeCloseTo(
      2 * base.rotationalSpeedRevPerS,
      9,
    );
  });

  it("inverts consistently: v = N * P", () => {
    const input = { linearVelocityMps: 0.37, leadM: 0.02 };
    const result = resolveRotationalSpeed(input);
    expect(result.rotationalSpeedRevPerS * input.leadM).toBeCloseTo(
      input.linearVelocityMps,
      12,
    );
  });

  it("rejects non-positive or non-finite inputs", () => {
    expect(() =>
      resolveRotationalSpeed({ linearVelocityMps: 0, leadM: 0.01 }),
    ).toThrow(BallScrewInputError);
    expect(() =>
      resolveRotationalSpeed({ linearVelocityMps: -1, leadM: 0.01 }),
    ).toThrow(BallScrewInputError);
    expect(() =>
      resolveRotationalSpeed({ linearVelocityMps: 0.5, leadM: 0 }),
    ).toThrow(BallScrewInputError);
    expect(() =>
      resolveRotationalSpeed({
        linearVelocityMps: Number.NaN,
        leadM: 0.01,
      }),
    ).toThrow(BallScrewInputError);
  });
});

describe("resolveDriveTorque", () => {
  it("vanishes the preload-friction term when preload is zero", () => {
    const result = resolveDriveTorque({
      axialForceN: 1000,
      leadM: 0.01,
      efficiency: 0.9,
      preloadN: 0,
      internalFrictionCoefficient: 0.2,
      gearRatio: 1,
    });
    const expected = (1000 * 0.01) / (2 * Math.PI * 0.9);
    expect(result.loadTorqueNm).toBeCloseTo(expected, 9);
  });

  it("matches F*P/(2*pi) when efficiency is 1 and preload is zero", () => {
    const result = resolveDriveTorque({
      axialForceN: 500,
      leadM: 0.005,
      efficiency: 1,
      preloadN: 0,
      internalFrictionCoefficient: 0,
      gearRatio: 1,
    });
    expect(result.loadTorqueNm).toBeCloseTo((500 * 0.005) / (2 * Math.PI), 12);
  });

  it("adds a positive preload-friction contribution", () => {
    const withoutPreload = resolveDriveTorque({
      axialForceN: 500,
      leadM: 0.005,
      efficiency: 0.9,
      preloadN: 0,
      internalFrictionCoefficient: 0.2,
      gearRatio: 1,
    });
    const withPreload = resolveDriveTorque({
      axialForceN: 500,
      leadM: 0.005,
      efficiency: 0.9,
      preloadN: 150,
      internalFrictionCoefficient: 0.2,
      gearRatio: 1,
    });
    expect(withPreload.loadTorqueNm).toBeGreaterThan(
      withoutPreload.loadTorqueNm,
    );
  });

  it("scales torque inversely with gear ratio", () => {
    const direct = resolveDriveTorque({
      axialForceN: 800,
      leadM: 0.01,
      efficiency: 0.9,
      preloadN: 100,
      internalFrictionCoefficient: 0.2,
      gearRatio: 1,
    });
    const geared = resolveDriveTorque({
      axialForceN: 800,
      leadM: 0.01,
      efficiency: 0.9,
      preloadN: 100,
      internalFrictionCoefficient: 0.2,
      gearRatio: 2,
    });
    expect(geared.loadTorqueNm).toBeCloseTo(direct.loadTorqueNm / 2, 9);
  });

  it("0.1.1: reports the magnitude, not a negative value, for an assisting (negative) axial force", () => {
    // A vertical axis with an overhauling/assisting load produces a negative
    // axialForceN — the drive must still supply the same torque *capacity*
    // to hold/control it, matching screw.drive_torque's own registry range
    // (min: 0). See math.ts's own doc comment on resolveDriveTorque.
    const negative = resolveDriveTorque({
      axialForceN: -500,
      leadM: 0.005,
      efficiency: 1,
      preloadN: 0,
      internalFrictionCoefficient: 0,
      gearRatio: 1,
    });
    const positive = resolveDriveTorque({
      axialForceN: 500,
      leadM: 0.005,
      efficiency: 1,
      preloadN: 0,
      internalFrictionCoefficient: 0,
      gearRatio: 1,
    });
    expect(negative.loadTorqueNm).toBeGreaterThanOrEqual(0);
    expect(negative.loadTorqueNm).toBeCloseTo(positive.loadTorqueNm, 12);
  });

  it("0.1.1: still reports the magnitude when the combined drive-plus-preload-friction term goes negative", () => {
    // A small negative axial force whose magnitude is smaller than the
    // (always-positive) preload-friction term would otherwise let the sum
    // land negative before the fix.
    const result = resolveDriveTorque({
      axialForceN: -10,
      leadM: 0.005,
      efficiency: 0.9,
      preloadN: 500,
      internalFrictionCoefficient: 0.2,
      gearRatio: 1,
    });
    expect(result.loadTorqueNm).toBeGreaterThanOrEqual(0);
  });

  it("rejects invalid inputs", () => {
    const valid = {
      axialForceN: 500,
      leadM: 0.005,
      efficiency: 0.9,
      preloadN: 100,
      internalFrictionCoefficient: 0.2,
      gearRatio: 1,
    };
    expect(() => resolveDriveTorque({ ...valid, leadM: 0 })).toThrow(
      BallScrewInputError,
    );
    expect(() => resolveDriveTorque({ ...valid, efficiency: 0 })).toThrow(
      BallScrewInputError,
    );
    expect(() => resolveDriveTorque({ ...valid, efficiency: 1.1 })).toThrow(
      BallScrewInputError,
    );
    expect(() => resolveDriveTorque({ ...valid, preloadN: -1 })).toThrow(
      BallScrewInputError,
    );
    expect(() =>
      resolveDriveTorque({ ...valid, internalFrictionCoefficient: -0.1 }),
    ).toThrow(BallScrewInputError);
    expect(() => resolveDriveTorque({ ...valid, gearRatio: 0 })).toThrow(
      BallScrewInputError,
    );
  });

  it("is close to Rockford Ball Screw's published worked example (23 in-lbs)", () => {
    // Source states "Td = .177 * Sl * Pt" and prints "= 23 in.lbs", but its
    // own shown arithmetic (.177 * 500 * .250) is 22.125, not 23 — the
    // source's own final rounding is inconsistent with its own formula, not
    // a sign our formula is off. Cross-checked against the more precise
    // 1/(2*pi*0.9) = 0.17683 instead of the source's rounded 0.177.
    const result = resolveDriveTorque({
      axialForceN: ROCKFORD_EXAMPLE.thrustN,
      leadM: ROCKFORD_EXAMPLE.leadM,
      efficiency: ROCKFORD_EXAMPLE.efficiency,
      preloadN: 0,
      internalFrictionCoefficient: 0,
      gearRatio: 1,
    });
    const inLbsPerNm = 1 / 0.1129848333;
    expect(result.loadTorqueNm * inLbsPerNm).toBeCloseTo(22.1, 1);
  });

  it("matches THK's published worked example (120 N.mm, no preload)", () => {
    // THK Ball Screw General Catalog, "Examples of Selecting a Ball Screw" —
    // "High-speed Transfer Equipment (Horizontal Use)": model WTF2040-2,
    // lead Ph = 40 mm, efficiency eta = 0.9, no preload ("The Ball Screw is
    // not provided with a preload"), direct coupling (gear ratio A = 1),
    // applied axial load during forward uniform motion Fa2 = 17 N. Printed:
    // "T1 = Fa*Ph/(2*pi*eta)*A = 17*40/(2*pi*0.9)*1 = 120 N.mm" — a genuinely
    // independent third source (THK, not Oriental Motor or Rockford) for the
    // same F*P/(2*pi*eta) drive-torque term. Read directly 2026-08-09 via a
    // third-party mirror (tech.thk.com itself returns HTTP 403 in this
    // environment) — see lib/standards/engineering-sources.ts
    // "jp.thk.example_ball_screw_selection@bondy-mirror-2026-08-09".
    const result = resolveDriveTorque({
      axialForceN: 17,
      leadM: 0.04,
      efficiency: 0.9,
      preloadN: 0,
      internalFrictionCoefficient: 0,
      gearRatio: 1,
    });
    expect(result.loadTorqueNm * 1000).toBeCloseTo(120, 0);
  });
});

describe("resolveEquivalentDynamicLoad", () => {
  it("reduces a single phase to its own load and speed", () => {
    const result = resolveEquivalentDynamicLoad([
      {
        timeFraction: 1,
        rotationalSpeedRevPerMin: 500,
        axialLoadMagnitudeN: 800,
      },
    ]);
    expect(result.equivalentLoadN).toBeCloseTo(800, 9);
    expect(result.meanRotationalSpeedRevPerMin).toBeCloseTo(500, 9);
  });

  it("reduces identical-load phases to that same load regardless of weighting", () => {
    const result = resolveEquivalentDynamicLoad([
      {
        timeFraction: 0.3,
        rotationalSpeedRevPerMin: 400,
        axialLoadMagnitudeN: 600,
      },
      {
        timeFraction: 0.7,
        rotationalSpeedRevPerMin: 900,
        axialLoadMagnitudeN: 600,
      },
    ]);
    expect(result.equivalentLoadN).toBeCloseTo(600, 9);
  });

  it("leaves the equivalent load unaffected by an added zero-speed (holding) phase, however large its load", () => {
    // A zero-speed phase contributes zero weight (q_i * n_i = 0) to F_m's
    // own weighted sum, so it cannot move the equivalent load — but it does
    // add to sum(q_i), diluting the time-weighted mean rotational speed.
    // The two outputs are independent in that respect; only F_m is expected
    // to hold still here.
    const withoutHold = resolveEquivalentDynamicLoad([
      {
        timeFraction: 0.5,
        rotationalSpeedRevPerMin: 300,
        axialLoadMagnitudeN: 500,
      },
      {
        timeFraction: 0.5,
        rotationalSpeedRevPerMin: 600,
        axialLoadMagnitudeN: 900,
      },
    ]);
    const withHold = resolveEquivalentDynamicLoad([
      {
        timeFraction: 0.5,
        rotationalSpeedRevPerMin: 300,
        axialLoadMagnitudeN: 500,
      },
      {
        timeFraction: 0.5,
        rotationalSpeedRevPerMin: 600,
        axialLoadMagnitudeN: 900,
      },
      {
        timeFraction: 0.2,
        rotationalSpeedRevPerMin: 0,
        axialLoadMagnitudeN: 5000,
      },
    ]);
    expect(withHold.equivalentLoadN).toBeCloseTo(
      withoutHold.equivalentLoadN,
      9,
    );
    expect(withHold.meanRotationalSpeedRevPerMin).toBeLessThan(
      withoutHold.meanRotationalSpeedRevPerMin,
    );
  });

  it("weights mean rotational speed by time fraction", () => {
    const result = resolveEquivalentDynamicLoad([
      {
        timeFraction: 0.5,
        rotationalSpeedRevPerMin: 200,
        axialLoadMagnitudeN: 100,
      },
      {
        timeFraction: 0.5,
        rotationalSpeedRevPerMin: 800,
        axialLoadMagnitudeN: 100,
      },
    ]);
    expect(result.meanRotationalSpeedRevPerMin).toBeCloseTo(500, 9);
  });

  it("increases the equivalent load when a high-load phase gets more weight", () => {
    const phases = (heavyWeight: number): DutyCyclePhase[] => [
      {
        timeFraction: heavyWeight,
        rotationalSpeedRevPerMin: 500,
        axialLoadMagnitudeN: 1000,
      },
      {
        timeFraction: 1 - heavyWeight,
        rotationalSpeedRevPerMin: 500,
        axialLoadMagnitudeN: 200,
      },
    ];
    const lightWeighted = resolveEquivalentDynamicLoad(phases(0.2));
    const heavyWeighted = resolveEquivalentDynamicLoad(phases(0.8));
    expect(heavyWeighted.equivalentLoadN).toBeGreaterThan(
      lightWeighted.equivalentLoadN,
    );
  });

  it("rejects an empty phase list", () => {
    expect(() => resolveEquivalentDynamicLoad([])).toThrow(BallScrewInputError);
  });

  it("rejects a phase list where the screw never rotates under load", () => {
    expect(() =>
      resolveEquivalentDynamicLoad([
        {
          timeFraction: 1,
          rotationalSpeedRevPerMin: 0,
          axialLoadMagnitudeN: 500,
        },
      ]),
    ).toThrow(BallScrewInputError);
  });

  it("rejects invalid per-phase inputs", () => {
    expect(() =>
      resolveEquivalentDynamicLoad([
        {
          timeFraction: -0.1,
          rotationalSpeedRevPerMin: 500,
          axialLoadMagnitudeN: 100,
        },
      ]),
    ).toThrow(BallScrewInputError);
    expect(() =>
      resolveEquivalentDynamicLoad([
        {
          timeFraction: 1.5,
          rotationalSpeedRevPerMin: 500,
          axialLoadMagnitudeN: 100,
        },
      ]),
    ).toThrow(BallScrewInputError);
    expect(() =>
      resolveEquivalentDynamicLoad([
        {
          timeFraction: 1,
          rotationalSpeedRevPerMin: -1,
          axialLoadMagnitudeN: 100,
        },
      ]),
    ).toThrow(BallScrewInputError);
    expect(() =>
      resolveEquivalentDynamicLoad([
        {
          timeFraction: 1,
          rotationalSpeedRevPerMin: 500,
          axialLoadMagnitudeN: -1,
        },
      ]),
    ).toThrow(BallScrewInputError);
  });
});

describe("resolveNominalLife and resolvePermissibleMeanLoad", () => {
  it("computes L10 = (Ca/Fm)^3 * 1e6", () => {
    const result = resolveNominalLife({
      dynamicLoadRatingN: 10_000,
      equivalentLoadN: 1000,
    });
    expect(result.lifeRevolutions).toBeCloseTo(10 ** 3 * 1e6, 3);
  });

  it("is the exact algebraic inverse of resolvePermissibleMeanLoad", () => {
    const dynamicLoadRatingN = 8000;
    const equivalentLoadN = 1250;
    const life = resolveNominalLife({ dynamicLoadRatingN, equivalentLoadN });
    const permissible = resolvePermissibleMeanLoad({
      dynamicLoadRatingN,
      targetLifeRevolutions: life.lifeRevolutions,
    });
    expect(permissible.permissibleMeanLoadN).toBeCloseTo(equivalentLoadN, 6);
  });

  it("increases life when the load capacity increases", () => {
    const lower = resolveNominalLife({
      dynamicLoadRatingN: 5000,
      equivalentLoadN: 1000,
    });
    const higher = resolveNominalLife({
      dynamicLoadRatingN: 8000,
      equivalentLoadN: 1000,
    });
    expect(higher.lifeRevolutions).toBeGreaterThan(lower.lifeRevolutions);
  });

  it("decreases life when the equivalent load increases", () => {
    const lower = resolveNominalLife({
      dynamicLoadRatingN: 5000,
      equivalentLoadN: 1000,
    });
    const higher = resolveNominalLife({
      dynamicLoadRatingN: 5000,
      equivalentLoadN: 2000,
    });
    expect(higher.lifeRevolutions).toBeLessThan(lower.lifeRevolutions);
  });

  it("rejects non-positive inputs", () => {
    expect(() =>
      resolveNominalLife({ dynamicLoadRatingN: 0, equivalentLoadN: 1000 }),
    ).toThrow(BallScrewInputError);
    expect(() =>
      resolveNominalLife({ dynamicLoadRatingN: 5000, equivalentLoadN: -1 }),
    ).toThrow(BallScrewInputError);
    expect(() =>
      resolvePermissibleMeanLoad({
        dynamicLoadRatingN: 5000,
        targetLifeRevolutions: 0,
      }),
    ).toThrow(BallScrewInputError);
  });

  it("matches THK's published worked example (WTF2040-2, L = 4.1e9 rev)", () => {
    // THK Ball Screw General Catalog, "Examples of Selecting a Ball Screw" —
    // same "High-speed Transfer Equipment" example as the drive-torque test
    // above. Model WTF2040-2: dynamic load rating Ca = 5400 N (5.4 kN).
    // THK's own printed average axial load is Fm = 225 N, but its life
    // formula applies an additional printed "load factor fw = 1.5" before
    // the standard cubic life law: "L = (Ca / (fw*Fm))^3 * 1e6" — this
    // kernel's resolveNominalLife does not itself apply any such factor (no
    // source has confirmed one belongs in the formula this kernel
    // implements; see this file's own module doc comment), so this test
    // feeds the already-fw-adjusted load (fw * Fm = 1.5 * 225 = 337.5 N) as
    // equivalentLoadN to reproduce THK's own printed result — a documented
    // input adaptation, not a claim that resolveNominalLife implements fw.
    // Read directly 2026-08-09 — see lib/standards/engineering-sources.ts
    // "jp.thk.example_ball_screw_selection@bondy-mirror-2026-08-09".
    const result = resolveNominalLife({
      dynamicLoadRatingN: 5400,
      equivalentLoadN: 1.5 * 225,
    });
    expect(result.lifeRevolutions / 1e9).toBeCloseTo(4.1, 1);
  });
});

describe("resolveLifeHours", () => {
  it("converts revolutions to hours: Lh = L10 / (nm * 60)", () => {
    const result = resolveLifeHours({
      lifeRevolutions: 6e7,
      meanRotationalSpeedRevPerMin: 1000,
    });
    expect(result.lifeHours).toBeCloseTo(1000, 6);
  });

  it("rejects non-positive inputs", () => {
    expect(() =>
      resolveLifeHours({
        lifeRevolutions: 0,
        meanRotationalSpeedRevPerMin: 1000,
      }),
    ).toThrow(BallScrewInputError);
    expect(() =>
      resolveLifeHours({
        lifeRevolutions: 6e7,
        meanRotationalSpeedRevPerMin: 0,
      }),
    ).toThrow(BallScrewInputError);
  });
});

describe("resolveCriticalSpeed", () => {
  it("reproduces Rockford Ball Screw's published worked example (687 in/min)", () => {
    // Source (step 6/7): Fe=1.47 (Fixed-Simple), Dmin=.84in, L=41.347in,
    // lead=.250in, Fs=0.8 -> Cs = 687 in/min (a LINEAR speed). This kernel
    // returns rotational speed; converting the permissible rotational
    // result back to linear (rev/min * lead) must reproduce that figure.
    const result = resolveCriticalSpeed({
      rootDiameterM: ROCKFORD_EXAMPLE.rootDiameterM,
      unsupportedLengthM: ROCKFORD_EXAMPLE.unsupportedLengthM,
      endSupportArrangement: "fixed-supported",
    });
    const permissibleLinearSpeedInPerMin =
      (result.permissibleSpeedRevPerMin * ROCKFORD_EXAMPLE.leadM) / 0.0254;
    // Whole-number catalog rounding tolerance, same convention as
    // thk-reference-examples.test.ts's +-1 N.
    expect(Math.abs(permissibleLinearSpeedInPerMin - 687)).toBeLessThan(1);
  });

  it("applies exactly an 0.8 operating margin", () => {
    const result = resolveCriticalSpeed({
      rootDiameterM: 0.02,
      unsupportedLengthM: 1,
      endSupportArrangement: "supported-supported",
    });
    expect(result.permissibleSpeedRevPerMin).toBeCloseTo(
      0.8 * result.criticalSpeedRevPerMin,
      9,
    );
  });

  it("increases with a larger root diameter and a shorter unsupported length", () => {
    const base = resolveCriticalSpeed({
      rootDiameterM: 0.02,
      unsupportedLengthM: 1,
      endSupportArrangement: "fixed-fixed",
    });
    const thicker = resolveCriticalSpeed({
      rootDiameterM: 0.03,
      unsupportedLengthM: 1,
      endSupportArrangement: "fixed-fixed",
    });
    const shorter = resolveCriticalSpeed({
      rootDiameterM: 0.02,
      unsupportedLengthM: 0.5,
      endSupportArrangement: "fixed-fixed",
    });
    expect(thicker.criticalSpeedRevPerMin).toBeGreaterThan(
      base.criticalSpeedRevPerMin,
    );
    expect(shorter.criticalSpeedRevPerMin).toBeGreaterThan(
      base.criticalSpeedRevPerMin,
    );
  });

  it("orders end-support arrangements fixed-free < supported-supported < fixed-supported < fixed-fixed", () => {
    const speedFor = (
      endSupportArrangement: Parameters<
        typeof resolveCriticalSpeed
      >[0]["endSupportArrangement"],
    ) =>
      resolveCriticalSpeed({
        rootDiameterM: 0.02,
        unsupportedLengthM: 1,
        endSupportArrangement,
      }).criticalSpeedRevPerMin;

    expect(speedFor("fixed-free")).toBeLessThan(
      speedFor("supported-supported"),
    );
    expect(speedFor("supported-supported")).toBeLessThan(
      speedFor("fixed-supported"),
    );
    expect(speedFor("fixed-supported")).toBeLessThan(speedFor("fixed-fixed"));
  });

  it("rejects non-positive inputs", () => {
    expect(() =>
      resolveCriticalSpeed({
        rootDiameterM: 0,
        unsupportedLengthM: 1,
        endSupportArrangement: "fixed-fixed",
      }),
    ).toThrow(BallScrewInputError);
    expect(() =>
      resolveCriticalSpeed({
        rootDiameterM: 0.02,
        unsupportedLengthM: 0,
        endSupportArrangement: "fixed-fixed",
      }),
    ).toThrow(BallScrewInputError);
  });
});

describe("resolveBucklingLoad", () => {
  it("matches Rockford Ball Screw's published raw and Fs-adjusted figures", () => {
    // Source (step 9): Fe=2.00 (Fixed-Simple), Dmin=.84in, L=41.347in,
    // Fs=0.8 -> Pc = 6,537 lbf (already Fs-adjusted in the source's own
    // print). This kernel's own `permissibleCompressiveLoadN` uses a
    // different, more conservative 0.5 margin (Steinmeyer's, not
    // Rockford's) — a documented discrepancy, not a bug — so the raw
    // (unfactored) figure is what's directly comparable, and the source's
    // own 0.8 margin is applied here explicitly to reproduce its printed
    // number.
    const result = resolveBucklingLoad({
      rootDiameterM: ROCKFORD_EXAMPLE.rootDiameterM,
      unsupportedLengthM: ROCKFORD_EXAMPLE.unsupportedLengthM,
      endSupportArrangement: "fixed-supported",
    });
    const rockfordFsAdjustedLbf =
      (0.8 * result.bucklingLoadN) / 4.4482216152605;
    expect(rockfordFsAdjustedLbf).toBeCloseTo(6537, 0);
  });

  it("applies exactly a 0.5 permissible-load margin", () => {
    const result = resolveBucklingLoad({
      rootDiameterM: 0.02,
      unsupportedLengthM: 1,
      endSupportArrangement: "fixed-free",
    });
    expect(result.permissibleCompressiveLoadN).toBeCloseTo(
      0.5 * result.bucklingLoadN,
      6,
    );
  });

  it("scales with the fourth power of root diameter", () => {
    const base = resolveBucklingLoad({
      rootDiameterM: 0.02,
      unsupportedLengthM: 1,
      endSupportArrangement: "fixed-fixed",
    });
    const doubled = resolveBucklingLoad({
      rootDiameterM: 0.04,
      unsupportedLengthM: 1,
      endSupportArrangement: "fixed-fixed",
    });
    expect(doubled.bucklingLoadN).toBeCloseTo(16 * base.bucklingLoadN, 3);
  });

  it("orders end-support arrangements fixed-free < supported-supported < fixed-supported < fixed-fixed", () => {
    const loadFor = (
      endSupportArrangement: Parameters<
        typeof resolveBucklingLoad
      >[0]["endSupportArrangement"],
    ) =>
      resolveBucklingLoad({
        rootDiameterM: 0.02,
        unsupportedLengthM: 1,
        endSupportArrangement,
      }).bucklingLoadN;

    expect(loadFor("fixed-free")).toBeLessThan(loadFor("supported-supported"));
    expect(loadFor("supported-supported")).toBeLessThan(
      loadFor("fixed-supported"),
    );
    expect(loadFor("fixed-supported")).toBeLessThan(loadFor("fixed-fixed"));
  });

  it("rejects non-positive inputs", () => {
    expect(() =>
      resolveBucklingLoad({
        rootDiameterM: 0,
        unsupportedLengthM: 1,
        endSupportArrangement: "fixed-fixed",
      }),
    ).toThrow(BallScrewInputError);
    expect(() =>
      resolveBucklingLoad({
        rootDiameterM: 0.02,
        unsupportedLengthM: 0,
        endSupportArrangement: "fixed-fixed",
      }),
    ).toThrow(BallScrewInputError);
  });
});

describe("resolveStaticSafetyFactor", () => {
  it("computes fs = C0 / Fas_max", () => {
    const result = resolveStaticSafetyFactor({
      staticLoadRatingN: 9000,
      appliedLoadN: 3000,
    });
    expect(result.staticSafetyFactor).toBeCloseTo(3, 12);
  });

  it("decreases as the applied load increases", () => {
    const lighter = resolveStaticSafetyFactor({
      staticLoadRatingN: 9000,
      appliedLoadN: 1000,
    });
    const heavier = resolveStaticSafetyFactor({
      staticLoadRatingN: 9000,
      appliedLoadN: 3000,
    });
    expect(heavier.staticSafetyFactor).toBeLessThan(lighter.staticSafetyFactor);
  });

  it("rejects non-positive inputs", () => {
    expect(() =>
      resolveStaticSafetyFactor({ staticLoadRatingN: 0, appliedLoadN: 1000 }),
    ).toThrow(BallScrewInputError);
    expect(() =>
      resolveStaticSafetyFactor({ staticLoadRatingN: 9000, appliedLoadN: 0 }),
    ).toThrow(BallScrewInputError);
    expect(() =>
      resolveStaticSafetyFactor({
        staticLoadRatingN: 9000,
        appliedLoadN: -1000,
      }),
    ).toThrow(BallScrewInputError);
  });

  it("matches THK's published worked example (WTF2040-2, fs = 2.5)", () => {
    // THK Ball Screw General Catalog, "Examples of Selecting a Ball Screw" —
    // same "High-speed Transfer Equipment" example as the drive-torque and
    // life tests above. Model WTF2040-2: static load rating C0a = 13.6 kN.
    // THK sets a target fs = 2.5 (an engineering choice for an application
    // with impact loading during deceleration) and derives the permissible
    // axial load from it: "C0a/fs = 13.6/2.5 = 5.44 kN = 5440 N" — the exact
    // algebraic inverse of this kernel's fs = C0/Fas_max. Feeding THK's own
    // two printed numbers (C0a and its own derived permissible load) back
    // into resolveStaticSafetyFactor must reproduce THK's own assumed fs
    // exactly. Read directly 2026-08-09 — see
    // lib/standards/engineering-sources.ts
    // "jp.thk.example_ball_screw_selection@bondy-mirror-2026-08-09".
    const result = resolveStaticSafetyFactor({
      staticLoadRatingN: 13_600,
      appliedLoadN: 5440,
    });
    expect(result.staticSafetyFactor).toBeCloseTo(2.5, 6);
  });
});
