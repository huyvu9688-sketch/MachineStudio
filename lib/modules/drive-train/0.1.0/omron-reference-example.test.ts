import { describe, expect, it } from "vitest";
import { executeModule } from "@/lib/engine";
import { driveTrainModule } from "./index";
import {
  OMRON_ACCELERATION_TORQUE_NM,
  OMRON_EFFECTIVE_TORQUE_NM,
  OMRON_MOMENTARY_TORQUE_NM,
  OMRON_REFERENCE_EXAMPLE,
} from "./omron-reference-example";
import { asQuantity } from "./test-helpers";

// Reproduces Omron Corporation's own complete worked numerical example
// through the module's actual compute path (executeModule), not just the
// kernel formula level ./math.test.ts already covers -- see
// ./omron-reference-example.ts for the full scenario, sourcing, and
// tolerance reasoning.

describe("drive-train 0.1.0 Omron R88M-U20030 reference example", () => {
  it("reproduces Omron's own acceleration torque within 0.001 N*m", () => {
    const computation = executeModule(
      driveTrainModule,
      OMRON_REFERENCE_EXAMPLE,
    );
    expect(
      asQuantity(computation.outputs.acceleration_torque).value,
    ).toBeCloseTo(OMRON_ACCELERATION_TORQUE_NM, 3);
  });

  it("reproduces Omron's own maximum momentary torque within 0.001 N*m", () => {
    const computation = executeModule(
      driveTrainModule,
      OMRON_REFERENCE_EXAMPLE,
    );
    expect(
      asQuantity(computation.outputs.normal_momentary_torque).value,
    ).toBeCloseTo(OMRON_MOMENTARY_TORQUE_NM, 3);
  });

  it("reproduces Omron's own effective (RMS) torque within 0.0003 N*m", () => {
    const computation = executeModule(
      driveTrainModule,
      OMRON_REFERENCE_EXAMPLE,
    );
    expect(
      asQuantity(computation.outputs.normal_effective_torque).value,
    ).toBeCloseTo(OMRON_EFFECTIVE_TORQUE_NM, 3);
  });

  it("reproduces Omron's own inertia ratio (~13.25) and passes the check against 30", () => {
    const computation = executeModule(
      driveTrainModule,
      OMRON_REFERENCE_EXAMPLE,
    );
    expect(asQuantity(computation.outputs.inertia_ratio).value).toBeCloseTo(
      1.63e-4 / 1.23e-5,
      6,
    );
    const check = computation.checks.find((c) => c.id === "inertia-ratio");
    expect(check?.status).toBe("pass");
  });

  it("passes every applicable check, matching Omron's own 'Result of Examination' table", () => {
    const computation = executeModule(
      driveTrainModule,
      OMRON_REFERENCE_EXAMPLE,
    );
    for (const check of computation.checks) {
      if (check.id.startsWith("regen-energy-")) {
        // Omron's own text explicitly omits the regenerative-energy
        // calculation; no drive.regen_absorption_capacity is supplied.
        expect(check.status).toBe("not_applicable");
      } else {
        expect(check.status, `${check.id}: ${check.message}`).toBe("pass");
      }
    }
  });

  it("reports the regenerative-energy check as not_applicable, matching Omron's own text", () => {
    const computation = executeModule(
      driveTrainModule,
      OMRON_REFERENCE_EXAMPLE,
    );
    const check = computation.checks.find(
      (c) => c.id === "regen-energy-normal",
    );
    expect(check?.status).toBe("not_applicable");
  });
});
