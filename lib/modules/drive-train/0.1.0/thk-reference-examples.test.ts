import { describe, expect, it } from "vitest";
import { executeModule } from "@/lib/engine";
import { driveTrainModule } from "./package";
import {
  THK_HORIZONTAL_EFFECTIVE_TORQUE_NM,
  THK_HORIZONTAL_MOMENTARY_TORQUE_NM,
  THK_HORIZONTAL_REFERENCE_EXAMPLE,
  THK_VERTICAL_MOMENTARY_TORQUE_NM,
  THK_VERTICAL_REFERENCE_EXAMPLE,
} from "./thk-reference-examples";
import { asQuantity } from "./test-helpers";

// Reproduces THK Co., Ltd.'s own two published worked examples through the
// module's actual compute path (executeModule) -- see
// ./thk-reference-examples.ts for the full scenarios, sourcing, and
// tolerance reasoning (including why the vertical example's own effective
// torque is deliberately NOT asserted here).

describe("drive-train 0.1.0 THK horizontal reference example (High-speed Transfer Equipment)", () => {
  it("reproduces THK's own maximum momentary torque within 0.05 N*m (~0.3%, consistent with THK's own 3-sig-fig alpha rounding)", () => {
    const computation = executeModule(
      driveTrainModule,
      THK_HORIZONTAL_REFERENCE_EXAMPLE,
    );
    expect(
      asQuantity(computation.outputs.normal_momentary_torque).value,
    ).toBeCloseTo(THK_HORIZONTAL_MOMENTARY_TORQUE_NM, 1);
  });

  it("reproduces THK's own effective (RMS) torque within 0.005 N*m (~0.1%)", () => {
    const computation = executeModule(
      driveTrainModule,
      THK_HORIZONTAL_REFERENCE_EXAMPLE,
    );
    expect(
      asQuantity(computation.outputs.normal_effective_torque).value,
    ).toBeCloseTo(THK_HORIZONTAL_EFFECTIVE_TORQUE_NM, 2);
  });

  it("reproduces THK's own inertia-ratio requirement (J_load/J_motor = 3.39) and passes the check against THK's own 'one tenth' rule (max 10)", () => {
    const computation = executeModule(
      driveTrainModule,
      THK_HORIZONTAL_REFERENCE_EXAMPLE,
    );
    expect(asQuantity(computation.outputs.inertia_ratio).value).toBeCloseTo(
      3.39e-3 / 1e-3,
      6,
    );
    const check = computation.checks.find((c) => c.id === "inertia-ratio");
    expect(check?.status).toBe("pass");
  });

  it("passes every applicable check with a plausible motor supplied above THK's own stated minimum", () => {
    const computation = executeModule(
      driveTrainModule,
      THK_HORIZONTAL_REFERENCE_EXAMPLE,
    );
    for (const check of computation.checks) {
      if (check.id.startsWith("regen-energy-")) {
        // THK's own text never covers regenerative energy, the same
        // treatment Omron's own example gets.
        expect(check.status).toBe("not_applicable");
      } else {
        expect(check.status, `${check.id}: ${check.message}`).toBe("pass");
      }
    }
  });
});

describe("drive-train 0.1.0 THK vertical reference example (Vertical Conveyance System, partial)", () => {
  it("reproduces THK's own upward (governing) maximum momentary torque within 0.05 N*m (~0.4%)", () => {
    const computation = executeModule(
      driveTrainModule,
      THK_VERTICAL_REFERENCE_EXAMPLE,
    );
    expect(
      asQuantity(computation.outputs.normal_momentary_torque).value,
    ).toBeCloseTo(THK_VERTICAL_MOMENTARY_TORQUE_NM, 1);
  });

  it("reproduces THK's own inertia-ratio requirement (J_load/J_motor = 3.16) and passes the check against THK's own 'one tenth' rule (max 10)", () => {
    const computation = executeModule(
      driveTrainModule,
      THK_VERTICAL_REFERENCE_EXAMPLE,
    );
    expect(asQuantity(computation.outputs.inertia_ratio).value).toBeCloseTo(
      1.58e-4 / 5e-5,
      6,
    );
    const check = computation.checks.find((c) => c.id === "inertia-ratio");
    expect(check?.status).toBe("pass");
  });

  it("does NOT reproduce THK's own effective (RMS) torque -- diverges by roughly 21%, a real deviation from this module's own closed-cycle assumption, not a rounding residual", () => {
    // See ./thk-reference-examples.ts's own module doc comment for why:
    // THK's own seven-phase cycle has an asymmetric per-direction load
    // torque (900 N*mm upward vs. 830 N*mm downward) and a nonzero
    // stationary/holding torque (658 N*mm), neither of which the closed-
    // cycle assumption's own "load torque stays constant across the cycle"
    // precondition covers. This test documents the size of the gap rather
    // than silently omitting the comparison.
    const computation = executeModule(
      driveTrainModule,
      THK_VERTICAL_REFERENCE_EXAMPLE,
    );
    const effectiveTorqueNm = asQuantity(
      computation.outputs.normal_effective_torque,
    ).value;
    const thkPrintedEffectiveTorqueNm = 0.743;
    const relativeDeviation =
      Math.abs(effectiveTorqueNm - thkPrintedEffectiveTorqueNm) /
      thkPrintedEffectiveTorqueNm;
    expect(relativeDeviation).toBeGreaterThan(0.15);
    expect(relativeDeviation).toBeLessThan(0.3);
  });

  it("cannot express THK's own downward, gravity-assisted momentary torque (630 N*mm) -- the module's conservative acceleration-torque treatment always adds, never subtracts", () => {
    // math.ts's resolveAccelerationTorque documents this choice explicitly:
    // it bounds the true worst-case single-phase torque rather than
    // modeling a gravity-assisted direction's own lower requirement.
    const computation = executeModule(
      driveTrainModule,
      THK_VERTICAL_REFERENCE_EXAMPLE,
    );
    const momentaryTorqueNm = asQuantity(
      computation.outputs.normal_momentary_torque,
    ).value;
    expect(momentaryTorqueNm).toBeGreaterThan(0.63);
  });

  it("passes every applicable check with a plausible motor supplied above the module's own computed effective torque", () => {
    const computation = executeModule(
      driveTrainModule,
      THK_VERTICAL_REFERENCE_EXAMPLE,
    );
    for (const check of computation.checks) {
      if (check.id.startsWith("regen-energy-")) {
        expect(check.status).toBe("not_applicable");
      } else {
        expect(check.status, `${check.id}: ${check.message}`).toBe("pass");
      }
    }
  });
});
