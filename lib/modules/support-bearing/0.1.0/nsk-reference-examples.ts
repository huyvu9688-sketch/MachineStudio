// NSK's own two full worked examples for a single-row deep-groove ball
// bearing 6208 ("Rolling Bearings" CAT. No. E1102a, Section 5.7 "Examples of
// Bearing Calculations", printed page A34, Examples 1 and 3), reproduced
// through this module's ACTUAL compute path (executeModule), not just the
// kernel formula level ./nsk-fh-benchmark.test.ts already covers.
//
// Closes the gap this module's own validation.ts and
// context/modules/support-bearing/stage-1-spec.md "Evidence Gaps" record:
// "no full published worked numerical example was found" (NTN's own
// handbook lists one at printed page 84 but three independently-fetched
// editions are all truncated immediately before it -- see
// lib/standards/engineering-sources.ts's own note on
// jp.ntn.rolling_bearings_handbook@cat-9012e). NSK is a different
// manufacturer, found while searching for an alternative once the NTN gap
// was reconfirmed rather than assumed closed.
//
// Example 1 (pure radial load, no axial component) maps to a
// bearing.location = "supported" run: NSK's own text states the equivalent
// load reduces to P = Fr directly ("Since only a radial load is applied"),
// the same treatment this module's own "supported" branch gives (factorY
// and axialLoadN are both forced to zero regardless of what a "fixed"-only
// Y factor would have been -- see compute.ts). dynamic_load_factor_x = 1
// reproduces that reduction (P = X*Fr = 1*Fr = Fr).
//
// Example 3 (the same bearing under Example 1's radial load plus an added
// axial load) maps to a bearing.location = "fixed" run, using NSK's own
// printed X = 0.56 / Y = 1.67 factors directly -- values the module's own
// scope treats as an engineer-supplied catalog lookup, not a reproduced
// table (context/modules/support-bearing/stage-2-contract.md "Decisions"
// item 4), so taking NSK's own already-resolved factors is the correct
// input shape, not a shortcut around missing module capability.
//
// Ports outside what NSK's own text specifies (lead, allowable speed, the
// static-load-factor pair, bore/outside diameter, the static-safety-factor
// minimum, and the entire peak case) are not sourced from NSK -- they are
// set to comfortably-passing placeholder values so the full required port
// set is satisfied without affecting the dynamic-equivalent-load or
// nominal-life-hours figures under test. lead/normal_linear_velocity is the
// one exception: chosen so resolveOperatingSpeed reproduces NSK's own
// printed n = 900 rpm exactly. Bore/outside diameter use bearing 6208's
// well-known standard JIS/ISO dimensions (40 mm bore, 80 mm OD) rather than
// a specific NSK page citation -- the dimension table itself (NSK's own
// "Page B10") was not fetched this session.

import { makeQuantity } from "@/lib/engine";
import { bearingLocationValue, type RawInput } from "./test-helpers";

const RPM_TO_REV_PER_S = 1 / 60;
const N_900_RPM_REV_PER_S = 900 * RPM_TO_REV_PER_S;
/** Arbitrary lead chosen only so v/lead reproduces 900 rpm exactly. */
const LEAD_M = 0.01;
const VELOCITY_FOR_900_RPM_MPS = N_900_RPM_REV_PER_S * LEAD_M;

/** Bearing 6208's own basic dynamic load rating, Cr, per NSK's own text (both examples). */
export const NSK_6208_DYNAMIC_LOAD_RATING_N = 29_100;
/** Bearing 6208's own basic static load rating, C0r, per NSK's own text (Example 3). */
export const NSK_6208_STATIC_LOAD_RATING_N = 17_900;

function sharedPlaceholderPorts(): RawInput["values"] {
  return {
    lead: makeQuantity(LEAD_M, "m"),
    dynamic_load_rating: makeQuantity(NSK_6208_DYNAMIC_LOAD_RATING_N, "N"),
    static_load_rating: makeQuantity(NSK_6208_STATIC_LOAD_RATING_N, "N"),
    // Not exercised by either example (NSK's own text gives no allowable
    // speed for 6208 here); a generously large placeholder so the speed-
    // safety check does not spuriously fail.
    allowable_speed: makeQuantity(10_000, "rad/s"),
    // Not exercised by either example (NSK gives no static equivalent-load
    // result for 6208 here); placeholder ISO-typical deep-groove-ball-
    // bearing values, the same X0/Y0 magnitudes this module's own
    // package.test.ts baseline already uses.
    static_load_factor_x: makeQuantity(0.6, "ratio"),
    // Standard JIS/ISO dimensions for bearing 6208 (40 mm bore, 80 mm OD) --
    // not read from NSK's own dimension table this session.
    bore_diameter: makeQuantity(0.04, "m"),
    outside_diameter: makeQuantity(0.08, "m"),
    // Not exercised by either example; a permissive placeholder so the
    // static-safety check passes without asserting a specific figure.
    static_safety_factor_minimum: makeQuantity(1, "ratio"),
  };
}

export interface NskReferenceExample {
  readonly id: string;
  readonly description: string;
  /** NSK's own printed dynamic equivalent load P, N. */
  readonly dynamicEquivalentLoadN: number;
  /** NSK's own printed (or directly stated) approximate service life, hours. */
  readonly approximateLifeHours: number;
  readonly input: RawInput;
}

/**
 * NSK "Rolling Bearings" Example 1: single-row deep-groove ball bearing
 * 6208, Fr = 2500 N, n = 900 rpm, Cr = 29,100 N -> P = Fr = 2500 N,
 * fh = 3.88, "approximately 29,000 hours of service life".
 */
export const NSK_EXAMPLE_1: NskReferenceExample = {
  id: "nsk-example-1-6208-radial-only",
  description:
    "NSK 'Rolling Bearings' Example 1: bearing 6208, Fr=2500 N, n=900 rpm, pure radial load.",
  dynamicEquivalentLoadN: 2500,
  approximateLifeHours: 29_000,
  input: {
    values: {
      ...sharedPlaceholderPorts(),
      location: bearingLocationValue("supported"),
      // P = X*Fr = Fr requires X = 1 (NSK's own reduction for a pure radial load).
      dynamic_load_factor_x: makeQuantity(1, "ratio"),
      normal_actual_radial_load: makeQuantity(2500, "N"),
      normal_linear_velocity: makeQuantity(VELOCITY_FOR_900_RPM_MPS, "m/s"),
      // The module structurally requires a peak case; NSK's own example
      // gives only one operating condition, so peak duplicates normal --
      // not itself evidence, just satisfying the required port shape.
      peak_actual_radial_load: makeQuantity(2500, "N"),
      peak_linear_velocity: makeQuantity(VELOCITY_FOR_900_RPM_MPS, "m/s"),
    },
  },
};

/**
 * NSK "Rolling Bearings" Example 3: the same bearing 6208 and radial load as
 * Example 1, plus Fa = 1000 N, X = 0.56, Y = 1.67 (NSK's own printed
 * factors) -> P = 0.56*2500 + 1.67*1000 = 3070 N, fh = 3.16, "approximately
 * 15,800 hours" for ball bearings.
 */
export const NSK_EXAMPLE_3: NskReferenceExample = {
  id: "nsk-example-3-6208-radial-plus-axial",
  description:
    "NSK 'Rolling Bearings' Example 3: bearing 6208, Fr=2500 N, Fa=1000 N (X=0.56, Y=1.67), n=900 rpm.",
  dynamicEquivalentLoadN: 0.56 * 2500 + 1.67 * 1000,
  approximateLifeHours: 15_800,
  input: {
    values: {
      ...sharedPlaceholderPorts(),
      location: bearingLocationValue("fixed"),
      dynamic_load_factor_x: makeQuantity(0.56, "ratio"),
      dynamic_load_factor_y: makeQuantity(1.67, "ratio"),
      // Not exercised (NSK gives no static result for this example); same
      // placeholder treatment as static_load_factor_x above.
      static_load_factor_y: makeQuantity(0.5, "ratio"),
      normal_actual_radial_load: makeQuantity(2500, "N"),
      normal_thrust_force: makeQuantity(1000, "N"),
      normal_linear_velocity: makeQuantity(VELOCITY_FOR_900_RPM_MPS, "m/s"),
      peak_actual_radial_load: makeQuantity(2500, "N"),
      peak_thrust_force: makeQuantity(1000, "N"),
      peak_linear_velocity: makeQuantity(VELOCITY_FOR_900_RPM_MPS, "m/s"),
    },
  },
};

export const NSK_REFERENCE_EXAMPLES: readonly NskReferenceExample[] = [
  NSK_EXAMPLE_1,
  NSK_EXAMPLE_3,
];
