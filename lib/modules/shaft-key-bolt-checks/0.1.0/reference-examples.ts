// Stage 4 reference-example reproductions for the shaft-key-bolt-checks
// module — one real, independently-sourced published worked example per
// sub-check (shaft, key, bolt), each run through the real executeModule()
// compute path, not only at the kernel level (context/ai-workflow-rules.md
// "New Module Workflow" Stage 4; the roadmap's own Module Definition of Done
// "at least three published reference examples reproduced through the real
// compute() path").
//
// 0.1.0 requires the full shaft+key+bolt input set on every instance
// (stage-2-contract.md "Decisions" item 9), so each scenario below supplies
// a complete input set: the sourced figures for the sub-check under test,
// and disclosed, non-sourced placeholder figures (clearly marked) for the
// two sub-checks not being verified in that scenario. The placeholders never
// affect the asserted output — each is independent of the other two
// sub-checks' own inputs (shaft combined stress depends only on shaft.*;
// key stress depends only on shaft.diameter/shaft.applied_torque and key.*;
// bolt preload depends only on bolt.installation_torque/k_factor/
// nominal_diameter).

import { convert, executeModule, makeQuantity, type ModuleComputation } from "@/lib/engine";
import { shaftKeyBoltChecksModule } from "./index";
import { asQuantity, boltThreadStandardValue, type RawInput } from "./test-helpers";

/**
 * A complete, valid input set using round, non-sourced engineering numbers
 * for whichever sub-check a given scenario is not exercising — the same
 * "disclosed placeholder, not a source figure" treatment
 * package.test.ts's own baselineInput() already uses. Callers override the
 * sourced fields for their own scenario.
 */
function nonSourcedBaseline(): Record<string, unknown> {
  return {
    shaft_diameter: makeQuantity(0.03, "m"),
    shaft_material_yield_strength: makeQuantity(250, "MPa"),
    shaft_torque_service_factor: makeQuantity(1, "ratio"),
    shaft_bending_service_factor: makeQuantity(1.5, "ratio"),
    shaft_safety_factor_minimum: makeQuantity(1, "ratio"),
    normal_shaft_applied_torque: makeQuantity(100, "N*m"),
    normal_shaft_applied_bending_moment: makeQuantity(50, "N*m"),
    peak_shaft_applied_torque: makeQuantity(100, "N*m"),
    peak_shaft_applied_bending_moment: makeQuantity(50, "N*m"),
    key_width: makeQuantity(0.008, "m"),
    key_height: makeQuantity(0.009, "m"),
    key_length: makeQuantity(0.025, "m"),
    key_material_yield_strength: makeQuantity(200, "MPa"),
    key_safety_factor_minimum: makeQuantity(1, "ratio"),
    bolt_thread_standard: boltThreadStandardValue("metric"),
    bolt_nominal_diameter: makeQuantity(0.01, "m"),
    bolt_thread_pitch: makeQuantity(0.0015, "m"),
    bolt_proof_strength: makeQuantity(580, "MPa"),
    bolt_k_factor: makeQuantity(0.2, "ratio"),
    bolt_installation_torque: makeQuantity(25, "N*m"),
    bolt_safety_factor_minimum: makeQuantity(1, "ratio"),
  };
}

function run(overrides: Record<string, unknown>): ModuleComputation {
  const input: RawInput = { values: { ...nonSourcedBaseline(), ...overrides } };
  return executeModule(shaftKeyBoltChecksModule, input);
}

// === 1. Shaft: US Air Force Flight Dynamics Laboratory Stress Analysis ====
// === Manual, Chapter 10 — 20 hp / 300 rpm pulley shaft ======================

/**
 * Source: `lib/standards/engineering-sources.ts`,
 * `us.engineeringlibrary.afdl_stress_analysis_manual_shafts`. Printed inputs
 * at the governing cross-section (pulley B): `T = 4200 lbf*in`,
 * `M = 7685 lbf*in` (combined bending moment), `Ks = 1.0`, `Km = 1.5`, solid
 * shaft, solved diameter `D = 1.726 in`, design allowable stress
 * `12,150 psi`. Reproduces the stress-formula half only, through the real
 * compute() path: at the source's own solved diameter, `normal_shaft_
 * combined_stress` must recover the source's own 12,150 psi design stress.
 * The source's own allowable-stress derivation (yield AND ultimate
 * strength, plus a keyway stress-concentration derating factor) is more
 * elaborate than this module's own simpler yield/safety-factor-minimum
 * model — `shaft_material_yield_strength`/`shaft_safety_factor_minimum`
 * below are therefore disclosed placeholders, not the source's own
 * allowable-stress derivation; only the combined-stress figure itself is
 * asserted against the source. Peak case is set equal to the normal case
 * (the source gives one governing cross-section, not two load cases) and is
 * not itself asserted against the source.
 */
export function runAfdlShaftExample(): ModuleComputation {
  const torqueNm = convert(4200, "lbf*in", "N*m");
  const bendingMomentNm = convert(7685, "lbf*in", "N*m");
  const diameterM = convert(1.726, "in", "m");

  return run({
    shaft_diameter: makeQuantity(diameterM, "m"),
    shaft_torque_service_factor: makeQuantity(1.0, "ratio"),
    shaft_bending_service_factor: makeQuantity(1.5, "ratio"),
    normal_shaft_applied_torque: makeQuantity(torqueNm, "N*m"),
    normal_shaft_applied_bending_moment: makeQuantity(bendingMomentNm, "N*m"),
    peak_shaft_applied_torque: makeQuantity(torqueNm, "N*m"),
    peak_shaft_applied_bending_moment: makeQuantity(bendingMomentNm, "N*m"),
  });
}

export function afdlExpectedCombinedStressPa(): number {
  return convert(12150, "psi", "Pa");
}

export function afdlObservedCombinedStressPa(
  computation: ModuleComputation,
): number {
  return convert(
    asQuantity(computation.outputs.normal_shaft_combined_stress).value,
    "MPa",
    "Pa",
  );
}

// === 2. Key: instant.engineer parallel-key shear/bearing worked example ===

/**
 * Source: `lib/standards/engineering-sources.ts`,
 * `jp.instant_engineer.key_shear_bearing_stress`. Printed inputs:
 * `T = 500 N*m`, `d = 30 mm` (shaft diameter, reused per stage-2-contract.md
 * "Decisions" item 6), `b = 10 mm` (key width), `h = 8 mm` (key height),
 * `L = 40 mm` (key length). Printed results: `tau = 83.3 MPa` (shear),
 * `p = 208.3 MPa` (bearing) — hand-checked by the source itself and
 * confirmed arithmetically consistent (`lib/standards/engineering-
 * sources.ts`'s own revision note). Bending moment is not part of this
 * source's own scenario (the key check does not depend on it) — set to `0`,
 * disclosed, not sourced; `normal_shaft_combined_stress` is not asserted by
 * this reproduction.
 */
export function runInstantEngineerKeyExample(): ModuleComputation {
  return run({
    shaft_diameter: makeQuantity(0.03, "m"),
    normal_shaft_applied_torque: makeQuantity(500, "N*m"),
    normal_shaft_applied_bending_moment: makeQuantity(0, "N*m"),
    peak_shaft_applied_torque: makeQuantity(500, "N*m"),
    peak_shaft_applied_bending_moment: makeQuantity(0, "N*m"),
    key_width: makeQuantity(0.01, "m"),
    key_height: makeQuantity(0.008, "m"),
    key_length: makeQuantity(0.04, "m"),
  });
}

export const INSTANT_ENGINEER_EXPECTED_SHEAR_MPA = 83.3;
export const INSTANT_ENGINEER_EXPECTED_BEARING_MPA = 208.3;

// === 3. Bolt: RoyMech torque-to-preload worked example =====================

/**
 * Source: `lib/standards/engineering-sources.ts`,
 * `us.roymech.bolt_preload_calculation`. Printed worked example: preload
 * `F = 20 kN`, `d = 10 mm`, `K = 0.2`, giving
 * `T = K*F*d = 0.2*20000*0.01 = 40 N*m`. `0.1.0`'s own `bolt.preload` port
 * inverts the same relationship (`F = T/(K*d)`) — this reproduction supplies
 * the source's own `T`/`K`/`d` and checks that `bolt_preload` recovers the
 * source's own `20,000 N`. Thread pitch is not part of this source's own
 * scenario (preload does not depend on it) — set to a disclosed, non-sourced
 * placeholder.
 */
export function runRoymechBoltPreloadExample(): ModuleComputation {
  return run({
    bolt_installation_torque: makeQuantity(40, "N*m"),
    bolt_k_factor: makeQuantity(0.2, "ratio"),
    bolt_nominal_diameter: makeQuantity(0.01, "m"),
  });
}

export const ROYMECH_EXPECTED_PRELOAD_N = 20_000;
