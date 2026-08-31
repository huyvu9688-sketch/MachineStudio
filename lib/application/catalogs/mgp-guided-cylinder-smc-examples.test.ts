import { describe, expect, it } from "vitest";
import {
  runMgpHorizontalPusherExample,
  runMgpStopperExample,
  runMgpVerticalLifterExample,
  runMgpVerticalLifterExampleAcrossBearingTypes,
} from "./mgp-guided-cylinder-smc-examples";

describe("SMC MGP page-545 'Selection Example 1 (Vertical Mounting)' reached via this module's own compute and matching path", () => {
  it("factors the entered load mass to exactly the catalog's own 3 kg (safety factor 1)", () => {
    const { computation } = runMgpVerticalLifterExample();
    expect(computation.outputs.factored_load_mass).toMatchObject({
      value: 3,
    });
  });

  it("selects MGPL25-30Z, the exact model SMC's own text names for this scenario", () => {
    const { outcome } = runMgpVerticalLifterExample();
    expect(outcome.accepted[0]?.candidate.id).toBe("MGPL25-30Z");
    expect(outcome.accepted[0]?.graph).toBe(5);
  });

  it("rejects the next-smallest ball-bushing bore (MGPL20-30Z) -- confirms this is a real selection, not the only candidate offered", () => {
    const { outcome } = runMgpVerticalLifterExample();
    expect(outcome.rejected.some((r) => r.candidate.id === "MGPL20-30Z")).toBe(
      true,
    );
    expect(outcome.accepted.some((a) => a.candidate.id === "MGPL20-30Z")).toBe(
      false,
    );
  });
});

describe("MGP vertical lifter across BOTH bearing types -- the real, disclosed matcher behavior when bearing type is not pre-scoped (mgp-guided-cylinder-smc-examples.ts's own header)", () => {
  it("selects MGPM20-30Z (slide, bore 20), not MGPL25-30Z -- the matcher ranks by ascending bore with no bearing-type preference input", () => {
    const { outcome } = runMgpVerticalLifterExampleAcrossBearingTypes();
    expect(outcome.accepted[0]?.candidate.id).toBe("MGPM20-30Z");
    expect(outcome.accepted[0]?.graph).toBe(1);
  });

  it("still accepts MGPL25-30Z, just ranked behind the smaller slide-bearing bore", () => {
    const { outcome } = runMgpVerticalLifterExampleAcrossBearingTypes();
    expect(outcome.accepted.some((a) => a.candidate.id === "MGPL25-30Z")).toBe(
      true,
    );
  });
});

describe("SMC MGP page-545 'Selection Example 2 (Horizontal Mounting)' reached via this module's own compute and matching path", () => {
  it("factors the entered load mass to exactly the catalog's own 2 kg (safety factor 1)", () => {
    const { computation } = runMgpHorizontalPusherExample();
    expect(computation.outputs.factored_load_mass).toMatchObject({
      value: 2,
    });
  });

  it("selects MGPM20-30Z, the exact model SMC's own text names for this scenario", () => {
    const { outcome } = runMgpHorizontalPusherExample();
    expect(outcome.accepted[0]?.candidate.id).toBe("MGPM20-30Z");
    expect(outcome.accepted[0]?.graph).toBe(13);
  });

  it("rejects the next-smallest slide bore (MGPM16-30Z) -- confirms this is a real selection, not the only candidate offered", () => {
    const { outcome } = runMgpHorizontalPusherExample();
    expect(outcome.rejected.some((r) => r.candidate.id === "MGPM16-30Z")).toBe(
      true,
    );
  });
});

describe("MGP stopper reference computation, anchored to a real published page-552 graph point (no numbered catalog 'Selection Example' exists for stopper -- see mgp-guided-cylinder-smc-examples.ts header)", () => {
  it("factors the entered load mass to exactly 50 kg (safety factor 1)", () => {
    const { computation } = runMgpStopperExample();
    expect(computation.outputs.factored_load_mass).toMatchObject({
      value: 50,
    });
  });

  it("selects MGPM25-30Z from the real published 77.2 kg allowable-mass plateau (graph 21)", () => {
    const { outcome } = runMgpStopperExample();
    expect(outcome.accepted[0]?.candidate.id).toBe("MGPM25-30Z");
    expect(outcome.accepted[0]?.graph).toBe(21);
    expect(outcome.accepted[0]?.allowableLoadMassKg).toBeCloseTo(77.2, 5);
  });

  it("rejects every smaller bore, whose published allowable mass falls under the 50 kg requirement", () => {
    const { outcome } = runMgpStopperExample();
    const rejectedIds = outcome.rejected.map((r) => r.candidate.id);
    expect(rejectedIds).toEqual(
      expect.arrayContaining(["MGPM20-30Z", "MGPM16-30Z", "MGPM12-30Z"]),
    );
  });
});
