import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { axisHorizontalBasicFixture } from "./axis-horizontal-basic/fixture";
import { axisVerticalFixture } from "./axis-vertical/fixture";
import type { AxisHistoricalFixture } from "./fixture-types";

/**
 * Guards the Unit 4.1 release decision recorded in
 * docs/superpowers/specs/2026-08-11-unit-4.1-release-design.md ("Evidence
 * Disposition"): ID39 and ID42 are accepted as `release_candidate`
 * historical-regression evidence, not `release_grade` vendor validation, and
 * every source image/PDF backing them must still hash to the value recorded
 * in fixture.ts. This test intentionally fails while either fixture remains
 * `draft` and would fail again if a source file's bytes changed.
 */
function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const fixtures: readonly AxisHistoricalFixture[] = [
  axisHorizontalBasicFixture,
  axisVerticalFixture,
];

describe("axis fixture evidence integrity (Unit 4.1 release gate)", () => {
  for (const fixture of fixtures) {
    describe(fixture.id, () => {
      it("is accepted as release-candidate evidence at the 0.1.0-release-candidate revision", () => {
        expect(fixture.evidenceStatus).toBe("release_candidate");
        expect(fixture.revision).toBe("0.1.0-release-candidate");
      });

      it("leaves every expected metric's load-case mapping unclassified", () => {
        const metrics = [
          ...fixture.expectedResults.axisLoadCases,
          ...fixture.expectedResults.downstreamReferenceValues,
        ];
        expect(
          metrics.every(
            (metric) =>
              metric.intendedModuleMapping.loadCase === "unclassified" &&
              metric.intendedModuleMapping.status === "unclassified",
          ),
        ).toBe(true);
      });

      for (const evidence of fixture.sourceEvidence) {
        it(`reproduces the recorded SHA-256 for ${evidence.rawMaterialPath}`, () => {
          const digest = sha256(resolve(process.cwd(), evidence.rawMaterialPath));
          expect(digest).toBe(evidence.rawMaterialSha256.toLowerCase());
        });
      }
    });
  }

  it("reproduces the recorded SHA-256 for the Atlanta rack-and-pinion source PDF", () => {
    expect(
      sha256(
        resolve(
          process.cwd(),
          "reference/source-material/Atlanta_Rack and Pinion Drive Calculations and Selection.pdf",
        ),
      ),
    ).toBe(
      "2bc6e48c2dce79dd0c252eae97cfcaa8f35fbc73c65ef5e73ace9638c42321b6",
    );
  });
});
