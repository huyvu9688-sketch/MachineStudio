import { describe, expect, it } from "vitest";
import {
  makeQuantity,
  SERIALIZATION_FORMAT_VERSION,
  type ModuleComputation,
  type ModuleInput,
} from "@/lib/engine";
import { applicationCaseValue } from "@/lib/modules/guided-cylinder-sizing/0.2.0/test-helpers";
import { evaluateMgpGuidedCylinderCandidates } from "./mgp-guided-cylinder-matching";

type CaseName = "vertical_lifter" | "horizontal_pusher" | "stopper";

function computation(caseName: CaseName): ModuleComputation {
  return {
    outputs: {
      factored_load_mass: makeQuantity(2, "kg"),
      application_case_out: applicationCaseValue(caseName),
      required_stroke_out: makeQuantity(30, "mm"),
      operating_pressure_out: makeQuantity(0.5, "MPa"),
    },
    trace: { v: SERIALIZATION_FORMAT_VERSION, sections: [] },
    checks: [],
    warnings: [],
    assumptions: [],
    validity: [],
  };
}

function snapshot(caseName: CaseName): ModuleInput {
  return {
    values: {
      application_case: applicationCaseValue(caseName),
      ...(caseName === "stopper"
        ? { transfer_speed: makeQuantity(0.2, "m/s") }
        : {
            max_piston_speed: makeQuantity(0.2, "m/s"),
            eccentric_distance: makeQuantity(
              caseName === "vertical_lifter" ? 90 : 50,
              "mm",
            ),
          }),
    },
  };
}

function candidate(
  id: string,
  input: {
    bore: number;
    rod: number;
    bearing: "slide" | "ball_bushing" | "high_precision_ball_bushing";
    stroke: number;
  },
) {
  return {
    id,
    attributes: {
      bore_diameter: makeQuantity(input.bore, "mm"),
      rod_diameter: makeQuantity(input.rod, "mm"),
      bearing_type: {
        v: SERIALIZATION_FORMAT_VERSION,
        kind: "enum" as const,
        enumId: "mgp_bearing_type",
        value: input.bearing,
      },
      standard_stroke: makeQuantity(input.stroke, "mm"),
    },
  };
}

describe("evaluateMgpGuidedCylinderCandidates", () => {
  it("accepts the graph-5 vertical lifter candidate by its own MGP curve", () => {
    const outcome = evaluateMgpGuidedCylinderCandidates(
      computation("vertical_lifter"),
      snapshot("vertical_lifter"),
      [
        candidate("mgpl-25-30", {
          bore: 25,
          rod: 12,
          bearing: "ball_bushing",
          stroke: 30,
        }),
      ],
    );
    expect(
      outcome.accepted[0]?.candidate.attributes.bore_diameter,
    ).toMatchObject({ value: 25 });
    expect(outcome.accepted[0]?.graph).toBe(5);
  });

  it("rejects vertical lifters outside the published eccentric-distance envelope", () => {
    const input: ModuleInput = {
      values: {
        ...snapshot("vertical_lifter").values,
        eccentric_distance: makeQuantity(200, "mm"),
      },
    };
    const outcome = evaluateMgpGuidedCylinderCandidates(
      computation("vertical_lifter"),
      input,
      [
        candidate("mgpl-25-30", {
          bore: 25,
          rod: 12,
          bearing: "ball_bushing",
          stroke: 30,
        }),
      ],
    );
    expect(outcome.rejected[0]?.reasons).toContain(
      "MGP graph envelope does not cover eccentric distance 200 mm.",
    );
  });

  it("selects graph 13 and rejects a different standard stroke", () => {
    const outcome = evaluateMgpGuidedCylinderCandidates(
      computation("horizontal_pusher"),
      snapshot("horizontal_pusher"),
      [
        candidate("mgpm-20-30", {
          bore: 20,
          rod: 10,
          bearing: "slide",
          stroke: 30,
        }),
        candidate("mgpm-20-20", {
          bore: 20,
          rod: 10,
          bearing: "slide",
          stroke: 20,
        }),
      ],
    );
    expect(outcome.accepted[0]?.graph).toBe(13);
    expect(outcome.rejected[0]?.candidate.id).toBe("mgpm-20-20");
  });

  it("accepts only slide-bearing MGP candidates for a stopper", () => {
    const outcome = evaluateMgpGuidedCylinderCandidates(
      computation("stopper"),
      snapshot("stopper"),
      [
        candidate("mgpm-20-30", {
          bore: 20,
          rod: 10,
          bearing: "slide",
          stroke: 30,
        }),
        candidate("mgpl-20-30", {
          bore: 20,
          rod: 10,
          bearing: "ball_bushing",
          stroke: 30,
        }),
      ],
    );
    expect(outcome.accepted).toHaveLength(1);
    expect(outcome.rejected[0]?.candidate.id).toBe("mgpl-20-30");
  });
});
