import { describe, expect, it } from "vitest";
import { executeModule } from "@/lib/engine";
import {
  AUTOMATIONDIRECT_BELT_DRIVE_REFERENCE_EXAMPLE,
  PRINTED_LOAD_INERTIA_WITH_EFFICIENCY_KGM2,
  PRINTED_PULLEY_INERTIA_KGM2,
  PRINTED_REFLECTED_INERTIA_WITH_EFFICIENCY_KGM2,
} from "./automationdirect-reference-example";
import { beltPulleyDriveMotorSizingModule } from "./index";
import { asQuantity } from "./test-helpers";

// Reference-example evidence for belt-pulley-drive-motor-sizing@0.1.0
// (stage-1-spec.md "Reference Example", validation.ts): AutomationDirect's
// own "Belt Drive - Example Calculations" worked example (SureServo
// Selection Appendix, pp. B-11-B-13), the first fully worked, publicly
// citable belt-drive motor-sizing example located for this project,
// reproduced through this module's own real executeModule compute path.
//
// pulley_inertia is efficiency-independent in BOTH sources' own
// conventions (neither AutomationDirect's own J_pulleys formula nor this
// module's own resolvePulleyInertia divides pulley inertia by efficiency),
// so it is asserted as an unqualified reproduction of the printed figure.
//
// load_inertia and the reflected-to-motor inertia are NOT asserted against
// AutomationDirect's own printed figures directly: those printed figures
// bake in AutomationDirect's own disclosed convention of dividing the
// CARRIAGE's inertia by mechanical efficiency (e=0.8), a convention this
// module does not follow (stage-1-spec.md "A real disagreement between
// sources" -- this module follows Oriental Motor's convention instead,
// applying efficiency to load_torque). Reapplying that same disclosed 1/e
// factor at the TEST level -- not inside the module's own kernel --
// reproduces the printed figures precisely, proving the underlying
// carriage-inertia physics is correct and the only source of difference
// from the printed figures is the already-disclosed, already-quantified
// efficiency-convention choice (validation.ts "referenceExamples").
//
// acceleration_torque and inertia_ratio are exercised (the compute path
// runs end to end and produces a sensible result) but not asserted against
// AutomationDirect's own printed T_accel/inertia-ratio figures: both
// depend on a candidate motor rotor inertia the source's own worked
// example does not print as an independent figure, and two different ways
// of back-solving it from the printed figures disagree by ~15-20% --
// itself a genuine, disclosed evidence gap recorded in validation.ts
// "supportedUseLimits", not a defect in this module's own math.

const MECHANICAL_EFFICIENCY = 0.8;

describe("belt-pulley-drive-motor-sizing 0.1.0 vs. AutomationDirect's own 'Belt Drive - Example Calculations' worked example (pp. B-11-B-13), through executeModule", () => {
  const result = executeModule(
    beltPulleyDriveMotorSizingModule,
    AUTOMATIONDIRECT_BELT_DRIVE_REFERENCE_EXAMPLE,
  );

  it("reproduces the printed combined pulley inertia (J_pulleys, efficiency-independent) within 0.2%", () => {
    const pulleyInertiaKgM2 = asQuantity(result.outputs.pulley_inertia).value;
    const relativeDifference =
      Math.abs(pulleyInertiaKgM2 - PRINTED_PULLEY_INERTIA_KGM2) /
      PRINTED_PULLEY_INERTIA_KGM2;
    expect(relativeDifference).toBeLessThan(0.002);
  });

  it("reproduces the printed carriage-only load inertia (J_W) once AutomationDirect's own disclosed 1/e convention is reapplied at the test level", () => {
    const loadInertiaKgM2 = asQuantity(result.outputs.load_inertia).value;
    const pulleyInertiaKgM2 = asQuantity(result.outputs.pulley_inertia).value;
    // belt_mass is 0 in this fixture, so load_inertia - pulley_inertia
    // isolates the carriage-only term this module's own kernel computes
    // with no efficiency division.
    const carriageInertiaKgM2 = loadInertiaKgM2 - pulleyInertiaKgM2;
    const adjustedForEfficiencyKgM2 =
      carriageInertiaKgM2 / MECHANICAL_EFFICIENCY;

    const relativeDifference =
      Math.abs(
        adjustedForEfficiencyKgM2 - PRINTED_LOAD_INERTIA_WITH_EFFICIENCY_KGM2,
      ) / PRINTED_LOAD_INERTIA_WITH_EFFICIENCY_KGM2;
    expect(relativeDifference).toBeLessThan(0.001);
  });

  it("this module's own unadjusted load_inertia is smaller than the printed J_W by exactly the disclosed 1/e factor (not an unexplained residual)", () => {
    const loadInertiaKgM2 = asQuantity(result.outputs.load_inertia).value;
    const pulleyInertiaKgM2 = asQuantity(result.outputs.pulley_inertia).value;
    const carriageInertiaKgM2 = loadInertiaKgM2 - pulleyInertiaKgM2;

    // Printed J_W is carriage-only (it excludes J_pulleys -- stage-1-spec.md's
    // own table lists them as separate rows), so the ratio below isolates
    // exactly the efficiency-convention difference.
    const ratio =
      carriageInertiaKgM2 / PRINTED_LOAD_INERTIA_WITH_EFFICIENCY_KGM2;
    expect(ratio).toBeCloseTo(MECHANICAL_EFFICIENCY, 2);
  });

  it("reproduces the printed reflected-to-motor inertia once the same disclosed 1/e convention is reapplied", () => {
    const loadInertiaKgM2 = asQuantity(result.outputs.load_inertia).value;
    const pulleyInertiaKgM2 = asQuantity(result.outputs.pulley_inertia).value;
    const carriageInertiaKgM2 = loadInertiaKgM2 - pulleyInertiaKgM2;
    const gearRatio = 10;

    const adjustedReflectedKgM2 =
      (pulleyInertiaKgM2 + carriageInertiaKgM2 / MECHANICAL_EFFICIENCY) /
      gearRatio ** 2;

    const relativeDifference =
      Math.abs(
        adjustedReflectedKgM2 - PRINTED_REFLECTED_INERTIA_WITH_EFFICIENCY_KGM2,
      ) / PRINTED_REFLECTED_INERTIA_WITH_EFFICIENCY_KGM2;
    expect(relativeDifference).toBeLessThan(0.001);
  });

  it("exercises acceleration_torque and inertia_ratio end to end without claiming a numeric match to the printed figures (see this file's own header comment)", () => {
    expect(
      asQuantity(result.outputs.acceleration_torque).value,
    ).toBeGreaterThan(0);
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("pass");
  });

  it("does not claim load_torque/momentary_torque/required_torque reproduce AutomationDirect's own printed figures (arithmetic slip + efficiency-convention divergence, both disclosed)", () => {
    expect(asQuantity(result.outputs.load_torque).value).toBeGreaterThan(0);
  });
});
