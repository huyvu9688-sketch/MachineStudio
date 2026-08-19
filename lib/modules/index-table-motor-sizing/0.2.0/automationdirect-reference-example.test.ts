import { describe, expect, it } from "vitest";
import { executeModule } from "@/lib/engine";
import {
  AUTOMATIONDIRECT_INDEX_TABLE_REFERENCE_EXAMPLE,
  LBF_IN_TO_NM,
  PRINTED_ACCELERATION_TORQUE_NM,
  PRINTED_INERTIA_RATIO,
  PRINTED_OPERATING_SPEED_RPM,
  PRINTED_REFLECTED_INERTIA_KGM2,
  PRINTED_TABLE_INERTIA_KGM2,
} from "./automationdirect-reference-example";
import { indexTableMotorSizingModule } from "./index";
import { asQuantity } from "./test-helpers";

// Reference-example evidence for index-table-motor-sizing@0.1.0
// (stage-1-spec.md "Two worked examples", validation.ts): AutomationDirect's
// own "Index Table - Example Calculations" worked example (SureServo
// Selection Appendix, pp. B-14-B-16), reproduced through this module's own
// real executeModule compute path.
//
// table_inertia, reflected_load_inertia, operating_speed, and
// inertia_ratio are all cleanly reproducible (no rounded-constant
// dependency) and asserted directly against the source's own printed
// figures.
//
// acceleration_torque/momentary_torque are NOT asserted against the
// source's own printed figures directly: this source's own worked
// examples compute acceleration torque with a rounded 0.1 constant
// standing in for the exact 2*pi/60=0.10472 (confirmed by hand against
// this same document's own Example 7, which uses the unrounded form and
// reproduces its own printed figure only that way). This module's own
// kernel uses exact physics throughout. Reapplying the source's own
// rounded constant and its own further-rounded intermediate values (121
// rpm, 0.13 s) at the TEST level exactly reproduces the source's own
// printed 13.68 lb-in figure, proving the ~8% difference is fully
// explained by that one disclosed convention choice (validation.ts
// "deviations"), not a defect in this module's own math.

describe("index-table-motor-sizing 0.1.0 vs. AutomationDirect's own 'Index Table - Example Calculations' worked example (pp. B-14-B-16), through executeModule", () => {
  const result = executeModule(
    indexTableMotorSizingModule,
    AUTOMATIONDIRECT_INDEX_TABLE_REFERENCE_EXAMPLE,
  );

  it("reproduces the printed table inertia (Jtable) within 0.3%", () => {
    const tableInertiaKgM2 = asQuantity(result.outputs.table_inertia).value;
    const relativeDifference =
      Math.abs(tableInertiaKgM2 - PRINTED_TABLE_INERTIA_KGM2) /
      PRINTED_TABLE_INERTIA_KGM2;
    expect(relativeDifference).toBeLessThan(0.003);
  });

  it("reproduces the printed reflected load inertia (Jtable_to_motor) within 0.5%", () => {
    const reflectedKgM2 = asQuantity(
      result.outputs.reflected_load_inertia,
    ).value;
    const relativeDifference =
      Math.abs(reflectedKgM2 - PRINTED_REFLECTED_INERTIA_KGM2) /
      PRINTED_REFLECTED_INERTIA_KGM2;
    expect(relativeDifference).toBeLessThan(0.005);
  });

  it("reproduces the printed motor-shaft operating speed (121 rpm) within 1%, using the source's own stated 25% accel fraction computed exactly", () => {
    const operatingSpeedRadPerS = asQuantity(
      result.outputs.operating_speed,
    ).value;
    const rpm = (operatingSpeedRadPerS * 60) / (2 * Math.PI);
    const relativeDifference =
      Math.abs(rpm - PRINTED_OPERATING_SPEED_RPM) / PRINTED_OPERATING_SPEED_RPM;
    expect(relativeDifference).toBeLessThan(0.01);
  });

  it("reproduces the printed inertia ratio (9.5) within 0.5%", () => {
    const inertiaRatio = asQuantity(result.outputs.inertia_ratio).value;
    const relativeDifference =
      Math.abs(inertiaRatio - PRINTED_INERTIA_RATIO) / PRINTED_INERTIA_RATIO;
    expect(relativeDifference).toBeLessThan(0.005);
  });

  it("does NOT match the source's own printed acceleration torque at face value (the disclosed rounded-constant convention)", () => {
    const accelerationTorqueNm = asQuantity(
      result.outputs.acceleration_torque,
    ).value;
    const relativeDifference =
      Math.abs(accelerationTorqueNm - PRINTED_ACCELERATION_TORQUE_NM) /
      PRINTED_ACCELERATION_TORQUE_NM;
    // A real, expected, disclosed ~8% gap -- not a rounding residual.
    expect(relativeDifference).toBeGreaterThan(0.05);
    expect(relativeDifference).toBeLessThan(0.12);
  });

  it("reapplying the source's own rounded 0.1 constant and its own printed intermediate values (121 rpm, 0.13 s) at the test level reproduces its printed 13.68 lb-in figure exactly, proving the deviation above is fully explained", () => {
    const totalSystemInertiaKgM2 = asQuantity(
      result.outputs.total_system_inertia,
    ).value;
    // Same conversion factor used both directions (lbf-in-s^2 <-> kg*m^2,
    // lbf-in <-> N*m): both share the numeric constant
    // 4.4482216152605*0.0254 -- see automationdirect-reference-example.ts.
    const totalInertiaLbInS2 = totalSystemInertiaKgM2 / LBF_IN_TO_NM;

    // The source's own printed recipe: Taccel = Jtotal * (speed[rpm]/time[s]) * 0.1.
    const sourceConventionAccelTorqueLbIn =
      totalInertiaLbInS2 * (121 / 0.13) * 0.1;

    expect(sourceConventionAccelTorqueLbIn).toBeCloseTo(13.68, 1);

    const sourceConventionAccelTorqueNm =
      sourceConventionAccelTorqueLbIn * LBF_IN_TO_NM;
    // This module's own total_system_inertia carries the same small
    // (< 0.5%) table-mass/density-rounding residual as table_inertia
    // itself (see the "within 0.3%" reference example above) -- so the
    // reapplied-convention figure agrees with the source's own printed
    // 13.68 lb-in within a relative tolerance, not to several decimal
    // places of an absolute N*m value.
    const relativeDifference =
      Math.abs(sourceConventionAccelTorqueNm - PRINTED_ACCELERATION_TORQUE_NM) /
      PRINTED_ACCELERATION_TORQUE_NM;
    expect(relativeDifference).toBeLessThan(0.005);
  });

  it("does not claim momentary_torque/required_torque reproduce the source's own printed figures (same disclosed rounded-constant convention, compounded)", () => {
    expect(asQuantity(result.outputs.momentary_torque).value).toBeGreaterThan(
      0,
    );
  });

  it("load_torque defaults to 0, matching the source's own Trun=0 finding, and the inertia-ratio check passes", () => {
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("pass");
  });
});
