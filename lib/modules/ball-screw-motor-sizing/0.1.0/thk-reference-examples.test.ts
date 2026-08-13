import { describe, expect, it } from "vitest";
import { executeModule } from "@/lib/engine";
import { ballScrewMotorSizingModule } from "./index";
import { resolveEffectiveTorque } from "./math";
import {
  THK_HORIZONTAL_EFFECTIVE_TORQUE_NM,
  THK_HORIZONTAL_LOAD_INERTIA_KG_M2,
  THK_HORIZONTAL_LOAD_TORQUE_NM,
  THK_HORIZONTAL_MOMENTARY_TORQUE_NM,
  THK_HORIZONTAL_REFERENCE_EXAMPLE,
  THK_VERTICAL_DOWNWARD_LOAD_TORQUE_MAGNITUDE_NM,
  THK_VERTICAL_EFFECTIVE_TORQUE_NO_HOLDING_NM,
  THK_VERTICAL_LOAD_INERTIA_KG_M2,
  THK_VERTICAL_MOMENTARY_TORQUE_NM,
  THK_VERTICAL_PRINTED_EFFECTIVE_TORQUE_NM,
  THK_VERTICAL_PRINTED_PHASES,
  THK_VERTICAL_REFERENCE_EXAMPLE,
  THK_VERTICAL_UPWARD_LOAD_TORQUE_NM,
} from "./thk-reference-examples";
import { asQuantity } from "./test-helpers";

// Reproduces THK Co., Ltd.'s own two published worked examples through this
// module's actual compute path (executeModule) -- see
// ./thk-reference-examples.ts for the full scenarios, sourcing, and
// tolerance reasoning (including why the vertical example's own
// executeModule effective_torque is deliberately NOT expected to match
// THK's own printed 743 N*mm, and why that is a disclosed scope gap, not a
// defect).

describe("ball-screw-motor-sizing 0.1.0 THK horizontal reference example (High-speed Transfer Equipment)", () => {
  it("reproduces THK's own screw+load inertia (J=3.39e-3 kg*m^2) within 0.5%", () => {
    const result = executeModule(
      ballScrewMotorSizingModule,
      THK_HORIZONTAL_REFERENCE_EXAMPLE,
    );
    const loadInertia = asQuantity(result.outputs.load_inertia).value;
    expect(
      Math.abs(loadInertia - THK_HORIZONTAL_LOAD_INERTIA_KG_M2) /
        THK_HORIZONTAL_LOAD_INERTIA_KG_M2,
    ).toBeLessThan(0.005);
  });

  it("reproduces THK's own friction (load) torque within 1% (T1=120 N*mm)", () => {
    const result = executeModule(
      ballScrewMotorSizingModule,
      THK_HORIZONTAL_REFERENCE_EXAMPLE,
    );
    const loadTorque = asQuantity(result.outputs.forward_load_torque).value;
    expect(
      Math.abs(loadTorque - THK_HORIZONTAL_LOAD_TORQUE_NM) /
        THK_HORIZONTAL_LOAD_TORQUE_NM,
    ).toBeLessThan(0.01);
  });

  it("reproduces THK's own maximum momentary torque within 0.5% (Tk=4730 N*mm)", () => {
    const result = executeModule(
      ballScrewMotorSizingModule,
      THK_HORIZONTAL_REFERENCE_EXAMPLE,
    );
    const momentary = asQuantity(result.outputs.momentary_torque).value;
    expect(
      Math.abs(momentary - THK_HORIZONTAL_MOMENTARY_TORQUE_NM) /
        THK_HORIZONTAL_MOMENTARY_TORQUE_NM,
    ).toBeLessThan(0.005);
  });

  it("reproduces THK's own effective (RMS) torque within 1% (Trms=1305 N*mm) -- the baseline confirmation that generalizing to N phases did not break the case drive-train@0.1.0's own closed form already handled correctly", () => {
    const result = executeModule(
      ballScrewMotorSizingModule,
      THK_HORIZONTAL_REFERENCE_EXAMPLE,
    );
    const effective = asQuantity(result.outputs.effective_torque).value;
    expect(
      Math.abs(effective - THK_HORIZONTAL_EFFECTIVE_TORQUE_NM) /
        THK_HORIZONTAL_EFFECTIVE_TORQUE_NM,
    ).toBeLessThan(0.01);
  });

  it("passes the inertia-ratio check against THK's own 'one tenth' rule", () => {
    const result = executeModule(
      ballScrewMotorSizingModule,
      THK_HORIZONTAL_REFERENCE_EXAMPLE,
    );
    const check = result.checks.find((c) => c.id === "inertia-ratio");
    expect(check?.status).toBe("pass");
  });
});

describe("ball-screw-motor-sizing 0.1.0 THK vertical reference example (Vertical Conveyance System)", () => {
  it("reproduces THK's own upward and downward friction (load) torque magnitudes within 1% (T1=900 N*mm, T2=830 N*mm)", () => {
    const result = executeModule(
      ballScrewMotorSizingModule,
      THK_VERTICAL_REFERENCE_EXAMPLE,
    );
    const forward = asQuantity(result.outputs.forward_load_torque).value;
    const returnValue = asQuantity(result.outputs.return_load_torque).value;

    // forward_load_torque is reported signed-positive (the "driving into
    // forward" convention); return_load_torque comes out signed-negative
    // (the "driving into return" convention, per math.ts's own
    // resolveDriveForce doc comment) -- both magnitudes match THK's own
    // printed T1/T2, which are reported unsigned (see
    // ./thk-reference-examples.ts's own module doc comment for the full
    // sign-convention reconciliation).
    expect(
      Math.abs(forward - THK_VERTICAL_UPWARD_LOAD_TORQUE_NM) /
        THK_VERTICAL_UPWARD_LOAD_TORQUE_NM,
    ).toBeLessThan(0.01);
    expect(returnValue).toBeLessThan(0);
    expect(
      Math.abs(
        Math.abs(returnValue) -
          THK_VERTICAL_DOWNWARD_LOAD_TORQUE_MAGNITUDE_NM,
      ) / THK_VERTICAL_DOWNWARD_LOAD_TORQUE_MAGNITUDE_NM,
    ).toBeLessThan(0.01);
  });

  it("reproduces THK's own screw+load inertia (J=1.58e-4 kg*m^2) within 1%", () => {
    const result = executeModule(
      ballScrewMotorSizingModule,
      THK_VERTICAL_REFERENCE_EXAMPLE,
    );
    const loadInertia = asQuantity(result.outputs.load_inertia).value;
    expect(
      Math.abs(loadInertia - THK_VERTICAL_LOAD_INERTIA_KG_M2) /
        THK_VERTICAL_LOAD_INERTIA_KG_M2,
    ).toBeLessThan(0.01);
  });

  it("reproduces THK's own governing maximum momentary torque within 0.5% (Tk1=1100 N*mm)", () => {
    const result = executeModule(
      ballScrewMotorSizingModule,
      THK_VERTICAL_REFERENCE_EXAMPLE,
    );
    const momentary = asQuantity(result.outputs.momentary_torque).value;
    expect(
      Math.abs(momentary - THK_VERTICAL_MOMENTARY_TORQUE_NM) /
        THK_VERTICAL_MOMENTARY_TORQUE_NM,
    ).toBeLessThan(0.005);
  });

  it("passes the inertia-ratio check against THK's own 'one tenth' rule", () => {
    const result = executeModule(
      ballScrewMotorSizingModule,
      THK_VERTICAL_REFERENCE_EXAMPLE,
    );
    const check = result.checks.find((c) => c.id === "inertia-ratio");
    expect(check?.status).toBe("pass");
  });

  it("does NOT reproduce THK's own printed effective (RMS) torque of 743 N*mm through executeModule -- understates it by ~29%, a real, disclosed deviation from the dwell-holding-torque scope gap, not a rounding residual", () => {
    // See ./thk-reference-examples.ts's own module doc comment: THK's own
    // stationary phase carries a real 658 N*mm holding torque over 7.6 of
    // the cycle's 12s, which this module's own compute.ts deliberately does
    // not model (dwell always contributes 0 torque -- README.md "Not in
    // scope for 0.1.0"). This test documents the size of that already-
    // disclosed gap with a real number, rather than omitting the
    // comparison.
    const result = executeModule(
      ballScrewMotorSizingModule,
      THK_VERTICAL_REFERENCE_EXAMPLE,
    );
    const effective = asQuantity(result.outputs.effective_torque).value;
    expect(effective).toBeCloseTo(
      THK_VERTICAL_EFFECTIVE_TORQUE_NO_HOLDING_NM,
      2,
    );
    const relativeDeviation =
      Math.abs(effective - THK_VERTICAL_PRINTED_EFFECTIVE_TORQUE_NM) /
      THK_VERTICAL_PRINTED_EFFECTIVE_TORQUE_NM;
    expect(relativeDeviation).toBeGreaterThan(0.2);
    expect(relativeDeviation).toBeLessThan(0.35);
  });
});

describe("ball-screw-motor-sizing 0.1.0: the N-phase Trms formula itself, fed THK's own seven printed vertical phases directly (the key Stage 4 validation target)", () => {
  it("reproduces THK's own printed 743 N*mm within 0.5% when given the same seven phases THK itself used, including the 658 N*mm holding torque this module's own executeModule path does not model", () => {
    // This is the direct test of ADR-0011's own structural fix (a genuine
    // N-phase RMS computation replacing drive-train@0.1.0's own closed-form
    // approximation): resolveEffectiveTorque is a pure function of whatever
    // phases it is given, so feeding it THK's own seven printed
    // torque/duration pairs directly (kernel level, not through
    // executeModule -- this module's own compute.ts has no way to declare
    // a distinct holding-torque phase) isolates the formula's own
    // correctness from the separate, already-disclosed dwell-holding-torque
    // scope gap the executeModule-path test above documents.
    const { effectiveTorqueNm } = resolveEffectiveTorque(
      THK_VERTICAL_PRINTED_PHASES.map((phase) => ({
        durationS: phase.durationS,
        torqueNm: phase.torqueNm,
      })),
    );
    expect(
      Math.abs(effectiveTorqueNm - THK_VERTICAL_PRINTED_EFFECTIVE_TORQUE_NM) /
        THK_VERTICAL_PRINTED_EFFECTIVE_TORQUE_NM,
    ).toBeLessThan(0.005);
  });
});
