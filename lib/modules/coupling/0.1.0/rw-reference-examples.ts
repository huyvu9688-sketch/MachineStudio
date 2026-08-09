// R+W America's own two full worked examples ("Sizing and Selection", DIN 740
// part 2 — context/modules/coupling/stage-1-spec.md item 1-2), reproduced
// through this module's ACTUAL compute path, not just the kernel formula
// level ./math.test.ts already covers.
//
// ./math.test.ts reproduces resolveRequiredTorqueFromPower and
// resolveScaledRequiredTorque against R+W's own printed T_AN and required
// T_KN figures — real evidence, but at the formula level only, since
// compute.ts does not call resolveRequiredTorqueFromPower (it consumes
// screw.drive_torque directly — see math.ts's own module doc comment and
// stage-2-contract.md "Decisions" item 2). This file closes that gap the
// honest way: it takes R+W's own printed T_AN as the "already resolved
// drive torque" this module's compute() expects, R+W's own printed
// combined correction factor as coupling.service_factor, and R+W's own
// selected coupling's catalog rated torque as coupling.rated_torque — then
// runs the full sealed package (executeModule) and checks the result
// against R+W's own printed conclusion (which catalog size clears its own
// requirement, and by how much).
//
// Inputs outside what R+W's own text specifies (lead, gear ratio, allowable
// speed, torsional stiffness, moment of inertia, bore ranges, misalignments,
// the peak-case pair) are not sourced from R+W — they are set to
// comfortably-passing placeholder values so the full required port set is
// satisfied without affecting the torque-safety-factor figure under test.
// lead/gear_ratio/normal_linear_velocity are the one exception: chosen so
// resolveOperatingSpeed reproduces R+W's own printed n = 980 rpm exactly,
// since that is a real figure both examples share.

import { makeQuantity } from "@/lib/engine";
import type { RawInput } from "./test-helpers";

const RPM_TO_RAD_PER_S = (2 * Math.PI) / 60;
const N_980_RPM_RAD_PER_S = 980 * RPM_TO_RAD_PER_S;
/** Arbitrary lead chosen only so v/lead * 2*pi reproduces 980 rpm exactly. */
const LEAD_M = 0.01;
const VELOCITY_FOR_980_RPM_MPS = (N_980_RPM_RAD_PER_S / (2 * Math.PI)) * LEAD_M;

function placeholderPorts(): RawInput["values"] {
  return {
    lead: makeQuantity(LEAD_M, "m"),
    torsional_stiffness: makeQuantity(50_000, "N*m/rad"),
    moment_of_inertia: makeQuantity(0.05, "kg*m^2"),
    driving_bore_min: makeQuantity(0.05, "m"),
    driving_bore_max: makeQuantity(0.12, "m"),
    driven_bore_min: makeQuantity(0.05, "m"),
    driven_bore_max: makeQuantity(0.12, "m"),
    allowable_parallel_misalignment: makeQuantity(0.001, "m"),
    allowable_angular_misalignment: makeQuantity(0.02, "rad"),
    allowable_axial_misalignment: makeQuantity(0.001, "m"),
    actual_parallel_misalignment: makeQuantity(0.0002, "m"),
    actual_angular_misalignment: makeQuantity(0.005, "rad"),
    actual_axial_misalignment: makeQuantity(0.0001, "m"),
    driving_shaft_diameter: makeQuantity(0.08, "m"),
    driven_shaft_diameter: makeQuantity(0.08, "m"),
    // Not exercised by either example (R+W's own text gives no shock-case
    // figure); kept comfortably within a generous placeholder max_torque so
    // the peak case, required by the manifest, does not spuriously fail.
    peak_drive_torque: makeQuantity(1000, "N*m"),
    peak_linear_velocity: makeQuantity(VELOCITY_FOR_980_RPM_MPS, "m/s"),
    max_torque: makeQuantity(50_000, "N*m"),
    allowable_speed: makeQuantity(1500 * RPM_TO_RAD_PER_S, "rad/s"),
  };
}

export interface RwReferenceExample {
  readonly id: string;
  readonly description: string;
  /** R+W's own printed T_AN, N*m. */
  readonly requiredTorqueNm: number;
  /** R+W's own combined correction factor for this example. */
  readonly serviceFactor: number;
  /** R+W's own selected coupling model. */
  readonly selectedModel: string;
  /** The selected model's own catalog rated torque T_KN, N*m. */
  readonly ratedTorqueNm: number;
  /** R+W's own printed required T_KN (requiredTorqueNm * serviceFactor), N*m. */
  readonly printedScaledRequiredTorqueNm: number;
  readonly input: RawInput;
}

/**
 * R+W "Sizing and Selection", Example 1: P = 450 kW, n = 980 rpm ->
 * T_AN = 4385.2 Nm; T_KN >= T_AN * 1.25 * 1.1 * 1.0 = 6029.7 Nm (smooth
 * uniform load, 40 degC ambient, 30 starts/hour). Selected coupling ST2/10,
 * T_KN = 6030 Nm.
 */
export const RW_EXAMPLE_1: RwReferenceExample = {
  id: "rw-example-1-st2-10",
  description:
    "R+W 'Sizing and Selection' Example 1: 450 kW / 980 rpm, S_A=1.25 * S_v=1.1 * S_z=1.0, selected ST2/10 (T_KN=6030 Nm).",
  requiredTorqueNm: 4385.2,
  serviceFactor: 1.25 * 1.1 * 1.0,
  selectedModel: "ST2/10",
  ratedTorqueNm: 6030,
  printedScaledRequiredTorqueNm: 6029.7,
  input: {
    values: {
      ...placeholderPorts(),
      rated_torque: makeQuantity(6030, "N*m"),
      service_factor: makeQuantity(1.25 * 1.1 * 1.0, "ratio"),
      normal_drive_torque: makeQuantity(4385.2, "N*m"),
      normal_linear_velocity: makeQuantity(VELOCITY_FOR_980_RPM_MPS, "m/s"),
    },
  },
};

/**
 * R+W "Sizing and Selection", Example 2: P = 800 kW, n = 980 rpm ->
 * T_AN = 7796 Nm; T_KN >= T_AN * 2 = 15,592 Nm (S_A = 2, bucket chain
 * excavator). Selected coupling ST4/10, T_KN = 16,000 Nm.
 */
export const RW_EXAMPLE_2: RwReferenceExample = {
  id: "rw-example-2-st4-10",
  description:
    "R+W 'Sizing and Selection' Example 2: 800 kW / 980 rpm, S_A=2, selected ST4/10 (T_KN=16,000 Nm).",
  requiredTorqueNm: 7796,
  serviceFactor: 2,
  selectedModel: "ST4/10",
  ratedTorqueNm: 16_000,
  printedScaledRequiredTorqueNm: 15_592,
  input: {
    values: {
      ...placeholderPorts(),
      rated_torque: makeQuantity(16_000, "N*m"),
      service_factor: makeQuantity(2, "ratio"),
      normal_drive_torque: makeQuantity(7796, "N*m"),
      normal_linear_velocity: makeQuantity(VELOCITY_FOR_980_RPM_MPS, "m/s"),
    },
  },
};

export const RW_REFERENCE_EXAMPLES: readonly RwReferenceExample[] = [
  RW_EXAMPLE_1,
  RW_EXAMPLE_2,
];
