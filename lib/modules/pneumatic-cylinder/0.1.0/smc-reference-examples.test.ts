import { describe, expect, it } from "vitest";
import { executeModule } from "@/lib/engine";
import { pneumaticCylinderModule } from "./index";
import {
  SMC_AIR_CONSUMPTION_EXAMPLE,
  SMC_AIR_CONSUMPTION_EXPECTED_L,
  SMC_CUSHION_EXAMPLE,
  SMC_CUSHION_EXPECTED_J,
  SMC_FORCE_CAPACITY_EXAMPLE,
  SMC_FORCE_CAPACITY_EXPECTED_N,
} from "./smc-reference-examples";
import { asQuantity } from "./test-helpers";

// Reproduces SMC Corporation's own "Air Cylinders Model Selection" worked
// examples through the module's actual compute path (executeModule), not
// just the kernel formula level ./math.test.ts already covers -- see
// ./smc-reference-examples.ts for the full scenarios, sourcing, and
// tolerance reasoning.

describe("pneumatic-cylinder 0.1.0 SMC bore-selection Example 1 (force capacity)", () => {
  it("reproduces the theoretical extend force within 0.01 N", () => {
    const computation = executeModule(
      pneumaticCylinderModule,
      SMC_FORCE_CAPACITY_EXAMPLE,
    );
    expect(
      asQuantity(computation.outputs.theoretical_extend_force).value,
    ).toBeCloseTo(SMC_FORCE_CAPACITY_EXPECTED_N, 2);
  });

  it("passes the force-capacity-extend check, matching SMC's own 63mm bore selection", () => {
    const computation = executeModule(
      pneumaticCylinderModule,
      SMC_FORCE_CAPACITY_EXAMPLE,
    );
    const check = computation.checks.find(
      (c) => c.id === "force-capacity-extend",
    );
    expect(check?.status).toBe("pass");
  });
});

describe("pneumatic-cylinder 0.1.0 SMC air-consumption worked example", () => {
  it("reproduces the source's own printed cylinder+piping sub-totals (~13L + ~0.56L) within 0.1 L", () => {
    const computation = executeModule(
      pneumaticCylinderModule,
      SMC_AIR_CONSUMPTION_EXAMPLE,
    );
    expect(
      asQuantity(computation.outputs.air_consumption_per_cycle).value,
    ).toBeCloseTo(SMC_AIR_CONSUMPTION_EXPECTED_L, 1);
  });

  it("reports required_air_volume as a positive, dimensionally correct L/min figure", () => {
    const computation = executeModule(
      pneumaticCylinderModule,
      SMC_AIR_CONSUMPTION_EXAMPLE,
    );
    const requiredAirVolume = asQuantity(
      computation.outputs.required_air_volume,
    );
    expect(requiredAirVolume.unit).toBe("L/min");
    expect(requiredAirVolume.value).toBeGreaterThan(0);
  });
});

describe("pneumatic-cylinder 0.1.0 SMC cushion-capacity example (CM2-40, air cushion)", () => {
  it("reproduces the end-of-stroke kinetic energy exactly", () => {
    const computation = executeModule(
      pneumaticCylinderModule,
      SMC_CUSHION_EXAMPLE,
    );
    expect(asQuantity(computation.outputs.kinetic_energy).value).toBeCloseTo(
      SMC_CUSHION_EXPECTED_J,
      9,
    );
  });

  it("passes the cushion-kinetic-energy check with a small positive margin, consistent with SMC's own '300 mm/s or less' recommendation", () => {
    const computation = executeModule(
      pneumaticCylinderModule,
      SMC_CUSHION_EXAMPLE,
    );
    const check = computation.checks.find(
      (c) => c.id === "cushion-kinetic-energy",
    );
    expect(check?.status).toBe("pass");
    expect(check?.margin).toMatchObject({ unit: "J" });
    if (check?.margin?.kind === "quantity") {
      expect(check.margin.value).toBeGreaterThan(0);
      expect(check.margin.value).toBeLessThan(0.2);
    }
  });
});
