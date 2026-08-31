import { describe, expect, it } from "vitest";
import {
  INSTANT_ENGINEER_EXPECTED_BEARING_MPA,
  INSTANT_ENGINEER_EXPECTED_SHEAR_MPA,
  ROYMECH_EXPECTED_PRELOAD_N,
  afdlExpectedCombinedStressPa,
  afdlObservedCombinedStressPa,
  runAfdlShaftExample,
  runInstantEngineerKeyExample,
  runRoymechBoltPreloadExample,
} from "./reference-examples";
import { asQuantity } from "./test-helpers";

describe("Stage 4 reference examples (real compute() path)", () => {
  it("reproduces the AFDL 20 hp / 300 rpm pulley-shaft combined stress (12,150 psi)", () => {
    const computation = runAfdlShaftExample();
    const observed = afdlObservedCombinedStressPa(computation);
    const expected = afdlExpectedCombinedStressPa();
    expect(Math.abs(observed - expected) / expected).toBeLessThan(0.002);
  });

  it("reproduces the instant.engineer key shear stress (83.3 MPa)", () => {
    const computation = runInstantEngineerKeyExample();
    const observedMPa = asQuantity(
      computation.outputs.normal_key_shear_stress,
    ).value;
    expect(
      Math.abs(observedMPa - INSTANT_ENGINEER_EXPECTED_SHEAR_MPA) /
        INSTANT_ENGINEER_EXPECTED_SHEAR_MPA,
    ).toBeLessThan(0.002);
  });

  it("reproduces the instant.engineer key bearing stress (208.3 MPa)", () => {
    const computation = runInstantEngineerKeyExample();
    const observedMPa = asQuantity(
      computation.outputs.normal_key_bearing_stress,
    ).value;
    expect(
      Math.abs(observedMPa - INSTANT_ENGINEER_EXPECTED_BEARING_MPA) /
        INSTANT_ENGINEER_EXPECTED_BEARING_MPA,
    ).toBeLessThan(0.002);
  });

  it("reproduces the RoyMech bolt preload worked example (T=40 N*m, K=0.2, d=10mm -> 20 kN)", () => {
    const computation = runRoymechBoltPreloadExample();
    const observedN = asQuantity(computation.outputs.bolt_preload).value;
    expect(
      Math.abs(observedN - ROYMECH_EXPECTED_PRELOAD_N) /
        ROYMECH_EXPECTED_PRELOAD_N,
    ).toBeLessThan(0.0001);
  });
});
