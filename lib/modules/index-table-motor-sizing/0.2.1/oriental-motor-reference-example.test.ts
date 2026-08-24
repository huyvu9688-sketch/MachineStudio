import { describe, expect, it } from "vitest";
import {
  resolveLoadInertia,
  resolveOperatingSpeed,
  resolveTableInertia,
} from "./math";
import {
  ACCELERATION_TIME_S,
  ATTACHED_LOAD_INERTIA_KGM2,
  GEAR_RATIO,
  INDEX_ANGLE_RAD,
  INDEX_TIME_S,
  PRINTED_ATTACHED_LOAD_INERTIA_KGM2,
  PRINTED_LOAD_INERTIA_KGM2,
  PRINTED_TABLE_INERTIA_KGM2,
  PRINTED_TABLE_SPEED_RPM,
  TABLE_DIAMETER_M,
  TABLE_MASS_KG,
} from "./oriental-motor-reference-example";

// Secondary-source reference-example evidence for
// index-table-motor-sizing@0.1.0 (stage-1-spec.md "Oriental Motor's own
// example -- secondary source, partially reproduced", validation.ts):
// Oriental Motor Co., Ltd.'s own "Index Table -- Using Stepping Motors"
// worked example (General Catalog Technical Reference, pp. F-8-F-9).
//
// Reproduced at the KERNEL level, not through executeModule: this
// module's own attached_load_inertia port takes one pre-resolved figure,
// so the 12-workpiece parallel-axis sum is computed in
// oriental-motor-reference-example.ts using lib/engine/mechanics' own
// pointMassInertia/offsetAxisInertia -- exactly the source's own JC+m*l^2
// per-workpiece method -- and asserted against the source's own printed
// JW figure here, then fed into this module's own resolveTableInertia/
// resolveLoadInertia/resolveOperatingSpeed kernel functions.
//
// This source's own final acceleration-torque/required-torque figures are
// NOT reproduced or asserted against -- a disclosed, out-of-scope gap
// (validation.ts "supportedUseLimits"): that example sizes a stepping
// motor using a pulse-speed-based convention distinct from this module's
// own continuous rad/s approach, and the source page's own printed
// formula for that step is OCR-degraded past reliable hand-verification
// in this environment.

describe("index-table-motor-sizing 0.1.0 vs. Oriental Motor's own 'Index Table -- Using Stepping Motors' worked example (pp. F-8-F-9), at the kernel level", () => {
  it("reproduces the printed combined 12-workpiece mounted-load inertia (JW) within 1%", () => {
    const relativeDifference =
      Math.abs(
        ATTACHED_LOAD_INERTIA_KGM2 - PRINTED_ATTACHED_LOAD_INERTIA_KGM2,
      ) / PRINTED_ATTACHED_LOAD_INERTIA_KGM2;
    expect(relativeDifference).toBeLessThan(0.01);
  });

  it("reproduces the printed table inertia (JT) within 1.5%", () => {
    const { inertiaKgM2 } = resolveTableInertia({
      tableMassKg: TABLE_MASS_KG,
      tableDiameterM: TABLE_DIAMETER_M,
    });
    const relativeDifference =
      Math.abs(inertiaKgM2 - PRINTED_TABLE_INERTIA_KGM2) /
      PRINTED_TABLE_INERTIA_KGM2;
    expect(relativeDifference).toBeLessThan(0.015);
  });

  it("reproduces the printed total load inertia (JL = JT+JW) within 1.5%", () => {
    const { inertiaKgM2: tableInertiaKgM2 } = resolveTableInertia({
      tableMassKg: TABLE_MASS_KG,
      tableDiameterM: TABLE_DIAMETER_M,
    });
    const { loadInertiaKgM2 } = resolveLoadInertia({
      tableInertiaKgM2,
      attachedLoadInertiaKgM2: ATTACHED_LOAD_INERTIA_KGM2,
    });
    const relativeDifference =
      Math.abs(loadInertiaKgM2 - PRINTED_LOAD_INERTIA_KGM2) /
      PRINTED_LOAD_INERTIA_KGM2;
    expect(relativeDifference).toBeLessThan(0.015);
  });

  it("reproduces the printed table-shaft operating speed (N=22.2 r/min) within 0.5%, at gear_ratio=1 (table shaft, not motor shaft)", () => {
    const { operatingSpeedRadPerS } = resolveOperatingSpeed({
      indexAngleRad: INDEX_ANGLE_RAD,
      indexTimeS: INDEX_TIME_S,
      accelerationTimeS: ACCELERATION_TIME_S,
      gearRatio: 1,
    });
    const rpm = (operatingSpeedRadPerS * 60) / (2 * Math.PI);
    const relativeDifference =
      Math.abs(rpm - PRINTED_TABLE_SPEED_RPM) / PRINTED_TABLE_SPEED_RPM;
    expect(relativeDifference).toBeLessThan(0.005);
  });

  it("this module's own resolveOperatingSpeed at the source's own 7.2:1 gear ratio produces a sensible, larger motor-shaft speed (sanity, not a printed-figure claim)", () => {
    const { operatingSpeedRadPerS } = resolveOperatingSpeed({
      indexAngleRad: INDEX_ANGLE_RAD,
      indexTimeS: INDEX_TIME_S,
      accelerationTimeS: ACCELERATION_TIME_S,
      gearRatio: GEAR_RATIO,
    });
    expect(operatingSpeedRadPerS).toBeGreaterThan(0);
  });
});
