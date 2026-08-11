// Reference-example tests (roadmap Module Definition of Done item 6;
// context/code-standards.md "Module Testing") reproducing the three THK
// published worked examples recorded in
// context/modules/axis-load-cases/stage-1-spec.md "Candidate Sources and
// Published Examples" — B15-72 (horizontal), B15-86 (vertical), and B2-22
// (vertical), all from THK, *Example Ball Screw Selection* / *Example of
// Calculating the Nominal Life*, 515-1E
// (jp.thk.ball_screw_general_catalog@515-1e /
// jp.thk.example_ball_screw_selection@515-1e).
//
// These are genuine published third-party worked examples, distinct from the
// project's own ID39/ID42 sanitized historical fixtures
// (./axis-load-cases.test.ts, ./package.test.ts): stage-1-spec.md is explicit
// that they are "not substitutes for the required project-history fixtures."
// Reproducing them here satisfies the separate "three published reference
// examples reproduced within tolerance" validation requirement.
//
// Each example gives three motion phases of one physical scenario
// (acceleration, constant speed, deceleration); like the ID39/ID42 tests,
// this file does not classify a phase as the `normal` or `peak` product load
// case — it assigns phases to the module's two required case ports purely to
// exercise the compute path and checks that each case's resolved thrust
// reproduces the published magnitude for the physical scenario in that slot.
//
// THK's published figures are whole-newton catalog roundings computed with
// g = 9.8 m/s^2 (not the module's NIST-default 9.80665 m/s^2), so these tests
// supply gravity = 9.8 m/s^2 explicitly, as the module's `gravity` port
// allows.

import { describe, expect, it } from "vitest";
import { executeModule, makeQuantity } from "@/lib/engine";
import { axisLoadCasesModule } from "./index";
import {
  asQuantity,
  orientationValue,
  travelDirectionValue,
  type RawInput,
} from "./test-helpers";

interface ThkExample {
  readonly id: string;
  readonly description: string;
  readonly orientation: "horizontal" | "vertical";
  readonly inclineAngleRad: number;
  readonly massKg: number;
  readonly frictionCoefficient: number;
  readonly guideResistanceN: number;
  readonly accelerationMps2: number;
  /** Published axial-load magnitudes, in newtons. */
  readonly expected: {
    readonly accel: number;
    readonly constant: number;
    readonly decel: number;
  };
  /** Whole-newton catalog rounding tolerance. */
  readonly toleranceN: number;
}

const THK_B15_72_HORIZONTAL: ThkExample = {
  id: "thk-b15-72-horizontal",
  description:
    "THK Example Ball Screw Selection, 515-1E, p. B15-72: horizontal axis, m = 80 kg, mu = 0.003, f = 15 N, Vmax = 1 m/s, t = 0.15 s.",
  orientation: "horizontal",
  inclineAngleRad: 0,
  massKg: 80,
  frictionCoefficient: 0.003,
  guideResistanceN: 15,
  accelerationMps2: 1 / 0.15,
  expected: { accel: 550, constant: 17, decel: -516 },
  toleranceN: 1,
};

const THK_B15_86_VERTICAL: ThkExample = {
  id: "thk-b15-86-vertical",
  description:
    "THK Example Ball Screw Selection, 515-1E, p. B15-86: vertical axis, m = 50 kg, f = 20 N, Vmax = 0.3 m/s, t = 0.2 s.",
  orientation: "vertical",
  inclineAngleRad: Math.PI / 2,
  massKg: 50,
  frictionCoefficient: 0,
  guideResistanceN: 20,
  accelerationMps2: 0.3 / 0.2,
  expected: { accel: 585, constant: 510, decel: 435 },
  toleranceN: 1,
};

const THK_B2_22_VERTICAL: ThkExample = {
  id: "thk-b2-22-vertical",
  description:
    "THK Example of Calculating the Nominal Life, 515-1E, p. B2-22: vertical axis, m = 30 kg, a = 2.4 m/s^2, documented guide resistance (10 N, derived from the published 304 N constant-speed figure: F = m*g + f).",
  orientation: "vertical",
  inclineAngleRad: Math.PI / 2,
  massKg: 30,
  frictionCoefficient: 0,
  guideResistanceN: 10,
  accelerationMps2: 2.4,
  expected: { accel: 376, constant: 304, decel: 232 },
  toleranceN: 1,
};

export const THK_REFERENCE_EXAMPLES: readonly ThkExample[] = [
  THK_B15_72_HORIZONTAL,
  THK_B15_86_VERTICAL,
  THK_B2_22_VERTICAL,
];

const GRAVITY_MPS2 = 9.8;

function buildInput(
  example: ThkExample,
  normalAccelerationMps2: number,
  peakAccelerationMps2: number,
): RawInput {
  return {
    values: {
      orientation: orientationValue(example.orientation),
      incline_angle: makeQuantity(example.inclineAngleRad, "rad"),
      total_moving_mass: makeQuantity(example.massKg, "kg"),
      gravity: makeQuantity(GRAVITY_MPS2, "m/s^2"),
      friction_coefficient: makeQuantity(example.frictionCoefficient, "ratio"),
      normal_travel_direction: travelDirectionValue("positive"),
      normal_axial_acceleration: makeQuantity(normalAccelerationMps2, "m/s^2"),
      normal_guide_resistance_force: makeQuantity(
        example.guideResistanceN,
        "N",
      ),
      peak_travel_direction: travelDirectionValue("positive"),
      peak_axial_acceleration: makeQuantity(peakAccelerationMps2, "m/s^2"),
      peak_guide_resistance_force: makeQuantity(example.guideResistanceN, "N"),
    },
  };
}

describe.each(THK_REFERENCE_EXAMPLES)(
  "axis-load-cases 0.1.0 THK reference example: $id",
  (example) => {
    it("reproduces the published acceleration and constant-speed axial loads", () => {
      const computation = executeModule(
        axisLoadCasesModule,
        buildInput(example, example.accelerationMps2, 0),
      );
      expect(
        Math.abs(
          asQuantity(computation.outputs.normal_thrust_force).value -
            example.expected.accel,
        ),
      ).toBeLessThanOrEqual(example.toleranceN);
      expect(
        Math.abs(
          asQuantity(computation.outputs.peak_thrust_force).value -
            example.expected.constant,
        ),
      ).toBeLessThanOrEqual(example.toleranceN);
    });

    it("reproduces the published deceleration axial load", () => {
      const computation = executeModule(
        axisLoadCasesModule,
        buildInput(
          example,
          -example.accelerationMps2,
          -example.accelerationMps2,
        ),
      );
      expect(
        Math.abs(
          asQuantity(computation.outputs.normal_thrust_force).value -
            example.expected.decel,
        ),
      ).toBeLessThanOrEqual(example.toleranceN);
    });
  },
);
