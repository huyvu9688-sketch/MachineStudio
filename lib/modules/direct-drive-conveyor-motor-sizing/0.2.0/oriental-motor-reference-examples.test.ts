import { describe, expect, it } from "vitest";
import { executeModule } from "@/lib/engine";
import { directDriveConveyorMotorSizingModule } from "./index";
import { asQuantity } from "./test-helpers";
import {
  ORIENTAL_MOTOR_F8_BELT_AND_PULLEY_REFERENCE_EXAMPLE,
  ORIENTAL_MOTOR_F8_LOAD_TORQUE_NM,
  ORIENTAL_MOTOR_F8_ON_SHAFT_INERTIA_KGM2,
  ORIENTAL_MOTOR_F8_OPERATING_SPEED_RPM,
  ORIENTAL_MOTOR_F9_CONVEYOR_REFERENCE_EXAMPLE,
  ORIENTAL_MOTOR_F9_LOAD_TORQUE_NM,
} from "./oriental-motor-reference-examples";

describe("direct-drive-conveyor-motor-sizing 0.1.0: Oriental Motor Co., Ltd.'s own 'Belt and Pully' worked example (p. F-8), through executeModule", () => {
  it("reproduces load torque, on-shaft inertia (less the unsourced motor rotor), and operating speed", () => {
    const result = executeModule(
      directDriveConveyorMotorSizingModule,
      ORIENTAL_MOTOR_F8_BELT_AND_PULLEY_REFERENCE_EXAMPLE,
    );

    expect(asQuantity(result.outputs.load_torque).value).toBeCloseTo(
      ORIENTAL_MOTOR_F8_LOAD_TORQUE_NM,
      4,
    );

    const motorRotorInertiaKgM2 = 1e-5; // matches the fixture's own input.
    const onShaftInertiaKgM2 =
      asQuantity(result.outputs.total_system_inertia).value -
      motorRotorInertiaKgM2;
    expect(onShaftInertiaKgM2).toBeCloseTo(
      ORIENTAL_MOTOR_F8_ON_SHAFT_INERTIA_KGM2,
      5,
    );

    const operatingSpeedRadPerS = asQuantity(
      result.outputs.operating_speed,
    ).value;
    const rpm = (operatingSpeedRadPerS * 60) / (2 * Math.PI);
    expect(rpm).toBeCloseTo(ORIENTAL_MOTOR_F8_OPERATING_SPEED_RPM, 1);
  });

  it("does NOT claim to reproduce a printed acceleration_torque/momentary_torque/required_torque figure -- neither reference example computes one (validation.ts 'deviations')", () => {
    const result = executeModule(
      directDriveConveyorMotorSizingModule,
      ORIENTAL_MOTOR_F8_BELT_AND_PULLEY_REFERENCE_EXAMPLE,
    );
    // Sanity only: the kernel produces a real, positive figure using this
    // fixture's own unsourced acceleration_time -- not compared against
    // any printed value, since the source prints none.
    expect(
      asQuantity(result.outputs.acceleration_torque).value,
    ).toBeGreaterThan(0);
    expect(asQuantity(result.outputs.momentary_torque).value).toBeGreaterThan(
      asQuantity(result.outputs.load_torque).value,
    );
  });
});

describe("direct-drive-conveyor-motor-sizing 0.1.0: Oriental Motor Co., Ltd.'s own 'Conveyor' worked example (p. F-9), through executeModule", () => {
  it("reproduces load torque only -- the source's own printed inertia figure is internally inconsistent and is not reproduced (validation.ts 'deviations')", () => {
    const result = executeModule(
      directDriveConveyorMotorSizingModule,
      ORIENTAL_MOTOR_F9_CONVEYOR_REFERENCE_EXAMPLE,
    );

    expect(asQuantity(result.outputs.load_torque).value).toBeCloseTo(
      ORIENTAL_MOTOR_F9_LOAD_TORQUE_NM,
      4,
    );
  });
});
