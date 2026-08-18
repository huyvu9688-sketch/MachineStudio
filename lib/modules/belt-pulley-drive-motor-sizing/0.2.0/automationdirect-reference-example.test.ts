import { describe, expect, it } from "vitest";
import { executeModule } from "@/lib/engine";
import { beltPulleyDriveMotorSizingModule } from "./index";
import { asQuantity } from "./test-helpers";
import {
  AUTOMATIONDIRECT_BELT_DRIVE_REFERENCE_EXAMPLE,
  PRINTED_PULLEY_INERTIA_KGM2,
} from "./automationdirect-reference-example";

describe("belt-pulley-drive-motor-sizing 0.2.0: AutomationDirect belt-drive reference example", () => {
  it("reproduces the source's own printed pulley_inertia within 0.2% (carried over unchanged from 0.1.0)", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      AUTOMATIONDIRECT_BELT_DRIVE_REFERENCE_EXAMPLE,
    );
    const pulleyInertia = asQuantity(result.outputs.pulley_inertia).value;
    expect(pulleyInertia).toBeCloseTo(PRINTED_PULLEY_INERTIA_KGM2, 5);
  });

  it("reproduces the source's own printed 4.0s move time as cycle_time, decomposed into 1.0s/2.0s/1.0s/0s", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      AUTOMATIONDIRECT_BELT_DRIVE_REFERENCE_EXAMPLE,
    );
    expect(asQuantity(result.outputs.cycle_time).value).toBeCloseTo(4.0, 9);
    expect(asQuantity(result.outputs.constant_velocity_time).value).toBeCloseTo(
      2.0,
      9,
    );
  });

  it("deceleration_torque equals acceleration_torque -- the source's own symmetric 1.0s/1.0s accel/decel", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      AUTOMATIONDIRECT_BELT_DRIVE_REFERENCE_EXAMPLE,
    );
    expect(asQuantity(result.outputs.deceleration_torque).value).toBeCloseTo(
      asQuantity(result.outputs.acceleration_torque).value,
      9,
    );
  });

  it("computes a positive, finite effective_torque -- not claimed against a printed figure (no worked Trms example in this source; see validation.ts)", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      AUTOMATIONDIRECT_BELT_DRIVE_REFERENCE_EXAMPLE,
    );
    const trms = asQuantity(result.outputs.effective_torque).value;
    expect(Number.isFinite(trms)).toBe(true);
    expect(trms).toBeGreaterThan(0);
  });
});
