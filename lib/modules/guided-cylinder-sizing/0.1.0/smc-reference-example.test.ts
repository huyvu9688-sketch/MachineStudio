import { describe, expect, it } from "vitest";
import {
  MGQM40_ALLOWABLE_LATERAL_LOAD_N,
  MGQM40_ALLOWABLE_TORQUE_NM,
  runMgqm40Example,
} from "./smc-reference-example";

describe("SMC MGQM40 (40 mm bore, slide bearing, 50 mm stroke) reached via this module's own compute path", () => {
  it("reproduces a 98.07 N required extend force from a 10 kg vertical lift", () => {
    const { requiredExtendForceN } = runMgqm40Example();
    // F = m*g*sin(90deg) = 10 * 9.80665 = 98.0665 N (zero friction, zero process force).
    expect(requiredExtendForceN).toBeCloseTo(98.0665, 3);
  });

  it("confirms the MGQM40 candidate's own theoretical force clears the requirement", () => {
    const { requiredExtendForceN, theoreticalExtendForceN } = runMgqm40Example();
    expect(theoreticalExtendForceN).toBeGreaterThanOrEqual(requiredExtendForceN);
    // F1 = 0.7 * (pi*40^2/4) * 0.5 ~= 439.8 N.
    expect(theoreticalExtendForceN).toBeCloseTo(439.8, 0);
  });

  it("confirms the MGQM40 candidate's own allowable lateral load clears the requirement", () => {
    const { requiredExtendForceN } = runMgqm40Example();
    expect(MGQM40_ALLOWABLE_LATERAL_LOAD_N).toBeGreaterThanOrEqual(requiredExtendForceN);
  });

  it("confirms the MGQM40 candidate's own allowable rotational torque clears the requirement", () => {
    const { requiredMomentNm } = runMgqm40Example();
    // M_req = sqrt((98.0665*10/1000)^2 + (98.0665*5/1000)^2) ~= 1.096 N*m,
    // directly under the catalog's own 3.43 N*m rating for this bore/
    // bearing-type/stroke -- a real, meaningful clearing margin, not a
    // trivially large one.
    expect(requiredMomentNm).toBeCloseTo(1.096, 2);
    expect(MGQM40_ALLOWABLE_TORQUE_NM).toBeGreaterThanOrEqual(requiredMomentNm);
  });

  it("confirms the MGQM40 candidate's own buckling capacity clears the requirement", () => {
    const { requiredExtendForceN, permissibleCompressiveLoadN } = runMgqm40Example();
    // A short 50 mm column gives an enormous buckling capacity relative to
    // this scenario's own modest required force -- expected, not a
    // coincidence, since buckling load scales with 1/L^2.
    expect(permissibleCompressiveLoadN).toBeGreaterThan(requiredExtendForceN);
  });
});
