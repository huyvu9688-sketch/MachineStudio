// Tests for the catalog matching engine (Unit 2.8 part 1). Pure logic — no
// database needed. Covers the implementation map's Unit 2.8 test intent for
// this part: hard constraints precede ranking, rejection reasons are
// transparent, and ranking is deterministic.

import { describe, expect, it } from "vitest";
import { makeQuantity } from "../engine/units";
import { SERIALIZATION_FORMAT_VERSION } from "../engine/values";
import type {
  BooleanValue,
  EnumValue,
  MaterialReference,
} from "../engine/values";
import type { ComponentAttributes } from "./types";
import type { CandidatePart, MatchCriterion } from "./matching-types";
import { MatchCriterionError } from "./matching-types";
import {
  describeRequiredSpec,
  evaluateCandidate,
  evaluateCriterion,
  rankCandidates,
} from "./matching";

function candidate(id: string, attributes: ComponentAttributes): CandidatePart {
  return { id, attributes };
}

const enumValue = (enumId: string, value: string): EnumValue => ({
  v: SERIALIZATION_FORMAT_VERSION,
  kind: "enum",
  enumId,
  value,
});
const booleanValue = (value: boolean): BooleanValue => ({
  v: SERIALIZATION_FORMAT_VERSION,
  kind: "boolean",
  value,
});
const materialValue = (materialId: string): MaterialReference => ({
  v: SERIALIZATION_FORMAT_VERSION,
  kind: "material_ref",
  materialId,
});

describe("evaluateCriterion — quantity gte", () => {
  const criterion: MatchCriterion = {
    key: "dynamicLoad",
    label: "Dynamic load rating",
    operator: "gte",
    value: makeQuantity(3660, "N"),
  };

  it("passes and reports a positive margin when the candidate clears the minimum", () => {
    const result = evaluateCriterion(criterion, makeQuantity(4026, "N"));
    expect(result.satisfied).toBe(true);
    expect(result.margin).toBeCloseTo((4026 - 3660) / 3660, 9);
  });

  it("fails with below_minimum when the candidate falls short", () => {
    const result = evaluateCriterion(criterion, makeQuantity(3200, "N"));
    expect(result.satisfied).toBe(false);
    expect(result.reason).toBe("below_minimum");
    expect(result.message).toContain("below the required minimum");
  });

  it("converts compatible units before comparing", () => {
    // 3.66 kN == 3660 N, exactly at the minimum.
    const result = evaluateCriterion(criterion, makeQuantity(3.66, "kN"));
    expect(result.satisfied).toBe(true);
  });

  it("fails with dimension_mismatch for an incompatible unit", () => {
    const result = evaluateCriterion(criterion, makeQuantity(10, "mm"));
    expect(result.satisfied).toBe(false);
    expect(result.reason).toBe("dimension_mismatch");
  });
});

describe("evaluateCriterion — quantity lte", () => {
  const criterion: MatchCriterion = {
    key: "boreDiameter",
    label: "Bore diameter",
    operator: "lte",
    value: makeQuantity(20, "mm"),
  };

  it("passes with a positive margin when under the maximum", () => {
    const result = evaluateCriterion(criterion, makeQuantity(16, "mm"));
    expect(result.satisfied).toBe(true);
    expect(result.margin).toBeCloseTo((20 - 16) / 20, 9);
  });

  it("fails with above_maximum when over the limit", () => {
    const result = evaluateCriterion(criterion, makeQuantity(25, "mm"));
    expect(result.satisfied).toBe(false);
    expect(result.reason).toBe("above_maximum");
  });
});

describe("evaluateCriterion — quantity eq", () => {
  const criterion: MatchCriterion = {
    key: "lead",
    label: "Lead",
    operator: "eq",
    value: makeQuantity(20, "mm"),
  };

  it("passes on an exact match", () => {
    expect(evaluateCriterion(criterion, makeQuantity(20, "mm")).satisfied).toBe(
      true,
    );
  });

  it("fails with not_equal outside the default tolerance", () => {
    const result = evaluateCriterion(criterion, makeQuantity(20.5, "mm"));
    expect(result.satisfied).toBe(false);
    expect(result.reason).toBe("not_equal");
  });

  it("honors an explicit relative tolerance", () => {
    const toleranced: MatchCriterion = { ...criterion, tolerance: 0.05 };
    expect(
      evaluateCriterion(toleranced, makeQuantity(20.5, "mm")).satisfied,
    ).toBe(true);
  });

  it("has no margin (pass/fail only)", () => {
    const result = evaluateCriterion(criterion, makeQuantity(20, "mm"));
    expect(result.margin).toBeUndefined();
  });
});

describe("evaluateCriterion — non-quantity eq", () => {
  it("matches equal enum values", () => {
    const criterion: MatchCriterion = {
      key: "mounting",
      label: "Mounting",
      operator: "eq",
      value: enumValue("ball_screw.mounting", "fixed_free"),
    };
    expect(
      evaluateCriterion(
        criterion,
        enumValue("ball_screw.mounting", "fixed_free"),
      ).satisfied,
    ).toBe(true);
    const mismatch = evaluateCriterion(
      criterion,
      enumValue("ball_screw.mounting", "fixed_fixed"),
    );
    expect(mismatch.satisfied).toBe(false);
    expect(mismatch.reason).toBe("not_equal");
  });

  it("matches equal boolean values", () => {
    const criterion: MatchCriterion = {
      key: "preloaded",
      label: "Preloaded",
      operator: "eq",
      value: booleanValue(true),
    };
    expect(evaluateCriterion(criterion, booleanValue(true)).satisfied).toBe(
      true,
    );
    expect(evaluateCriterion(criterion, booleanValue(false)).satisfied).toBe(
      false,
    );
  });

  it("matches equal material references", () => {
    const criterion: MatchCriterion = {
      key: "material",
      label: "Material",
      operator: "eq",
      value: materialValue("steel-4140"),
    };
    expect(
      evaluateCriterion(criterion, materialValue("steel-4140")).satisfied,
    ).toBe(true);
    expect(
      evaluateCriterion(criterion, materialValue("steel-1045")).satisfied,
    ).toBe(false);
  });

  it("rejects gte/lte on a non-quantity criterion as a setup error", () => {
    const criterion: MatchCriterion = {
      key: "mounting",
      label: "Mounting",
      operator: "gte",
      value: enumValue("ball_screw.mounting", "fixed_free"),
    };
    expect(() =>
      evaluateCriterion(
        criterion,
        enumValue("ball_screw.mounting", "fixed_free"),
      ),
    ).toThrow(MatchCriterionError);
  });
});

describe("evaluateCriterion — missing and mismatched candidate data", () => {
  const criterion: MatchCriterion = {
    key: "dynamicLoad",
    label: "Dynamic load rating",
    operator: "gte",
    value: makeQuantity(3660, "N"),
  };

  it("reports missing_attribute when the candidate lacks the key", () => {
    const result = evaluateCriterion(criterion, undefined);
    expect(result.satisfied).toBe(false);
    expect(result.reason).toBe("missing_attribute");
  });

  it("reports value_kind_mismatch when kinds differ", () => {
    const result = evaluateCriterion(criterion, booleanValue(true));
    expect(result.satisfied).toBe(false);
    expect(result.reason).toBe("value_kind_mismatch");
  });
});

describe("evaluateCandidate", () => {
  const criteria: MatchCriterion[] = [
    {
      key: "dynamicLoad",
      label: "Dynamic load rating",
      operator: "gte",
      value: makeQuantity(3660, "N"),
    },
    {
      key: "lead",
      label: "Lead",
      operator: "eq",
      value: makeQuantity(20, "mm"),
    },
  ];

  it("passes only when every criterion is satisfied", () => {
    const passing = evaluateCandidate(
      criteria,
      candidate("part-a", {
        dynamicLoad: makeQuantity(4026, "N"),
        lead: makeQuantity(20, "mm"),
      }),
    );
    expect(passing.passed).toBe(true);
    expect(passing.criteria).toHaveLength(2);

    const failing = evaluateCandidate(
      criteria,
      candidate("part-b", {
        dynamicLoad: makeQuantity(3000, "N"),
        lead: makeQuantity(20, "mm"),
      }),
    );
    expect(failing.passed).toBe(false);
  });
});

describe("rankCandidates", () => {
  const criteria: MatchCriterion[] = [
    {
      key: "dynamicLoad",
      label: "Dynamic load rating",
      operator: "gte",
      value: makeQuantity(3660, "N"),
    },
  ];

  it("excludes hard-filter-failing candidates from the accepted/ranked list", () => {
    const result = rankCandidates(criteria, [
      candidate("too-weak", { dynamicLoad: makeQuantity(2000, "N") }),
      candidate("just-right", { dynamicLoad: makeQuantity(4000, "N") }),
    ]);
    expect(result.accepted.map((r) => r.candidate.id)).toEqual(["just-right"]);
    expect(result.rejected.map((r) => r.candidate.id)).toEqual(["too-weak"]);
    expect(result.rejected[0].criteria[0].reason).toBe("below_minimum");
  });

  it("ranks passing candidates tightest-fit first (smallest surplus margin)", () => {
    const result = rankCandidates(criteria, [
      candidate("oversized", { dynamicLoad: makeQuantity(10000, "N") }),
      candidate("snug", { dynamicLoad: makeQuantity(3700, "N") }),
      candidate("moderate", { dynamicLoad: makeQuantity(5000, "N") }),
    ]);
    expect(result.accepted.map((r) => r.candidate.id)).toEqual([
      "snug",
      "moderate",
      "oversized",
    ]);
    expect(result.accepted[0].score).toBeLessThan(result.accepted[1].score);
    expect(result.accepted[1].score).toBeLessThan(result.accepted[2].score);
  });

  it("breaks score ties deterministically by candidate id", () => {
    const result = rankCandidates(criteria, [
      candidate("zebra", { dynamicLoad: makeQuantity(3660, "N") }),
      candidate("alpha", { dynamicLoad: makeQuantity(3660, "N") }),
    ]);
    expect(result.accepted.map((r) => r.candidate.id)).toEqual([
      "alpha",
      "zebra",
    ]);
  });

  it("gives a candidate with only eq criteria a score of 0 (no scored margin)", () => {
    const eqOnly: MatchCriterion[] = [
      {
        key: "lead",
        label: "Lead",
        operator: "eq",
        value: makeQuantity(20, "mm"),
      },
    ];
    const result = rankCandidates(eqOnly, [
      candidate("exact", { lead: makeQuantity(20, "mm") }),
    ]);
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0].score).toBe(0);
  });
});

describe("describeRequiredSpec", () => {
  it("formats each value kind for display", () => {
    const criteria: MatchCriterion[] = [
      {
        key: "dynamicLoad",
        label: "Dynamic load rating",
        operator: "gte",
        value: makeQuantity(3660, "N"),
      },
      {
        key: "preloaded",
        label: "Preloaded",
        operator: "eq",
        value: booleanValue(true),
      },
      {
        key: "mounting",
        label: "Mounting",
        operator: "eq",
        value: enumValue("ball_screw.mounting", "fixed_free"),
      },
      {
        key: "material",
        label: "Material",
        operator: "eq",
        value: materialValue("steel-4140"),
      },
    ];
    const summary = describeRequiredSpec(criteria);
    expect(summary).toEqual([
      {
        key: "dynamicLoad",
        label: "Dynamic load rating",
        operator: "gte",
        displayValue: "3660 N",
      },
      {
        key: "preloaded",
        label: "Preloaded",
        operator: "eq",
        displayValue: "true",
      },
      {
        key: "mounting",
        label: "Mounting",
        operator: "eq",
        displayValue: "fixed_free",
      },
      {
        key: "material",
        label: "Material",
        operator: "eq",
        displayValue: "steel-4140",
      },
    ]);
  });
});
