import { describe, expect, it } from "vitest";
import { makeQuantity } from "../units";
import { buildCalculationTrace, TRACE_FORMAT_VERSION } from "../trace";
import { asSourceRevisionId } from "../../standards/types";
import type { CalculationTrace, Quantity } from "..";
import { computeIsDeterministic, executeModule } from "./execute";
import { sealModulePackage } from "./hash";
import { ModuleSdkError } from "./errors";
import { exampleThrustModule } from "./example-module";
import { baseDraft } from "./test-support";
import type { ModuleComputation } from "./types";

function expectExecError(fn: () => unknown, code: ModuleSdkError["code"]): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ModuleSdkError);
    expect((error as ModuleSdkError).code).toBe(code);
    return;
  }
  throw new Error(`expected ModuleSdkError(${code})`);
}

function asQuantity(value: unknown): Quantity {
  const v = value as Quantity;
  expect(v.kind).toBe("quantity");
  return v;
}

/** A minimal valid computation with the given outputs and optional overrides. */
function computation(
  outputs: Record<string, Quantity>,
  over: Partial<ModuleComputation> = {},
): ModuleComputation {
  return {
    outputs,
    trace: buildCalculationTrace([
      {
        node: "section",
        id: "s",
        title: "S",
        children: [
          { node: "step", id: "st", methodId: "m", inputs: [], outputs: [] },
        ],
      },
    ]),
    checks: [],
    warnings: [],
    assumptions: [],
    validity: [],
    ...over,
  };
}

const baseModule = sealModulePackage(baseDraft());
const validBaseInput = { values: { mass: makeQuantity(5, "kg") } };

describe("executeModule — exit criterion", () => {
  it("executes the example module through the public SDK, filling the gravity default", () => {
    const result = executeModule(exampleThrustModule, {
      values: {
        payload_mass: makeQuantity(12, "kg"),
        friction_coefficient: makeQuantity(0.01, "ratio"),
        // gravity omitted — filled from the parameter's constant default
      },
    });
    const thrust = asQuantity(result.outputs.thrust);
    expect(thrust.unit).toBe("N");
    expect(thrust.value).toBeCloseTo(0.01 * 12 * 9.80665, 6);
    expect(result.checks[0].status).toBe("pass");
    expect(result.assumptions[0].id).toBe("horizontal");
  });
});

describe("executeModule — input contract", () => {
  it("rejects a raw input that fails the module input schema", () => {
    expectExecError(() => executeModule(baseModule, { bogus: true }), "input_schema_mismatch");
  });

  it("rejects a missing required input with no constant default", () => {
    expectExecError(() => executeModule(baseModule, { values: {} }), "missing_required_input");
  });

  it("rejects an input value not in the parameter's canonical unit", () => {
    expectExecError(
      () => executeModule(baseModule, { values: { mass: makeQuantity(5000, "g") } }),
      "input_value_mismatch",
    );
  });
});

describe("executeModule — SDK compatibility", () => {
  it("rejects execution when the engine SDK version is below the module's range", () => {
    expectExecError(
      () =>
        executeModule(
          exampleThrustModule,
          { values: { payload_mass: makeQuantity(1, "kg"), friction_coefficient: makeQuantity(0.1, "ratio") } },
          { engineSdkVersion: "0.9.0" },
        ),
      "incompatible_sdk",
    );
  });
});

describe("executeModule — output contract", () => {
  it("rejects a missing declared output", () => {
    const pkg = sealModulePackage({ ...baseDraft(), compute: () => computation({}) });
    expectExecError(() => executeModule(pkg, validBaseInput), "output_schema_mismatch");
  });

  it("rejects an undeclared extra output", () => {
    const pkg = sealModulePackage({
      ...baseDraft(),
      compute: () => computation({ out: makeQuantity(1, "N"), extra: makeQuantity(2, "N") }),
    });
    expectExecError(() => executeModule(pkg, validBaseInput), "output_schema_mismatch");
  });

  it("rejects an output of the wrong dimension", () => {
    const pkg = sealModulePackage({
      ...baseDraft(),
      compute: () => computation({ out: makeQuantity(1, "kg") }),
    });
    expectExecError(() => executeModule(pkg, validBaseInput), "output_schema_mismatch");
  });
});

describe("executeModule — computation and trace validity", () => {
  it("rejects a structurally malformed computation", () => {
    const bad = () =>
      ({
        outputs: { out: makeQuantity(1, "N") },
        trace: buildCalculationTrace([]),
        checks: [{ id: "c", status: "maybe", message: "m" }],
        warnings: [],
        assumptions: [],
        validity: [],
      }) as unknown as ModuleComputation;
    const pkg = sealModulePackage({ ...baseDraft(), compute: bad });
    expectExecError(() => executeModule(pkg, validBaseInput), "invalid_computation");
  });

  it("rejects a trace with duplicate node IDs", () => {
    const dupTrace: CalculationTrace = {
      v: TRACE_FORMAT_VERSION,
      sections: [
        {
          node: "section",
          id: "sec",
          title: "S",
          children: [
            { node: "step", id: "d", methodId: "m", inputs: [], outputs: [] },
            { node: "step", id: "d", methodId: "m", inputs: [], outputs: [] },
          ],
        },
      ],
    };
    const pkg = sealModulePackage({
      ...baseDraft(),
      compute: () => computation({ out: makeQuantity(1, "N") }, { trace: dupTrace }),
    });
    expectExecError(() => executeModule(pkg, validBaseInput), "invalid_computation");
  });
});

describe("executeModule — declared sources", () => {
  const tracedCompute = (): ModuleComputation =>
    computation(
      { out: makeQuantity(1, "N") },
      {
        trace: buildCalculationTrace([
          {
            node: "section",
            id: "s",
            title: "S",
            children: [
              {
                node: "step",
                id: "st",
                methodId: "m",
                inputs: [],
                outputs: [],
                sources: [{ sourceRevisionId: asSourceRevisionId("us.ansi.b11_0@2023"), clause: "6.1" }],
              },
            ],
          },
        ]),
      },
    );

  it("rejects a citation to a source not declared in the manifest", () => {
    const pkg = sealModulePackage({ ...baseDraft(), compute: tracedCompute });
    expectExecError(() => executeModule(pkg, validBaseInput), "missing_trace_source");
  });

  it("accepts a citation to a declared source", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      compute: tracedCompute,
      manifest: {
        ...draft.manifest,
        sourceRevisionIds: [asSourceRevisionId("us.ansi.b11_0@2023")],
      },
    });
    expect(() => executeModule(pkg, validBaseInput)).not.toThrow();
  });
});

describe("computeIsDeterministic", () => {
  it("is true for the deterministic example module", () => {
    expect(
      computeIsDeterministic(exampleThrustModule, {
        values: {
          payload_mass: makeQuantity(12, "kg"),
          friction_coefficient: makeQuantity(0.01, "ratio"),
          gravity: makeQuantity(9.80665, "m/s^2"),
        },
      }),
    ).toBe(true);
  });

  it("detects a nondeterministic compute", () => {
    const random = sealModulePackage({
      ...baseDraft(),
      compute: () => computation({ out: makeQuantity(Math.random(), "N") }),
    });
    expect(computeIsDeterministic(random, validBaseInput)).toBe(false);
  });
});
