import { describe, expect, it } from "vitest";
import { resolveModuleUiCallouts } from "./resolve-module-ui-callouts";
import { guidedCylinderSizingMgpModule } from "@/lib/modules/guided-cylinder-sizing/0.2.0";

describe("resolveModuleUiCallouts", () => {
  it("resolves the case-specific helper text from an enum input", () => {
    const cases = [
      { value: "vertical_lifter", text: "Use the lifter graph." },
      { value: "stopper", text: "Use the stopper graph." },
    ];
    expect(
      resolveModuleUiCallouts(
        [{ title: "Choose the MGP selection case", imagePath: "/module-guides/mgp-selection-cases.svg", alt: "MGP lifter, pusher, and stopper selection cases", caseText: { portKey: "application_case", cases } }],
        new Map([["application_case", { source: "manual", value: { v: 1, kind: "enum", enumId: "mgp_application_case", value: "stopper" } }]]),
      ),
    ).toEqual([{ title: "Choose the MGP selection case", imagePath: "/module-guides/mgp-selection-cases.svg", alt: "MGP lifter, pusher, and stopper selection cases", text: "Use the stopper graph.", caseSelector: { portKey: "application_case", selectedValue: "stopper", cases } }]);
  });

  it("keeps the guide visible without case text when the driving value is unset", () => {
    const cases = [{ value: "stopper", text: "Stopper guidance." }];
    expect(
      resolveModuleUiCallouts(
        [{ title: "Selection case", imagePath: "/module-guides/mgp-selection-cases.svg", alt: "Selection cases", caseText: { portKey: "application_case", cases } }],
        new Map([["application_case", { source: "default" }]]),
      ),
    ).toEqual([{ title: "Selection case", imagePath: "/module-guides/mgp-selection-cases.svg", alt: "Selection cases", text: null, caseSelector: { portKey: "application_case", selectedValue: undefined, cases } }]);
  });
});

describe("guided-cylinder-sizing@0.2.0's own real declared callout (Task 5 of the MGP implementation plan, not a synthetic fixture)", () => {
  const realCallouts = guidedCylinderSizingMgpModule.uiSchema.callouts;

  it("declares exactly one callout pointing at the real published SVG asset", () => {
    expect(realCallouts).toHaveLength(1);
    expect(realCallouts?.[0]?.imagePath).toBe(
      "/module-guides/mgp-selection-cases.svg",
    );
  });

  it.each(["vertical_lifter", "horizontal_pusher", "stopper"] as const)(
    "resolves distinct case text for '%s' through the real resolver",
    (applicationCase) => {
      const resolved = resolveModuleUiCallouts(
        realCallouts,
        new Map([
          [
            "application_case",
            {
              source: "manual",
              value: {
                v: 1,
                kind: "enum",
                enumId: "pneumatic_guided_mgp_application_case",
                value: applicationCase,
              },
            },
          ],
        ]),
      );
      expect(resolved[0]?.text).not.toBeNull();
      expect(resolved[0]?.text).toContain(
        applicationCase === "vertical_lifter"
          ? "Vertical lifter"
          : applicationCase === "horizontal_pusher"
            ? "Horizontal pusher"
            : "Stopper",
      );
    },
  );
});