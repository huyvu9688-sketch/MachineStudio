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
      move_1_distance: makeQuantity(1, "m"),
      move_1_max_velocity: makeQuantity(1, "m/s"),
      move_1_max_acceleration: makeQuantity(2, "m/s^2"),
    },
  };
}

/** A scenario too short to reach the velocity ceiling (triangular profile). */
function triangularInput(): RawInput {
  return {
    values: {
      move_1_distance: makeQuantity(0.1, "m"),
      move_1_max_velocity: makeQuantity(1, "m/s"),
      move_1_max_acceleration: makeQuantity(2, "m/s^2"),
    },
  };
}

/** The baseline trapezoidal move followed by a 1 s dwell. */
function withDwellInput(): RawInput {
  const input = baselineInput();
  input.values.dwell_1_time = makeQuantity(1, "s");
  return input;
}

/** Two moves back to back, no dwells. */
function twoMoveInput(): RawInput {
  const input = baselineInput();
  input.values.move_2_distance = makeQuantity(2, "m");
  input.values.move_2_max_velocity = makeQuantity(1, "m/s");
  input.values.move_2_max_acceleration = makeQuantity(2, "m/s^2");
  return input;
}

/** All five supported moves, each followed by its own dwell. */
function fiveMoveInput(): RawInput {
  const values: Record<string, unknown> = {};
  for (let index = 1; index <= 5; index++) {
    values[`move_${index}_distance`] = makeQuantity(1, "m");
    values[`move_${index}_max_velocity`] = makeQuantity(1, "m/s");
    values[`move_${index}_max_acceleration`] = makeQuantity(2, "m/s^2");
    values[`dwell_${index}_time`] = makeQuantity(0.5, "s");
  }
  return { values };
}

describe("motion-profile 0.1.0 module conformance", () => {
  const report = runModuleConformance(motionProfileModule, {
    sampleInputs: [
      baselineInput(),
      triangularInput(),
      withDwellInput(),
      twoMoveInput(),
      fiveMoveInput(),
    ],
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
  it("requires move_1_distance, move_1_max_velocity, and move_1_max_acceleration", () => {
    const input = baselineInput();
    delete input.values.move_1_max_velocity;
    expect(() => executeModule(motionProfileModule, input)).toThrow();
  });

  it("rejects a non-positive move distance", () => {
    const input = baselineInput();
    input.values.move_1_distance = makeQuantity(0, "m");
    expect(() => executeModule(motionProfileModule, input)).toThrow();
  });

  it("rejects a non-positive acceleration ceiling", () => {
    const input = baselineInput();
    input.values.move_1_max_acceleration = makeQuantity(-1, "m/s^2");
    expect(() => executeModule(motionProfileModule, input)).toThrow();
  });

  it("rejects a value in the wrong unit dimension", () => {
    const input = baselineInput();
    input.values.move_1_distance = makeQuantity(1, "kg");
    expect(() => executeModule(motionProfileModule, input)).toThrow();
  });

  it("rejects a negative dwell time", () => {
    const input = withDwellInput();
    input.values.dwell_1_time = makeQuantity(-1, "s");
    expect(() => executeModule(motionProfileModule, input)).toThrow();
  });

  it("rejects a move supplied after a gap (move 3 with no move 2)", () => {
    const input = baselineInput();
    input.values.move_3_distance = makeQuantity(1, "m");
    input.values.move_3_max_velocity = makeQuantity(1, "m/s");
    input.values.move_3_max_acceleration = makeQuantity(2, "m/s^2");
    expect(() => executeModule(motionProfileModule, input)).toThrow();
  });

  it("rejects a partially-supplied move (distance without velocity/acceleration)", () => {
    const input = baselineInput();
    input.values.move_2_distance = makeQuantity(1, "m");
    expect(() => executeModule(motionProfileModule, input)).toThrow();
  });

  it("rejects a dwell with no move of its own", () => {
    const input = baselineInput();
    input.values.dwell_2_time = makeQuantity(1, "s");
    expect(() => executeModule(motionProfileModule, input)).toThrow();
  });
});

describe("motion-profile 0.1.0 outputs", () => {
  it("produces dimensionally correct output units", () => {
    const computation = executeModule(motionProfileModule, baselineInput());
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
    expect(asQuantity(computation.outputs.cycle_time).value).toBeCloseTo(
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
    expect(computation.warnings[0].id).toBe("triangular-profile-move-1");
  });

  it("passes every applicable acceptance check for a valid input with no dwell", () => {
    const computation = executeModule(motionProfileModule, baselineInput());
    for (const check of computation.checks) {
      if (check.id === "dwell-1-time-non-negative") {
        expect(check.status).toBe("not_applicable");
      } else {
        expect(check.status).toBe("pass");
      }
    }
  });
});

describe("motion-profile 0.1.0 cycle (bounded move sequence)", () => {
  it("without a dwell, cycle_time equals the single move's own move time", () => {
    const withoutDwell = executeModule(motionProfileModule, baselineInput());
    // 1 m at v_lim=1 m/s, a_lim=2 m/s^2: t1 = 0.5 s, d1 = 0.25 m each side,
    // cruise distance 0.5 m at 1 m/s -> t2 = 0.5 s, t_m = 0.5+0.5+0.5 = 1.5 s.
    expect(asQuantity(withoutDwell.outputs.cycle_time).value).toBeCloseTo(
      1.5,
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

  it("passes the dwell-1-time-non-negative check when a valid dwell is supplied", () => {
    const computation = executeModule(motionProfileModule, withDwellInput());
    const dwellCheck = computation.checks.find(
      (check) => check.id === "dwell-1-time-non-negative",
    );
    expect(dwellCheck?.status).toBe("pass");
  });

  it("two moves: cycle_time is the sum of both moves' own move times", () => {
    const oneMove = executeModule(motionProfileModule, baselineInput());
    const twoMoves = executeModule(motionProfileModule, twoMoveInput());
    // Move 2 (2 m, same limits as move 1) reaches the 1 m/s ceiling:
    // d1 = 1^2/(2*2) = 0.25 m, 2*d1 = 0.5 <= 2 m, so trapezoidal.
    // t1 = 1/2 = 0.5 s, cruise distance = 2 - 0.5 = 1.5 m at 1 m/s -> t2 = 1.5 s.
    // t_m2 = 0.5 + 1.5 + 0.5 = 2.5 s.
    expect(asQuantity(twoMoves.outputs.cycle_time).value).toBeCloseTo(
      asQuantity(oneMove.outputs.cycle_time).value + 2.5,
      12,
    );
    expect(twoMoves.warnings).toHaveLength(0);
  });

  it("five moves: every move and dwell contributes checks and cycle time", () => {
    const computation = executeModule(motionProfileModule, fiveMoveInput());
    for (let index = 1; index <= 5; index++) {
      expect(
        computation.checks.find(
          (c) => c.id === `move-${index}-distance-positive`,
        )?.status,
      ).toBe("pass");
      expect(
        computation.checks.find(
          (c) => c.id === `dwell-${index}-time-non-negative`,
        )?.status,
      ).toBe("pass");
    }
    // Each move's own move_time is 1.5 s (same shape as the baseline), plus
    // a 0.5 s dwell after each: 5 * (1.5 + 0.5) = 10 s.
    expect(asQuantity(computation.outputs.cycle_time).value).toBeCloseTo(
      10,
      12,
    );
  });

  it("peak values are the maximum across every supplied move, not just the first", () => {
    const input = baselineInput();
    // d1 = 5^2/(2*2) = 6.25 m, 2*d1 = 12.5 <= 50 m, so trapezoidal: move 2
    // reaches its own 5 m/s ceiling, well above move 1's 1 m/s.
    input.values.move_2_distance = makeQuantity(50, "m");
    input.values.move_2_max_velocity = makeQuantity(5, "m/s");
    input.values.move_2_max_acceleration = makeQuantity(2, "m/s^2");
    const computation = executeModule(motionProfileModule, input);
    expect(asQuantity(computation.outputs.peak_velocity).value).toBe(5);
  });
});
