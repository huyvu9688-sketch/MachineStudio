// scripts/seed-pneumatic-cylinder-catalog.mts
//
// One-time catalog seed for the pneumatic_cylinder component type
// (Unit 7.2, Task 14). Creates the Manufacturer, ComponentType, and
// ComponentSchemaVersion, then imports reference/catalog-seed/
// smc-cm2-ca2.csv via the existing generic CSV import pipeline
// (lib/catalog/csv-import.ts, lib/application/catalogs/import-catalog.ts)
// -- no new catalog-engine code, matching context/architecture.md
// "lib/catalog/": manufacturer part data has no self-serve upload UI in
// the MVP.
//
// SEED DATA DISCLOSURE (see also the commit message and context/modules/
// pneumatic-cylinder-sizing/stage-2-contract.md's own addendum): the 36
// rows in smc-cm2-ca2.csv are a representative seed dataset drawn from
// SMC's own published CM2/CA2 catalog dimensions (fetched and
// cross-checked in Task 13), for the founder to review and trim to their
// real working set after this module ships -- not a claim that every row
// is a part the founder actually stocks or specifies. The mounting-suffix
// model-number labels (-basic/-foot/-flange/-clevis) are descriptive
// placeholders, not SMC's own real model-number suffix convention -- Task
// 13's fetch did not confirm the real suffix letters SMC uses per mount
// type, so none is fabricated here.
//
// Run manually, once, against a real database:
//
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/seed-pneumatic-cylinder-catalog.mts
//
// (This repo's own one-time scripts -- module-new.mts, generate-registry.mts,
// module-source-hash.mts -- all run the same way, under Node's native
// TypeScript execution; package.json "engines" requires Node >=26. `npx tsx
// scripts/seed-pneumatic-cylinder-catalog.mts` -- this plan's original
// sketch -- was verified NOT to work as written: `server-only`'s default
// export throws unconditionally unless resolution sets the "react-server"
// condition Next.js's own server build sets, which neither plain Node nor
// tsx does. The runtime shim below fixes that, and also resolves this
// codebase's extensionless-relative and "@/*" tsconfig-path imports, which
// Node's native resolver does not understand on its own -- so plain Node
// works too, with no external runner dependency at all.)
//
// Idempotent: importCatalog's own upsertManufacturerPartRevision
// (ADR-0006) makes a re-run a no-op for unchanged rows; the Manufacturer /
// ComponentType / ComponentSchemaVersion setup below is each its own
// load-or-create, keyed on Manufacturer.name (DB-unique), ComponentType.id
// (caller-chosen slug), and the ComponentSchemaVersion (componentTypeId,
// version) compound key respectively -- none of the three has a repository
// "load by natural key" helper (only `loadManufacturer(id)` and
// `loadComponentSchemaVersion(id)` exist, both keyed by the generated id
// this script does not yet know), so this reads the shared `prisma` client
// directly for those three existence checks. That is not new
// catalog-engine logic: it is the same `findUnique`-then-decide shape
// `upsertManufacturerPartRevision` itself already uses internally.
//
// A re-run that changes PNEUMATIC_CYLINDER_SCHEMA_FIELDS below will *not*
// retroactively update an already-created ComponentSchemaVersion@1.0.0 --
// there is no update path (a schema version is a write-once snapshot, the
// same immutability convention every other released record in this
// codebase follows). Bump the version string here for a real field-list
// change instead of editing this file's already-run shape in place.

// --- Runtime shim --------------------------------------------------------
//
// lib/db and lib/application are written for Next.js's own bundler:
// - every relative import omits its extension (bundler-style resolution;
//   Node's own ESM resolver requires one);
// - several modules resolve through the "@/*" tsconfig path alias (Node
//   has no built-in tsconfig-paths support);
// - every lib/db and lib/application boundary file starts with
//   `import "server-only"`, a marker package whose default export throws
//   unless resolution sets the "react-server" export condition (verified
//   empirically: a bare `import "server-only"` throws under plain Node;
//   vitest.config.ts's own "server-only" alias comment documents the same
//   fact for the test runner).
//
// None of that is a lib/db or lib/application bug -- it is what every
// other consumer in this codebase gets for free from Next.js's bundler (or,
// for tests, from vitest.config.ts's `tsconfigPaths: true` resolve option
// plus its "server-only" alias). A standalone script has neither, so this
// registers the same two fixes as one Node module customization hook,
// scoped to this process only. It changes nothing about how the app or
// its tests resolve modules.
import { register } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// Type-only imports are erased entirely by Node's native TypeScript
// execution (verified: they never trigger module resolution, unlike the
// runtime imports below), so these do not need the runtime shim
// registered first and can stay ordinary static imports.
import type { ComponentAttributeFieldDefinition } from "../lib/catalog/index.ts";
import type { ImportMapping } from "../lib/catalog/index.ts";

const REPO_ROOT = process.cwd();

const LOADER_SOURCE = `
import { existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = ${JSON.stringify(REPO_ROOT)};

function resolveTsFile(target) {
  if (existsSync(target) && statSync(target).isFile()) return target;
  const candidates = [
    target + ".ts",
    target + ".tsx",
    target + ".mts",
    join(target, "index.ts"),
    join(target, "index.tsx"),
    join(target, "index.mts"),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    // The same no-op vitest.config.ts aliases "server-only" to for tests.
    return nextResolve(
      pathToFileURL(join(ROOT, "tests/stubs/server-only.ts")).href,
      context,
    );
  }

  let target;
  if (specifier.startsWith("@/")) {
    target = join(ROOT, specifier.slice(2));
  } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    if (context.parentURL) {
      target = join(dirname(fileURLToPath(context.parentURL)), specifier);
    }
  }

  if (target !== undefined) {
    const resolved = resolveTsFile(target);
    if (resolved !== undefined) {
      return nextResolve(pathToFileURL(resolved).href, context);
    }
  }
  return nextResolve(specifier, context);
}
`;

register(
  `data:text/javascript,${encodeURIComponent(LOADER_SOURCE)}`,
  import.meta.url,
);

// Dynamic imports, not static ones: the hook above must be registered
// before lib/db / lib/application are ever loaded, and a static top-level
// `import` is hoisted ahead of any other code in this file -- including
// the `register()` call above.
const {
  createComponentSchemaVersion,
  createComponentType,
  createManufacturer,
  prisma,
  asComponentSchemaVersionId,
  asComponentTypeId,
  asManufacturerId,
  asUserId,
} = await import("../lib/db/index.ts");
// Imports the specific submodule, not the lib/application barrel: the
// barrel also re-exports deleteAccount (lib/application/account/
// delete-account.ts), which pulls in @clerk/nextjs -- and Clerk's own
// published ESM dist uses extensionless relative imports (e.g.
// "./routeMatcher") that resolveTsFile() above cannot resolve (it only
// probes .ts/.tsx/.mts variants, never .js/.mjs/.cjs, since every
// first-party file in this repo is source .ts). Importing the barrel
// crashes with ERR_MODULE_NOT_FOUND on a Clerk dist file before main()
// ever runs -- verified directly. Depending on only the one real export
// this script needs sidesteps that third-party import entirely.
const { importCatalog } =
  await import("../lib/application/catalogs/import-catalog.ts");

// --- Component schema (Task 14 Step 1) ------------------------------------

const COMPONENT_TYPE_ID = "pneumatic_cylinder";
const SCHEMA_VERSION = "1.0.0";

const PNEUMATIC_CYLINDER_SCHEMA_FIELDS: ComponentAttributeFieldDefinition[] = [
  {
    key: "bore_diameter",
    label: "Bore diameter",
    valueKind: "quantity",
    required: true,
    unit: "mm",
  },
  {
    key: "rod_diameter",
    label: "Rod diameter",
    valueKind: "quantity",
    required: true,
    unit: "mm",
  },
  {
    key: "stroke_min",
    label: "Minimum standard stroke",
    valueKind: "quantity",
    required: true,
    unit: "mm",
  },
  {
    key: "stroke_max",
    label: "Maximum standard stroke",
    valueKind: "quantity",
    required: true,
    unit: "mm",
  },
  {
    key: "mounting_style",
    label: "Mounting style",
    valueKind: "enum",
    required: true,
    enumId: "pneumatic_mounting_style",
  },
  {
    key: "allowable_kinetic_energy_rubber_bumper",
    label: "Allowable cushion energy (rubber bumper)",
    valueKind: "quantity",
    required: false,
    unit: "J",
  },
  {
    key: "allowable_kinetic_energy_air_cushion",
    label: "Allowable cushion energy (air cushion)",
    valueKind: "quantity",
    required: false,
    unit: "J",
  },
];

// --- Load-or-create setup (Step 3) -----------------------------------------
//
// See the file header for why these three checks read `prisma` directly
// rather than calling a "load by natural key" repository function that
// does not exist.

async function loadOrCreateManufacturer(name: string) {
  const existing = await prisma.manufacturer.findUnique({ where: { name } });
  if (existing !== null) {
    return { id: asManufacturerId(existing.id), name: existing.name };
  }
  return createManufacturer({ name });
}

async function ensureComponentType(input: {
  id: string;
  name: string;
  description: string;
}): Promise<void> {
  const existing = await prisma.componentType.findUnique({
    where: { id: input.id },
  });
  if (existing !== null) return;
  await createComponentType(input);
}

async function loadOrCreateComponentSchemaVersion(
  componentTypeId: string,
  version: string,
  fields: readonly ComponentAttributeFieldDefinition[],
) {
  const existing = await prisma.componentSchemaVersion.findUnique({
    where: { componentTypeId_version: { componentTypeId, version } },
  });
  if (existing !== null) {
    return { id: asComponentSchemaVersionId(existing.id) };
  }
  return createComponentSchemaVersion({
    componentTypeId: asComponentTypeId(componentTypeId),
    version,
    fields,
  });
}

async function main(): Promise<void> {
  const manufacturer = await loadOrCreateManufacturer("SMC Corporation");

  await ensureComponentType({
    id: COMPONENT_TYPE_ID,
    name: "Pneumatic cylinder",
    description:
      "ISO 6431/VDMA-compatible double-acting pneumatic cylinder (SMC CM2/CA2 series and equivalents).",
  });

  const schemaVersion = await loadOrCreateComponentSchemaVersion(
    COMPONENT_TYPE_ID,
    SCHEMA_VERSION,
    PNEUMATIC_CYLINDER_SCHEMA_FIELDS,
  );

  const mapping: ImportMapping = {
    id: "smc-cm2-ca2-basic",
    version: "1.0.0",
    componentTypeId: COMPONENT_TYPE_ID,
    componentSchemaVersionId: schemaVersion.id,
    fields: [
      { target: "partNumber", source: { kind: "column", column: "Model" } },
      {
        target: "sourceRevision",
        source: { kind: "constant", value: "2026-08-24" },
      },
      {
        target: "bore_diameter",
        source: { kind: "column", column: "Bore (mm)" },
        sourceUnit: "mm",
      },
      {
        target: "rod_diameter",
        source: { kind: "column", column: "Rod (mm)" },
        sourceUnit: "mm",
      },
      {
        target: "stroke_min",
        source: { kind: "column", column: "Stroke Min (mm)" },
        sourceUnit: "mm",
      },
      {
        target: "stroke_max",
        source: { kind: "column", column: "Stroke Max (mm)" },
        sourceUnit: "mm",
      },
      {
        target: "mounting_style",
        source: { kind: "column", column: "Mounting" },
      },
      {
        target: "allowable_kinetic_energy_rubber_bumper",
        source: {
          kind: "column",
          column: "Cushion Energy Rubber Bumper (J)",
        },
        sourceUnit: "J",
      },
      {
        target: "allowable_kinetic_energy_air_cushion",
        source: { kind: "column", column: "Cushion Energy Air Cushion (J)" },
        sourceUnit: "J",
      },
    ],
  };

  const csvText = readFileSync(
    join(REPO_ROOT, "reference/catalog-seed/smc-cm2-ca2.csv"),
    "utf-8",
  );

  // A placeholder UserId: this runs outside any authenticated request
  // context. An operator running this interactively could substitute
  // their own real UserId (their Clerk id) here instead.
  const result = await importCatalog(
    {
      manufacturerId: manufacturer.id,
      componentTypeId: asComponentTypeId(COMPONENT_TYPE_ID),
      componentSchemaVersionId: schemaVersion.id,
      mapping,
      csvText,
      sourceLabel:
        "SMC CM2/CA2 catalog seed (representative, founder-review pending)",
    },
    asUserId("system-seed"),
  );

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
