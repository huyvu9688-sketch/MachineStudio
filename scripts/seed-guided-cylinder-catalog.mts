// scripts/seed-guided-cylinder-catalog.mts
//
// One-time catalog seed for the pneumatic_cylinder_guided component type
// (Unit 7.3, Stage 5). Creates the Manufacturer, ComponentType, and
// ComponentSchemaVersion, then imports reference/catalog-seed/
// smc-mgq-mgp.csv via the existing generic CSV import pipeline
// (lib/catalog/csv-import.ts, lib/application/catalogs/import-catalog.ts)
// -- no new catalog-engine code, matching context/architecture.md
// "lib/catalog/": manufacturer part data has no self-serve upload UI in
// the MVP. Mirrors scripts/seed-pneumatic-cylinder-catalog.mts's own
// structure and runtime shim exactly.
//
// SEED DATA DISCLOSURE (see also context/modules/guided-cylinder-sizing/
// stage-1-spec.md "Fetch record" and stage-2-contract.md "Addendum"): the
// 40 rows in smc-mgq-mgp.csv (20 MGQ + 20 MGP, one row per bore x bearing
// type) are directly read from SMC's own fetched MGQ and MGP series
// catalogs, for the founder to review and trim to their real working set
// after this module ships -- not a claim that every row is a part the
// founder actually stocks or specifies. The allowable lateral load and
// allowable rotational torque figures are genuinely stroke-dependent in
// SMC's own published tables (a separate figure per stroke length, not one
// constant per bore) -- this seed uses each row's own minimum populated
// stroke in that table (the "Rating Stroke" CSV column) as a single
// representative, conservative figure, not the full per-stroke table. A
// later version could seed a per-stroke table if the founder needs finer
// resolution; this module's own catalog matcher (lib/application/catalogs/
// guided-cylinder-matching.ts) does not vary the check by stroke today. MGP
// rows have no allowable_lateral_load value at all (blank CSV cell, valid
// since the schema field is optional) -- MGP's own catalog publishes a
// plate-displacement stiffness graph for the equivalent data, not a
// discrete allowable-load rating (stage-1-spec.md correction 2); the
// catalog matcher treats a missing value as "not applicable," not a
// rejection.
//
// Run manually, once, against a real database:
//
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/seed-guided-cylinder-catalog.mts

// --- Runtime shim --------------------------------------------------------
// See scripts/seed-pneumatic-cylinder-catalog.mts's own header for why
// this hook is needed (bundler-style extensionless imports, "@/*"
// tsconfig-path resolution, and the "server-only" package's throwing
// default export under plain Node) -- identical shim, copied rather than
// shared, matching that script's own standalone-file precedent.
import { register } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

// Dynamic imports, not static ones -- see the runtime-shim comment above.
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
const { importCatalog } =
  await import("../lib/application/catalogs/import-catalog.ts");

// --- Component schema (Stage 5 Step 1) -------------------------------------

const COMPONENT_TYPE_ID = "pneumatic_cylinder_guided";
const SCHEMA_VERSION = "1.0.0";

const GUIDED_CYLINDER_SCHEMA_FIELDS: ComponentAttributeFieldDefinition[] = [
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
    key: "allowable_lateral_load",
    label: "Allowable lateral load",
    valueKind: "quantity",
    required: false,
    unit: "N",
  },
  {
    key: "allowable_torque",
    label: "Allowable rotational torque of plate",
    valueKind: "quantity",
    required: true,
    unit: "N*m",
  },
];

// --- Load-or-create setup (Step 3) -----------------------------------------

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
    name: "Pneumatic guided cylinder",
    description:
      "Compact guide cylinder with a built-in guide plate rated for lateral load and rotational torque (SMC MGQ/MGP series and equivalents).",
  });

  const schemaVersion = await loadOrCreateComponentSchemaVersion(
    COMPONENT_TYPE_ID,
    SCHEMA_VERSION,
    GUIDED_CYLINDER_SCHEMA_FIELDS,
  );

  const mapping: ImportMapping = {
    id: "smc-mgq-mgp-basic",
    version: "1.0.0",
    componentTypeId: COMPONENT_TYPE_ID,
    componentSchemaVersionId: schemaVersion.id,
    fields: [
      { target: "partNumber", source: { kind: "column", column: "Model" } },
      {
        target: "sourceRevision",
        source: { kind: "constant", value: "2026-08-26" },
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
        target: "allowable_lateral_load",
        source: { kind: "column", column: "Allowable Lateral Load (N)" },
        sourceUnit: "N",
      },
      {
        target: "allowable_torque",
        source: { kind: "column", column: "Allowable Torque (N*m)" },
        sourceUnit: "N*m",
      },
    ],
  };

  const csvText = readFileSync(
    join(REPO_ROOT, "reference/catalog-seed/smc-mgq-mgp.csv"),
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
        "SMC MGQ/MGP catalog seed (representative, founder-review pending)",
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
