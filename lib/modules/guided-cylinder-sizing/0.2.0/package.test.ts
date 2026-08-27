import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { guidedCylinderSizingMgpModule } from "./index";
import {
  applicationCaseValue,
  asQuantity,
  type RawInput,
} from "./test-helpers";

function commonInput(
  applicationCase: "vertical_lifter" | "horizontal_pusher" | "stopper",
): RawInput {
  return {
    values: {
      application_case: applicationCaseValue(applicationCase),
      load_mass: makeQuantity(3, "kg"),
      load_safety_factor: makeQuantity(2, "ratio"),
      required_stroke: makeQuantity(30, "mm"),
      operating_pressure: makeQuantity(0.5, "MPa"),
    },
  };
}

function lifterInput(): RawInput {
  const input = commonInput("vertical_lifter");
  input.values.max_piston_speed = makeQuantity(0.2, "m/s");
  input.values.eccentric_distance = makeQuantity(90, "mm");
  return input;
}

function pusherInput(): RawInput {
  const input = commonInput("horizontal_pusher");
  input.values.max_piston_speed = makeQuantity(0.2, "m/s");
  input.values.eccentric_distance = makeQuantity(50, "mm");
  return input;
}

function stopperInput(): RawInput {
  const input = commonInput("stopper");
  input.values.transfer_speed = makeQuantity(0.3, "m/s");
  return input;
}

const EXPECTED_SOURCE_HASH = "78532e55df3f76cf";

describe("guided-cylinder-sizing 0.2.0 module conformance", () => {
  const report = runModuleConformance(guidedCylinderSizingMgpModule, {
    sampleInputs: [lifterInput(), pusherInput(), stopperInput()],
    sources: readModuleSources(import.meta.dirname),
    expectedSourceHash: EXPECTED_SOURCE_HASH,
  });

  for (const check of report.checks) {
    it(`${check.id} (${check.status})`, () => {
      expect(check.status, check.detail).toBe("pass");
    });
  }
});

describe("guided-cylinder-sizing 0.2.0 inputs", () => {
  it.each([
    "application_case",
    "load_mass",
    "load_safety_factor",
    "required_stroke",
    "operating_pressure",
  ] as const)("requires common input %s", (key) => {
    const input = lifterInput();
    delete input.values[key];
    expect(() => executeModule(guidedCylinderSizingMgpModule, input)).toThrow();
  });

  it("requires piston speed and eccentric distance for a vertical lifter", () => {
    const noSpeed = lifterInput();
    delete noSpeed.values.max_piston_speed;
    expect(() => executeModule(guidedCylinderSizingMgpModule, noSpeed)).toThrow(
      '"max_piston_speed"',
    );

    const noDistance = lifterInput();
    delete noDistance.values.eccentric_distance;
    expect(() =>
      executeModule(guidedCylinderSizingMgpModule, noDistance),
    ).toThrow('"eccentric_distance"');
  });

  it("requires piston speed and eccentric distance for a horizontal pusher", () => {
    const noSpeed = pusherInput();
    delete noSpeed.values.max_piston_speed;
    expect(() => executeModule(guidedCylinderSizingMgpModule, noSpeed)).toThrow(
      '"max_piston_speed"',
    );

    const noDistance = pusherInput();
    delete noDistance.values.eccentric_distance;
    expect(() =>
      executeModule(guidedCylinderSizingMgpModule, noDistance),
    ).toThrow('"eccentric_distance"');
  });

  it("requires transfer speed for a stopper", () => {
    const input = stopperInput();
    delete input.values.transfer_speed;
    expect(() => executeModule(guidedCylinderSizingMgpModule, input)).toThrow(
      '"transfer_speed"',
    );
  });

  it("allows stale values from another application case", () => {
    const stopper = stopperInput();
    stopper.values.max_piston_speed = makeQuantity(0.2, "m/s");
    stopper.values.eccentric_distance = makeQuantity(90, "mm");
    expect(() =>
      executeModule(guidedCylinderSizingMgpModule, stopper),
    ).not.toThrow();

    const lifter = lifterInput();
    lifter.values.transfer_speed = makeQuantity(0.3, "m/s");
    expect(() =>
      executeModule(guidedCylinderSizingMgpModule, lifter),
    ).not.toThrow();
  });

  it("rejects a guided-load safety factor below one via the registry range", () => {
    const input = lifterInput();
    input.values.load_safety_factor = makeQuantity(0.99, "ratio");
    expect(() => executeModule(guidedCylinderSizingMgpModule, input)).toThrow();
  });
});

describe("guided-cylinder-sizing 0.2.0 outputs and trace", () => {
  it.each([
    ["vertical lifter", lifterInput, "vertical_lifter"],
    ["horizontal pusher", pusherInput, "horizontal_pusher"],
    ["stopper", stopperInput, "stopper"],
  ] as const)(
    "factors mass and echoes common selection values for %s",
    (_label, input, applicationCase) => {
      const computation = executeModule(guidedCylinderSizingMgpModule, input());

      expect(
        asQuantity(computation.outputs.factored_load_mass).value,
      ).toBeCloseTo(6);
      expect(computation.outputs.application_case_out).toMatchObject({
        enumId: "pneumatic_guided_mgp_application_case",
        value: applicationCase,
      });
      expect(asQuantity(computation.outputs.required_stroke_out).value).toBe(
        30,
      );
      expect(asQuantity(computation.outputs.operating_pressure_out).value).toBe(
        0.5,
      );
      expect(Object.keys(computation.outputs).sort()).toEqual([
        "application_case_out",
        "factored_load_mass",
        "operating_pressure_out",
        "required_stroke_out",
      ]);
    },
  );

  it("exposes only the common required specification to the MGP matcher", () => {
    const computation = executeModule(
      guidedCylinderSizingMgpModule,
      lifterInput(),
    );
    const adapter = guidedCylinderSizingMgpModule.catalogAdapter;
    if (adapter === undefined) {
      throw new Error("Expected the MGP catalog adapter.");
    }

    expect(adapter.componentType).toBe("pneumatic_cylinder_guided_mgp");
    expect(adapter.requiredSpec(computation)).toEqual({
      factored_load_mass: computation.outputs.factored_load_mass,
      application_case: computation.outputs.application_case_out,
      required_stroke: computation.outputs.required_stroke_out,
      operating_pressure: computation.outputs.operating_pressure_out,
    });
  });

  it("records the selected case and the single safety-factor formula in the trace", () => {
    const computation = executeModule(
      guidedCylinderSizingMgpModule,
      lifterInput(),
    );
    const trace = JSON.stringify(computation.trace);
    expect(trace).toContain("vertical_lifter");
    expect(trace).toContain("m_design = m_entered × S_guided");
  });

  it("does not treat pressure or stale pusher inputs as stopper graph inputs", () => {
    const input = stopperInput();
    input.values.max_piston_speed = makeQuantity(0.2, "m/s");
    input.values.eccentric_distance = makeQuantity(90, "mm");
    const computation = executeModule(guidedCylinderSizingMgpModule, input);
    const selectionSection = computation.trace.sections.find(
      (section) => section.id === "mgp-selection-context",
    );
    const selectionStep = selectionSection?.children.find(
      (node) => node.node === "step" && node.id === "application-case-inputs",
    );
    if (selectionStep === undefined || selectionStep.node !== "step") {
      throw new Error("Expected the MGP selection-context trace step.");
    }

    const refs = selectionStep.inputs.map((operand) => operand.ref);
    expect(refs).not.toContain("pneumatic.operating_pressure");
    expect(refs).not.toContain("pneumatic.max_piston_speed");
    expect(refs).not.toContain(
      "pneumatic_guided_mgp_sizing.eccentric_distance",
    );
    expect(selectionStep.notes ?? []).toEqual(
      expect.arrayContaining([
        expect.stringContaining("not a stopper graph input"),
      ]),
    );
  });

  it("converts stopper transfer speed from canonical m/s to m/min in the trace", () => {
    const computation = executeModule(
      guidedCylinderSizingMgpModule,
      stopperInput(),
    );
    const trace = JSON.stringify(computation.trace);
    expect(trace).toContain("m/min");
    expect(trace).toContain("18");
  });

  it("declares no legacy roll/pitch/yaw, mounting, or buckling ports", () => {
    const allKeys = [
      ...guidedCylinderSizingMgpModule.ports.inputs,
      ...guidedCylinderSizingMgpModule.ports.outputs,
    ].map((port) => port.key);
    expect(allKeys).not.toEqual(
      expect.arrayContaining([
        "roll_offset",
        "pitch_offset",
        "yaw_offset",
        "mounting_style",
        "buckling_safety_factor",
      ]),
    );
  });
});
