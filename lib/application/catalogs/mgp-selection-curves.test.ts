import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  MGP_SELECTION_CURVES,
  interpolateMgpCurve,
  selectMgpSelectionBand,
  type MgpSelectionBandInput,
  type MgpSelectionCurve,
} from "./mgp-selection-curves";

describe("selectMgpSelectionBand", () => {
  it("selects published graph 5 for the page-545 vertical example band", () => {
    expect(
      selectMgpSelectionBand({
        applicationCase: "vertical_lifter",
        bearingType: "ball_bushing",
        operatingPressureMPa: 0.5,
        requiredStrokeMm: 30,
        pistonSpeedMmPerS: 200,
        eccentricDistanceMm: 90,
      }),
    ).toMatchObject({ graph: 5, xUnit: "mm", xValue: 90 });
  });

  it("selects published graph 13 for the page-545 horizontal example band", () => {
    expect(
      selectMgpSelectionBand({
        applicationCase: "horizontal_pusher",
        bearingType: "slide",
        operatingPressureMPa: 0.5,
        requiredStrokeMm: 30,
        pistonSpeedMmPerS: 200,
        eccentricDistanceMm: 50,
      }),
    ).toMatchObject({ graph: 13, xUnit: "mm", xValue: 30 });
  });

  it("uses the page-552 stopper plots independently of pressure while retaining that context", () => {
    const selection = selectMgpSelectionBand({
      applicationCase: "stopper",
      bearingType: "slide",
      operatingPressureMPa: 0.45,
      requiredStrokeMm: 30,
      transferSpeedMPerMin: 20,
      boreDiameterMm: 25,
    });

    expect(selection).toMatchObject({
      inEnvelope: true,
      graph: 21,
      operatingPressureMPa: 0.45,
      transferSpeedRangeMPerMin: [5, 30],
      xUnit: "m/min",
      xValue: 20,
    });
    expect(selection).not.toHaveProperty("pressureBand");
    expect(selection).not.toHaveProperty("maxSpeedMmPerS");
    expect(selection).not.toHaveProperty("loadCoefficient");
  });

  it("maps horizontal L = 0 mm to the published L = 50 mm band", () => {
    expect(
      selectMgpSelectionBand({
        applicationCase: "horizontal_pusher",
        bearingType: "slide",
        operatingPressureMPa: 0.5,
        requiredStrokeMm: 30,
        pistonSpeedMmPerS: 200,
        eccentricDistanceMm: 0,
      }),
    ).toMatchObject({ graph: 13, horizontalOffsetMm: 50 });
  });

  it("keeps a zero vertical L available for the curve-domain check", () => {
    const selection = selectMgpSelectionBand({
      applicationCase: "vertical_lifter",
      bearingType: "slide",
      operatingPressureMPa: 0.4,
      requiredStrokeMm: 30,
      pistonSpeedMmPerS: 200,
      eccentricDistanceMm: 0,
      boreDiameterMm: 25,
    });

    expect(selection).toMatchObject({
      inEnvelope: true,
      graph: 1,
      xValue: 0,
    });
    if (!selection.inEnvelope) throw new Error("Expected a vertical band.");

    const curve = MGP_SELECTION_CURVES.find(
      (candidate) =>
        candidate.graph === selection.graph &&
        candidate.bearingType === selection.bearingType &&
        candidate.pressureBand === selection.pressureBand &&
        candidate.boreDiameterMm === 25,
    );
    expect(curve).toBeDefined();
    if (curve !== undefined) {
      expect(interpolateMgpCurve(curve, selection.xValue)).toMatchObject({
        inEnvelope: false,
        reason: "x_outside_curve_domain",
      });
    }
  });

  it("rejects a negative eccentric distance", () => {
    expect(
      selectMgpSelectionBand({
        applicationCase: "horizontal_pusher",
        bearingType: "slide",
        operatingPressureMPa: 0.5,
        requiredStrokeMm: 30,
        pistonSpeedMmPerS: 200,
        eccentricDistanceMm: -0.01,
      }),
    ).toMatchObject({ inEnvelope: false, reason: "invalid_input" });
  });

  it("rejects unrecognised application cases at runtime", () => {
    const input = {
      applicationCase: "unsupported_case",
      bearingType: "slide",
      operatingPressureMPa: 0.5,
      requiredStrokeMm: 30,
      pistonSpeedMmPerS: 200,
      eccentricDistanceMm: 50,
    } as unknown as MgpSelectionBandInput;

    expect(selectMgpSelectionBand(input)).toMatchObject({
      inEnvelope: false,
      reason: "invalid_input",
    });
  });

  it("rejects unrecognised bearing types at runtime", () => {
    const input = {
      applicationCase: "horizontal_pusher",
      bearingType: "unsupported_bearing",
      operatingPressureMPa: 0.5,
      requiredStrokeMm: 30,
      pistonSpeedMmPerS: 200,
      eccentricDistanceMm: 50,
    } as unknown as MgpSelectionBandInput;

    expect(selectMgpSelectionBand(input)).toMatchObject({
      inEnvelope: false,
      reason: "invalid_input",
    });
  });

  it("returns an explicit out-of-envelope result for vertical L at the software-only boundary", () => {
    expect(
      selectMgpSelectionBand({
        applicationCase: "vertical_lifter",
        bearingType: "slide",
        operatingPressureMPa: 0.4,
        requiredStrokeMm: 30,
        pistonSpeedMmPerS: 200,
        eccentricDistanceMm: 200,
      }),
    ).toMatchObject({
      inEnvelope: false,
      reason: "eccentric_distance_requires_selection_software",
    });
  });

  it("returns an explicit out-of-envelope result for horizontal L above 100 mm", () => {
    expect(
      selectMgpSelectionBand({
        applicationCase: "horizontal_pusher",
        bearingType: "slide",
        operatingPressureMPa: 0.5,
        requiredStrokeMm: 30,
        pistonSpeedMmPerS: 200,
        eccentricDistanceMm: 100.01,
      }),
    ).toMatchObject({
      inEnvelope: false,
      reason: "horizontal_offset_above_published_envelope",
    });
  });

  it("does not silently classify the unsupported pressure gap from 0.41 to 0.49 MPa", () => {
    expect(
      selectMgpSelectionBand({
        applicationCase: "vertical_lifter",
        bearingType: "slide",
        operatingPressureMPa: 0.45,
        requiredStrokeMm: 30,
        pistonSpeedMmPerS: 200,
        eccentricDistanceMm: 50,
      }),
    ).toMatchObject({
      inEnvelope: false,
      reason: "unsupported_operating_pressure",
    });
  });

  it("returns an explicit out-of-envelope result above the 500 mm/s coefficient-table limit", () => {
    expect(
      selectMgpSelectionBand({
        applicationCase: "horizontal_pusher",
        bearingType: "ball_bushing",
        operatingPressureMPa: 0.5,
        requiredStrokeMm: 30,
        pistonSpeedMmPerS: 500.01,
        eccentricDistanceMm: 50,
      }),
    ).toMatchObject({
      inEnvelope: false,
      reason: "piston_speed_above_published_envelope",
    });
  });

  it("uses the page-545 coefficient table without changing the 400 mm/s graph identity", () => {
    expect(
      selectMgpSelectionBand({
        applicationCase: "vertical_lifter",
        bearingType: "ball_bushing",
        operatingPressureMPa: 0.4,
        requiredStrokeMm: 30,
        pistonSpeedMmPerS: 300,
        eccentricDistanceMm: 75,
      }),
    ).toMatchObject({ graph: 9, loadCoefficient: 1.7 });

    expect(
      selectMgpSelectionBand({
        applicationCase: "vertical_lifter",
        bearingType: "ball_bushing",
        operatingPressureMPa: 0.4,
        requiredStrokeMm: 30,
        pistonSpeedMmPerS: 500,
        eccentricDistanceMm: 75,
      }),
    ).toMatchObject({ graph: 9, loadCoefficient: 0.6 });
  });

  it("labels the published over-stroke vertical bands without a false maximum", () => {
    expect(
      selectMgpSelectionBand({
        applicationCase: "vertical_lifter",
        bearingType: "ball_bushing",
        operatingPressureMPa: 0.5,
        requiredStrokeMm: 31,
        pistonSpeedMmPerS: 200,
        eccentricDistanceMm: 90,
        boreDiameterMm: 25,
      }),
    ).toMatchObject({ graph: 6, minStrokeExclusiveMm: 30 });
  });

  it("maps high-precision ball bushings to the published ball-bushing graphs", () => {
    expect(
      selectMgpSelectionBand({
        applicationCase: "horizontal_pusher",
        bearingType: "high_precision_ball_bushing",
        operatingPressureMPa: 0.4,
        requiredStrokeMm: 50,
        pistonSpeedMmPerS: 400,
        eccentricDistanceMm: 80,
      }),
    ).toMatchObject({ graph: 20, horizontalOffsetMm: 100 });
  });

  it("selects both unnumbered page-552 stopper bore-group bands", () => {
    expect(
      selectMgpSelectionBand({
        applicationCase: "stopper",
        bearingType: "slide",
        operatingPressureMPa: 0.4,
        requiredStrokeMm: 30,
        transferSpeedMPerMin: 20,
        boreDiameterMm: 25,
      }),
    ).toMatchObject({
      graph: 21,
      xUnit: "m/min",
      xValue: 20,
      transferSpeedRangeMPerMin: [5, 30],
    });

    expect(
      selectMgpSelectionBand({
        applicationCase: "stopper",
        bearingType: "slide",
        operatingPressureMPa: 0.4,
        requiredStrokeMm: 50,
        transferSpeedMPerMin: 20,
        boreDiameterMm: 32,
      }),
    ).toMatchObject({
      graph: 22,
      xUnit: "m/min",
      xValue: 20,
      transferSpeedRangeMPerMin: [5, 30],
    });
  });

  it("exposes the page-552 stopper scope cautions on a successful selection", () => {
    expect(
      selectMgpSelectionBand({
        applicationCase: "stopper",
        bearingType: "slide",
        operatingPressureMPa: 0.4,
        requiredStrokeMm: 30,
        transferSpeedMPerMin: 20,
        boreDiameterMm: 25,
      }),
    ).toMatchObject({
      inEnvelope: true,
      scopeWarnings: [
        "The page-552 stopper plots assume L ≈ 50 mm; for a longer L, select a sufficiently large bore.",
        "If roller-conveyor line pressure is applied after the workpiece stops, use horizontal graphs 13 or 15 instead of the stopper plots.",
      ],
    });
  });

  it.each([
    { boreDiameterMm: 12, terminalSpeedMPerMin: 30 },
    { boreDiameterMm: 32, terminalSpeedMPerMin: 30 },
    { boreDiameterMm: 50, terminalSpeedMPerMin: 40 },
    { boreDiameterMm: 100, terminalSpeedMPerMin: 50 },
  ])(
    "enforces the $terminalSpeedMPerMin m/min stopper endpoint for bore $boreDiameterMm",
    ({ boreDiameterMm, terminalSpeedMPerMin }) => {
      const requiredStrokeMm = boreDiameterMm <= 25 ? 30 : 50;
      expect(
        selectMgpSelectionBand({
          applicationCase: "stopper",
          bearingType: "slide",
          operatingPressureMPa: 0.4,
          requiredStrokeMm,
          transferSpeedMPerMin: terminalSpeedMPerMin,
          boreDiameterMm,
        }),
      ).toMatchObject({ inEnvelope: true });

      expect(
        selectMgpSelectionBand({
          applicationCase: "stopper",
          bearingType: "slide",
          operatingPressureMPa: 0.4,
          requiredStrokeMm,
          transferSpeedMPerMin: terminalSpeedMPerMin + 0.01,
          boreDiameterMm,
        }),
      ).toMatchObject({
        inEnvelope: false,
        reason: "transfer_speed_outside_published_envelope",
      });
    },
  );

  it("enforces MGPM-only and the two published stopper stroke limits", () => {
    expect(
      selectMgpSelectionBand({
        applicationCase: "stopper",
        bearingType: "ball_bushing",
        operatingPressureMPa: 0.4,
        requiredStrokeMm: 30,
        transferSpeedMPerMin: 20,
        boreDiameterMm: 25,
      }),
    ).toMatchObject({
      inEnvelope: false,
      reason: "stopper_requires_slide_bearing",
    });

    expect(
      selectMgpSelectionBand({
        applicationCase: "stopper",
        bearingType: "slide",
        operatingPressureMPa: 0.4,
        requiredStrokeMm: 31,
        transferSpeedMPerMin: 20,
        boreDiameterMm: 25,
      }),
    ).toMatchObject({
      inEnvelope: false,
      reason: "stopper_stroke_above_bore_limit",
    });

    expect(
      selectMgpSelectionBand({
        applicationCase: "stopper",
        bearingType: "slide",
        operatingPressureMPa: 0.4,
        requiredStrokeMm: 51,
        transferSpeedMPerMin: 20,
        boreDiameterMm: 32,
      }),
    ).toMatchObject({
      inEnvelope: false,
      reason: "stopper_stroke_above_bore_limit",
    });
  });
});

describe("MGP_SELECTION_CURVES", () => {
  it("contains positive, ordered source points for every published model-selection graph", () => {
    expect(new Set(MGP_SELECTION_CURVES.map((curve) => curve.graph))).toEqual(
      new Set(Array.from({ length: 22 }, (_, index) => index + 1)),
    );

    for (const curve of MGP_SELECTION_CURVES) {
      expect(curve.points.length).toBeGreaterThanOrEqual(2);
      for (let index = 0; index < curve.points.length; index += 1) {
        const point = curve.points[index];
        expect(point?.x).toBeGreaterThan(0);
        expect(point?.loadMassKg).toBeGreaterThan(0);
        if (index > 0)
          expect(point?.x).toBeGreaterThan(curve.points[index - 1]!.x);
      }
    }
  });

  it("covers both pressure bands and both published ball-bushing bearing names", () => {
    const graph5 = MGP_SELECTION_CURVES.filter((curve) => curve.graph === 5);
    expect(new Set(graph5.map((curve) => curve.pressureBand))).toEqual(
      new Set(["0.4_mpa", "at_least_0.5_mpa"]),
    );
    expect(new Set(graph5.map((curve) => curve.bearingType))).toEqual(
      new Set(["ball_bushing", "high_precision_ball_bushing"]),
    );
  });

  it("models the page-552 stopper curves only with their transfer-speed domains", () => {
    const stopperCurves = MGP_SELECTION_CURVES.filter(
      (curve) => curve.applicationCase === "stopper",
    );

    expect(stopperCurves).not.toHaveLength(0);
    for (const curve of stopperCurves) {
      expect(curve).not.toHaveProperty("pressureBand");
      expect(curve).not.toHaveProperty("maxSpeedMmPerS");
      expect(curve.transferSpeedRangeMPerMin).toEqual([
        curve.points[0]!.x,
        curve.points.at(-1)!.x,
      ]);
    }
  });

  it("locks the complete reviewed curve transcript with a deterministic digest", () => {
    const reviewedProjection = MGP_SELECTION_CURVES.map((curve) => ({
      graph: curve.graph,
      sourcePage: curve.sourcePage,
      applicationCase: curve.applicationCase,
      bearingType: curve.bearingType,
      pressureBand: curve.pressureBand ?? null,
      maxSpeedMmPerS: curve.maxSpeedMmPerS ?? null,
      transferSpeedRangeMPerMin: curve.transferSpeedRangeMPerMin ?? null,
      maxStrokeMm: curve.maxStrokeMm ?? null,
      minStrokeExclusiveMm: curve.minStrokeExclusiveMm ?? null,
      horizontalOffsetMm: curve.horizontalOffsetMm ?? null,
      boreDiameterMm: curve.boreDiameterMm,
      xUnit: curve.xUnit,
      points: curve.points,
    }));
    const digest = createHash("sha256")
      .update(JSON.stringify(reviewedProjection))
      .digest("hex");

    expect(digest).toBe(
      "96ae667ea63440f16bee3c91a547c570309f57dd1e338ac6bbdaf019f1c7c804",
    );
  });

  it("reproduces the two page-545 example margins from source-backed curves", () => {
    const vertical = MGP_SELECTION_CURVES.find(
      (curve) =>
        curve.graph === 5 &&
        curve.bearingType === "ball_bushing" &&
        curve.pressureBand === "at_least_0.5_mpa" &&
        curve.boreDiameterMm === 25,
    );
    expect(vertical).toBeDefined();
    if (vertical !== undefined) {
      const result = interpolateMgpCurve(vertical, 90);
      expect(result).toMatchObject({ inEnvelope: true });
      if (result.inEnvelope) {
        expect(result.loadMassKg).toBeCloseTo(3.62, 1);
        expect(result.loadMassKg).toBeGreaterThan(3);
      }
    }

    const horizontal = MGP_SELECTION_CURVES.find(
      (curve) =>
        curve.graph === 13 &&
        curve.bearingType === "slide" &&
        curve.pressureBand === "at_least_0.5_mpa" &&
        curve.boreDiameterMm === 20,
    );
    expect(horizontal).toBeDefined();
    if (horizontal !== undefined) {
      expect(interpolateMgpCurve(horizontal, 30)).toEqual({
        inEnvelope: true,
        loadMassKg: 2.47,
      });
    }
  });
});

describe("interpolateMgpCurve", () => {
  const verticalCurve: MgpSelectionCurve = {
    graph: 5,
    sourcePage: 547,
    applicationCase: "vertical_lifter",
    bearingType: "ball_bushing",
    pressureBand: "at_least_0.5_mpa",
    maxSpeedMmPerS: 200,
    maxStrokeMm: 30,
    boreDiameterMm: 25,
    xUnit: "mm",
    points: [
      { x: 10, loadMassKg: 12 },
      { x: 30, loadMassKg: 12 },
      { x: 200, loadMassKg: 2 },
    ],
  };

  it("uses log-log interpolation for vertical and horizontal graph axes", () => {
    const result = interpolateMgpCurve(verticalCurve, Math.sqrt(30 * 200));
    expect(result).toMatchObject({ inEnvelope: true });
    if (result.inEnvelope) {
      expect(result.loadMassKg).toBeCloseTo(Math.sqrt(12 * 2), 8);
    }
  });

  it("uses linear interpolation for the stopper graph", () => {
    const stopperCurve: MgpSelectionCurve = {
      graph: 21,
      sourcePage: 552,
      applicationCase: "stopper",
      bearingType: "slide",
      maxStrokeMm: 30,
      boreDiameterMm: 25,
      xUnit: "m/min",
      transferSpeedRangeMPerMin: [10, 30],
      points: [
        { x: 10, loadMassKg: 20 },
        { x: 30, loadMassKg: 10 },
      ],
    };

    expect(interpolateMgpCurve(stopperCurve, 20)).toEqual({
      inEnvelope: true,
      loadMassKg: 15,
    });
  });

  it("does not extrapolate beyond a curve's own seeded endpoints", () => {
    expect(interpolateMgpCurve(verticalCurve, 9.99)).toMatchObject({
      inEnvelope: false,
      reason: "x_outside_curve_domain",
    });
    expect(interpolateMgpCurve(verticalCurve, 200.01)).toMatchObject({
      inEnvelope: false,
      reason: "x_outside_curve_domain",
    });
  });
});
