// `latestVersionOnly` is the "Add module" picker's own duplicate-version
// filter (see page.tsx, which consumes it): once a module accumulates more
// than one released version (e.g. pneumatic-cylinder-sizing@0.1.0 and
// @0.1.1), listing every one of them as a separate picker option produced
// confusing duplicate entries with identical friendly names.
import { describe, expect, it } from "vitest";
import { latestVersionOnly } from "./module-package-options";
import type { ModulePackageOption } from "@/components/engineering/add-module-instance-dialog";

describe("latestVersionOnly", () => {
  it("keeps only the newest version of each module id", () => {
    const packages: ModulePackageOption[] = [
      {
        modulePackageId: "pneumatic-cylinder-sizing",
        moduleVersion: "0.1.0",
        category: "cylinder-sizing.pneumatic",
      },
      {
        modulePackageId: "pneumatic-cylinder-sizing",
        moduleVersion: "0.1.1",
        category: "cylinder-sizing.pneumatic",
      },
      {
        modulePackageId: "belt-pulley-drive-motor-sizing",
        moduleVersion: "0.3.1",
        category: "motor-sizing.belt-pulley",
      },
    ];

    expect(latestVersionOnly(packages)).toEqual([
      {
        modulePackageId: "pneumatic-cylinder-sizing",
        moduleVersion: "0.1.1",
        category: "cylinder-sizing.pneumatic",
      },
      {
        modulePackageId: "belt-pulley-drive-motor-sizing",
        moduleVersion: "0.3.1",
        category: "motor-sizing.belt-pulley",
      },
    ]);
  });

  it("compares version segments numerically, not lexicographically", () => {
    const packages: ModulePackageOption[] = [
      { modulePackageId: "m", moduleVersion: "0.9.0", category: "c" },
      { modulePackageId: "m", moduleVersion: "0.10.0", category: "c" },
      { modulePackageId: "m", moduleVersion: "0.2.0", category: "c" },
    ];

    expect(latestVersionOnly(packages)).toEqual([
      { modulePackageId: "m", moduleVersion: "0.10.0", category: "c" },
    ]);
  });

  it("passes through modules with a single registered version unchanged", () => {
    const packages: ModulePackageOption[] = [
      { modulePackageId: "example-scaffold", moduleVersion: "0.1.0", category: "example" },
    ];

    expect(latestVersionOnly(packages)).toEqual(packages);
  });
});
