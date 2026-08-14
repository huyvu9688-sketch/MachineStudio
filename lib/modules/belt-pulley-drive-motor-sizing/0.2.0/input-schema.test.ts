import { describe, expect, it } from "vitest";
import { inputSchema } from "./input-schema";

const BASE_VALUES: Record<string, unknown> = {
  orientation: {
    v: 1,
    kind: "enum",
    enumId: "axis_orientation",
    value: "horizontal",
  },
  incline_angle: { v: 1, kind: "quantity", value: 0, unit: "rad" },
  friction_coefficient: { v: 1, kind: "quantity", value: 0.1, unit: "ratio" },
  total_moving_mass: { v: 1, kind: "quantity", value: 50, unit: "kg" },
  pulley_pitch_diameter: { v: 1, kind: "quantity", value: 0.08, unit: "m" },
  pulley_mass: { v: 1, kind: "quantity", value: 1, unit: "kg" },
  idler_pulley_mass: { v: 1, kind: "quantity", value: 1, unit: "kg" },
  mechanical_efficiency: { v: 1, kind: "quantity", value: 0.9, unit: "ratio" },
  acceleration_time: { v: 1, kind: "quantity", value: 0.5, unit: "s" },
  deceleration_time: { v: 1, kind: "quantity", value: 0.5, unit: "s" },
  motor_rotor_inertia: { v: 1, kind: "quantity", value: 5e-3, unit: "kg*m^2" },
  required_torque_safety_factor: {
    v: 1,
    kind: "quantity",
    value: 2,
    unit: "ratio",
  },
  inertia_ratio_maximum: { v: 1, kind: "quantity", value: 30, unit: "ratio" },
};

function velocityModeValues(): Record<string, unknown> {
  return {
    ...BASE_VALUES,
    motion_mode: {
      v: 1,
      kind: "enum",
      enumId: "belt_pulley_motion_mode",
      value: "velocity",
    },
    target_velocity: { v: 1, kind: "quantity", value: 0.5, unit: "m/s" },
    constant_velocity_time: { v: 1, kind: "quantity", value: 1, unit: "s" },
  };
}

function distanceModeValues(): Record<string, unknown> {
  return {
    ...BASE_VALUES,
    motion_mode: {
      v: 1,
      kind: "enum",
      enumId: "belt_pulley_motion_mode",
      value: "distance",
    },
    travel_distance: { v: 1, kind: "quantity", value: 1, unit: "m" },
    cycle_time: { v: 1, kind: "quantity", value: 3, unit: "s" },
  };
}

describe("belt-pulley-drive-motor-sizing 0.2.0 input-schema", () => {
  it("accepts velocity mode with target_velocity and constant_velocity_time present", () => {
    const result = inputSchema.safeParse({ values: velocityModeValues() });
    expect(result.success).toBe(true);
  });

  it("rejects velocity mode missing constant_velocity_time", () => {
    const values = velocityModeValues();
    delete values.constant_velocity_time;
    const result = inputSchema.safeParse({ values });
    expect(result.success).toBe(false);
  });

  it("rejects velocity mode missing target_velocity", () => {
    const values = velocityModeValues();
    delete values.target_velocity;
    const result = inputSchema.safeParse({ values });
    expect(result.success).toBe(false);
  });

  it("accepts distance mode with travel_distance and cycle_time present", () => {
    const result = inputSchema.safeParse({ values: distanceModeValues() });
    expect(result.success).toBe(true);
  });

  it("rejects distance mode missing cycle_time", () => {
    const values = distanceModeValues();
    delete values.cycle_time;
    const result = inputSchema.safeParse({ values });
    expect(result.success).toBe(false);
  });

  it("rejects distance mode missing travel_distance", () => {
    const values = distanceModeValues();
    delete values.travel_distance;
    const result = inputSchema.safeParse({ values });
    expect(result.success).toBe(false);
  });
});
