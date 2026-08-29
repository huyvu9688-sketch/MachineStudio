import { describe, expect, it } from "vitest";
import { resolveModuleUiCallouts } from "./resolve-module-ui-callouts";

describe("resolveModuleUiCallouts", () => {
  it("resolves the case-specific helper text from an enum input", () => {
    expect(
      resolveModuleUiCallouts(
        [{ title: "Choose the MGP selection case", imagePath: "/module-guides/mgp-selection-cases.svg", alt: "MGP lifter, pusher, and stopper selection cases", caseText: { portKey: "application_case", cases: [{ value: "vertical_lifter", text: "Use the lifter graph." }, { value: "stopper", text: "Use the stopper graph." }] } }],
        new Map([["application_case", { source: "manual", value: { v: 1, kind: "enum", enumId: "mgp_application_case", value: "stopper" } }]]),
      ),
    ).toEqual([{ title: "Choose the MGP selection case", imagePath: "/module-guides/mgp-selection-cases.svg", alt: "MGP lifter, pusher, and stopper selection cases", text: "Use the stopper graph." }]);
  });

  it("keeps the guide visible without case text when the driving value is unset", () => {
    expect(
      resolveModuleUiCallouts(
        [{ title: "Selection case", imagePath: "/module-guides/mgp-selection-cases.svg", alt: "Selection cases", caseText: { portKey: "application_case", cases: [{ value: "stopper", text: "Stopper guidance." }] } }],
        new Map([["application_case", { source: "default" }]]),
      ),
    ).toEqual([{ title: "Selection case", imagePath: "/module-guides/mgp-selection-cases.svg", alt: "Selection cases", text: null }]);
  });
});