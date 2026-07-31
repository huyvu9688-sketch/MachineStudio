import { describe, expect, it } from "vitest";
import { makeQuantity } from "@/lib/engine/units";
import type { CheckResult } from "@/lib/engine/trace";
import {
  compareStoredCalculationResults,
  type StoredCalculationResultForComparison,
} from "./baseline-run-comparison";

function check(
  id: string,
  status: CheckResult["status"],
  observed: number,
): CheckResult {
  return {
    id,
    status,
    message: `${id} result`,
    criterion: `${id} limit`,
    observed: makeQuantity(observed, "N"),
    allowable: makeQuantity(20, "N"),
    margin: makeQuantity(20 - observed, "N"),
  };
}

function result(
  id: string,
  outputs: StoredCalculationResultForComparison["outputs"],
  checks: readonly CheckResult[],
): StoredCalculationResultForComparison {
  return { id, outputs, checks };
}

describe("compareStoredCalculationResults", () => {
  it("reports changed, added, and removed outputs without relying on a current module package", () => {
    const comparison = compareStoredCalculationResults(
      result(
        "run-before",
        {
          force: makeQuantity(10, "N"),
          removed_output: makeQuantity(1, "N"),
          unchanged: makeQuantity(5, "N"),
        },
        [],
      ),
      result(
        "run-after",
        {
          force: makeQuantity(12, "N"),
          added_output: makeQuantity(2, "N"),
          unchanged: makeQuantity(5, "N"),
        },
        [],
      ),
    );

    expect(comparison.beforeRunId).toBe("run-before");
    expect(comparison.afterRunId).toBe("run-after");
    expect(comparison.changedOutputs).toEqual([
      { portKey: "added_output", before: null, after: makeQuantity(2, "N") },
      {
        portKey: "force",
        before: makeQuantity(10, "N"),
        after: makeQuantity(12, "N"),
      },
      { portKey: "removed_output", before: makeQuantity(1, "N"), after: null },
    ]);
  });

  it("reports a check when its engineering payload changes even if its status does not", () => {
    const comparison = compareStoredCalculationResults(
      result("run-before", {}, [
        check("load", "pass", 10),
        check("removed", "warning", 18),
      ]),
      result("run-after", {}, [
        check("load", "pass", 12),
        check("added", "fail", 25),
      ]),
    );

    expect(comparison.changedChecks.map((changed) => changed.id)).toEqual([
      "added",
      "load",
      "removed",
    ]);
    expect(comparison.changedChecks[1]).toMatchObject({
      id: "load",
      before: { status: "pass", observed: { value: 10 } },
      after: { status: "pass", observed: { value: 12 } },
    });
    expect(comparison.changedChecks[0]?.before).toBeNull();
    expect(comparison.changedChecks[2]?.after).toBeNull();
  });

  it("omits unchanged outputs and checks", () => {
    const stable = result("run", { force: makeQuantity(10, "N") }, [
      check("load", "pass", 10),
    ]);

    const comparison = compareStoredCalculationResults(stable, {
      ...stable,
      id: "run-next",
    });

    expect(comparison.changedOutputs).toEqual([]);
    expect(comparison.changedChecks).toEqual([]);
  });

  it("reports a check when only its immutable source citation changes", () => {
    const sourceBefore: NonNullable<CheckResult["sources"]>[number] = {
      sourceRevisionId: "standard@1" as NonNullable<
        CheckResult["sources"]
      >[number]["sourceRevisionId"],
      clause: "6.1",
    };
    const sourceAfter: NonNullable<CheckResult["sources"]>[number] = {
      sourceRevisionId: "standard@2" as NonNullable<
        CheckResult["sources"]
      >[number]["sourceRevisionId"],
      clause: "6.1",
    };
    const before = check("load", "pass", 10);
    const after = { ...before, sources: [sourceAfter] };

    const comparison = compareStoredCalculationResults(
      result("run-before", {}, [{ ...before, sources: [sourceBefore] }]),
      result("run-after", {}, [after]),
    );

    expect(comparison.changedChecks.map((changed) => changed.id)).toEqual([
      "load",
    ]);
  });

  it("treats a whole run added to or removed from a baseline as output/check changes", () => {
    const added = result("run-after", { force: makeQuantity(10, "N") }, [
      check("load", "pass", 10),
    ]);

    const addedComparison = compareStoredCalculationResults(null, added);
    const removedComparison = compareStoredCalculationResults(added, null);

    expect(addedComparison).toMatchObject({
      beforeRunId: null,
      afterRunId: "run-after",
    });
    expect(addedComparison.changedOutputs[0]).toMatchObject({
      portKey: "force",
      before: null,
    });
    expect(addedComparison.changedChecks[0]?.before).toBeNull();
    expect(removedComparison).toMatchObject({
      beforeRunId: "run-after",
      afterRunId: null,
    });
    expect(removedComparison.changedOutputs[0]).toMatchObject({
      portKey: "force",
      after: null,
    });
    expect(removedComparison.changedChecks[0]?.after).toBeNull();
  });
});
