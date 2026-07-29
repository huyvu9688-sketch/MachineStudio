import { describe, expect, it } from "vitest";
import { makeQuantity } from "../units";
import {
  checkImportBoundary,
  runModuleConformance,
  type ConformanceReport,
  type ModuleSourceFile,
} from "./conformance";
import { sealModulePackage } from "./hash";
import { exampleThrustModule } from "./example-module";
import { baseCompute, baseDraft } from "./test-support";
import type { ModuleComputation } from "./types";

const validExampleInput = {
  values: {
    payload_mass: makeQuantity(12, "kg"),
    friction_coefficient: makeQuantity(0.01, "ratio"),
    // gravity omitted — filled from its constant default at execution
  },
};

function checkStatus(report: ConformanceReport, id: string): string {
  const check = report.checks.find((c) => c.id === id);
  if (check === undefined) throw new Error(`no conformance check "${id}"`);
  return check.status;
}

describe("runModuleConformance — a conforming module", () => {
  it("passes every applicable check for the example module", () => {
    const report = runModuleConformance(exampleThrustModule, {
      sampleInputs: [validExampleInput],
    });
    expect(report.ok).toBe(true);
    expect(checkStatus(report, "package-validation")).toBe("pass");
    expect(checkStatus(report, "execution")).toBe("pass");
    expect(checkStatus(report, "determinism")).toBe("pass");
  });

  it("skips execution/determinism when no sample inputs are given", () => {
    const report = runModuleConformance(exampleThrustModule);
    expect(report.ok).toBe(true);
    expect(checkStatus(report, "execution")).toBe("skipped");
    expect(checkStatus(report, "determinism")).toBe("skipped");
    expect(checkStatus(report, "import-boundary")).toBe("skipped");
  });

  it("runs the import-boundary check when clean sources are provided", () => {
    const sources: ModuleSourceFile[] = [
      {
        path: "compute.ts",
        contents: `import { makeQuantity } from "@/lib/engine";\nimport { z } from "zod";`,
      },
    ];
    const report = runModuleConformance(exampleThrustModule, { sources });
    expect(checkStatus(report, "import-boundary")).toBe("pass");
  });
});

describe("runModuleConformance — non-conforming modules", () => {
  it("fails package-validation for a tampered content hash", () => {
    const sealed = sealModulePackage(baseDraft());
    const tampered = {
      ...sealed,
      manifest: { ...sealed.manifest, contentHash: "0000000000000000" },
    };
    const report = runModuleConformance(tampered);
    expect(report.ok).toBe(false);
    expect(checkStatus(report, "package-validation")).toBe("fail");
  });

  it("fails execution for an input missing a required value", () => {
    const pkg = sealModulePackage(baseDraft());
    const report = runModuleConformance(pkg, { sampleInputs: [{ values: {} }] });
    expect(report.ok).toBe(false);
    expect(checkStatus(report, "execution")).toBe("fail");
  });

  it("fails determinism for a nondeterministic compute", () => {
    const randomCompute = (): ModuleComputation => ({
      ...baseCompute(),
      outputs: { out: makeQuantity(Math.random(), "N") },
    });
    const pkg = sealModulePackage({ ...baseDraft(), compute: randomCompute });
    const report = runModuleConformance(pkg, {
      sampleInputs: [{ values: { mass: makeQuantity(5, "kg") } }],
    });
    expect(checkStatus(report, "determinism")).toBe("fail");
    expect(report.ok).toBe(false);
  });

  it("fails import-boundary when a source crosses the module boundary", () => {
    const sources: ModuleSourceFile[] = [
      {
        path: "compute.ts",
        contents: `import { prisma } from "@/lib/db";\nimport fs from "node:fs";`,
      },
    ];
    const report = runModuleConformance(exampleThrustModule, { sources });
    expect(checkStatus(report, "import-boundary")).toBe("fail");
  });
});

describe("checkImportBoundary", () => {
  it("allows engine, standards, zod, and relative imports", () => {
    const sources: ModuleSourceFile[] = [
      {
        path: "a.ts",
        contents: [
          `import { makeQuantity } from "@/lib/engine";`,
          `import type { SourceRevisionId } from "@/lib/standards";`,
          `import { z } from "zod";`,
          `import { buildTrace } from "./trace";`,
          `import { helper } from "../shared";`,
        ].join("\n"),
      },
    ];
    expect(checkImportBoundary(sources)).toEqual([]);
  });

  it("flags persistence, auth, framework, UI, and Node I/O imports", () => {
    const sources: ModuleSourceFile[] = [
      {
        path: "b.ts",
        contents: [
          `import { db } from "@/lib/db";`,
          `import { PrismaClient } from "@prisma/client";`,
          `import { auth } from "@clerk/nextjs";`,
          `import { NextResponse } from "next/server";`,
          `import { useState } from "react";`,
          `import { readFileSync } from "node:fs";`,
          `import { filter } from "@/lib/catalog";`,
        ].join("\n"),
      },
    ];
    const specifiers = checkImportBoundary(sources).map((v) => v.specifier);
    expect(specifiers).toEqual([
      "@/lib/db",
      "@prisma/client",
      "@clerk/nextjs",
      "next/server",
      "react",
      "node:fs",
      "@/lib/catalog",
    ]);
  });

  it("detects dynamic import() and require() specifiers", () => {
    const sources: ModuleSourceFile[] = [
      {
        path: "c.ts",
        contents: `const a = await import("@/lib/db");\nconst b = require("node:path");`,
      },
    ];
    const specifiers = checkImportBoundary(sources).map((v) => v.specifier);
    expect(specifiers).toContain("@/lib/db");
    expect(specifiers).toContain("node:path");
  });
});
