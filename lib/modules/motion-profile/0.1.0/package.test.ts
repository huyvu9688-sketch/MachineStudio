import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { motionProfileModule } from "./package";
import { asQuantity, type RawInput } from "./test-helpers";

/** A minimal, valid trapezoidal-move scenario exercising every required port. */
function baselineInput(): RawInput {
  return {
    values: {
      move_distance: makeQuantity(1, "m"),
      max_velocity: makeQuantity(1, "m/s"),
      max_acceleration: makeQuantity(2, "m/s^2"),
    },
  };
}

/** A scenario too short to reach the velocity ceiling (triangular profile). */
function triangularInput(): RawInput {
  return {
    values: {
      move_distance: makeQuantity(0.1, "m"),
      max_velocity: makeQuantity(1, "m/s"),
      max_acceleration: makeQuantity(2, "m/s^2"),
    },
  };
}

/** The baseline trapezoidal move followed by a 1 s dwell. */
function withDwellInput(): RawInput {
  const input = baselineInput();
  input.values.dwell_time = makeQuantity(1, "s");
  return input;
}

describe("motion-profile 0.1.0 module conformance", () => {
  const report = runModuleConformance(motionProfileModule, {
    sampleInputs: [baselineInput(), triangularInput(), withDwellInput()],
  });

  for (const check of report.checks) {
    it(`${check.id} (${check.status})`, () => {
      expect(check.status, check.detail).not.toBe("fail");
    });
  }

  it("passes overall conformance", () => {
    expect(report.ok, JSON.stringify(report.checks, null, 2)).toBe(true);
  });
});

describe("motion-profile 0.1.0 boundary and invalid input", () => {
  it("requires move_distance, max_velocity, and max_acceleration", () => {
    const input = baselineInput();
    delete input.values.max_velocity;
    expect(() => executeModule(motionProfileModule, input)).toThrow();
  });

  it("rejects a non-positive move distance", () => {
    const input = baselineInput();
    input.values.move_distance = makeQuantity(0, "m");
    expect(() => executeModule(motionProfileModule, input)).toThrow();
  });

  it("rejects a non-positive acceleration ceiling", () => {
    const input = baselineInput();
    input.values.max_acceleration = makeQuantity(-1, "m/s^2");
    expect(() => executeModule(motionProfileModule, input)).toThrow();
  });

  it("rejects a value in the wrong unit dimension", () => {
    const input = baselineInput();
    input.values.move_distance = makeQuantity(1, "kg");
    expect(() => executeModule(motionProfileModule, input)).toThrow();
  });

  it("rejects a negative dwell time", () => {
    const input = withDwellInput();
    input.values.dwell_time = makeQuantity(-1, "s");
    expect(() => executeModule(motionProfileModule, input)).toThrow();
  });
});

describe("motion-profile 0.1.0 outputs", () => {
  it("produces dimensionally correct output units", () => {
    const computation = executeModule(motionProfileModule, baselineInput());
    expect(computation.outputs.move_time).toMatchObject({ unit: "s" });
    expect(computation.outputs.cycle_time).toMatchObject({ unit: "s" });
    expect(computation.outputs.peak_velocity).toMatchObject({ unit: "m/s" });
    expect(computation.outputs.peak_acceleration).toMatchObject({
      unit: "m/s^2",
    });
    expect(computation.outputs.peak_deceleration).toMatchObject({
      unit: "m/s^2",
    });
    expect(computation.outputs.rms_acceleration).toMatchObject({
      unit: "m/s^2",
    });
  });

  it("reproduces the trapezoidal move's own hand-derived values", () => {
    const computation = executeModule(motionProfileModule, baselineInput());
    expect(asQuantity(computation.outputs.peak_velocity).value).toBe(1);
    expect(asQuantity(computation.outputs.move_time).value).toBeCloseTo(
      1.5,
      12,
    );
    expect(computation.warnings).toHaveLength(0);
  });

  it("resolves a triangular move with a peak velocity below the ceiling and a warning", () => {
    const computation = executeModule(motionProfileModule, triangularInput());
    const peakVelocity = asQuantity(computation.outputs.peak_velocity).value;
    expect(peakVelocity).toBeLessThan(1);
    expect(peakVelocity).toBeCloseTo(Math.sqrt(0.2), 12);
    expect(computation.warnings).toHaveLength(1);
    expect(computation.warnings[0].id).toBe("triangular-profile");
  });

  it("passes every applicable acceptance check for a valid input with no dwell", () => {
    const computation = executeModule(motionProfileModule, baselineInput());
    for (const check of computation.checks) {
      if (check.id === "dwell-time-non-negative") {
        expect(check.status).toBe("not_applicable");
      } else {
        expect(check.status).toBe("pass");
      }
    }
  });
});

describe("motion-profile 0.1.0 cycle (move plus optional dwell)", () => {
  it("without a dwell, cycle_time equals move_time and peak/RMS values match the bare move", () => {
    const withoutDwell = executeModule(motionProfileModule, baselineInput());
    expect(asQuantity(withoutDwell.outputs.cycle_time).value).toBeCloseTo(
      asQuantity(withoutDwell.outputs.move_time).value,
      12,
    );
    expect(
      asQuantity(withoutDwell.outputs.rms_acceleration).value,
    ).toBeGreaterThan(0);
  });

  it("adding a dwell increases cycle_time by the dwell duration without changing peak values", () => {
    const withoutDwell = executeModule(motionProfileModule, baselineInput());
    const withDwell = executeModule(motionProfileModule, withDwellInput());

    expect(asQuantity(withDwell.outputs.cycle_time).value).toBeCloseTo(
      asQuantity(withoutDwell.outputs.cycle_time).value + 1,
      12,
    );
    expect(asQuantity(withDwell.outputs.peak_velocity).value).toBe(
      asQuantity(withoutDwell.outputs.peak_velocity).value,
    );
    expect(asQuantity(withDwell.outputs.peak_acceleration).value).toBe(
      asQuantity(withoutDwell.outputs.peak_acceleration).value,
    );
    expect(asQuantity(withDwell.outputs.rms_acceleration).value).toBeLessThan(
      asQuantity(withoutDwell.outputs.rms_acceleration).value,
    );
  });

  it("passes the dwell-time-non-negative check when a valid dwell is supplied", () => {
    const computation = executeModule(motionProfileModule, withDwellInput());
    const dwellCheck = computation.checks.find(
      (check) => check.id === "dwell-time-non-negative",
    );
    expect(dwellCheck?.status).toBe("pass");
  });
});
