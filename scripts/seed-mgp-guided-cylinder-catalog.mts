// Seeds the MGP-only catalog component type from the standard basic MGP-Z
// model/stroke table in reference/source-material/guided cylinder/MGP.md.
//
// Each CSV row is one actual MGPM, MGPL, or MGPA basic model at one exact
// standard stroke; it is not a range or an invented part-number variant.
// The source table lists bores 12/16, 20/25, and 32–100 with their respective
// standard-stroke sets (MGP catalogue page 203 / PDF printed page 537).
//
// Run manually against a real database:
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/seed-mgp-guided-cylinder-catalog.mts
//
// The script creates/imports only `pneumatic_cylinder_guided_mgp`; the legacy
// legacy guided-cylinder data and assignments remain intact.
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

const COMPONENT_TYPE_ID = "pneumatic_cylinder_guided_mgp";
const SCHEMA_VERSION = "1.0.0";

const MGP_GUIDED_CYLINDER_SCHEMA_FIELDS: ComponentAttributeFieldDefinition[] = [
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
    key: "bearing_type",
    label: "Guide bearing type",
    valueKind: "enum",
    required: true,
    enumId: "mgp_bearing_type",
  },
  {
    key: "standard_stroke",
    label: "Exact standard stroke",
    valueKind: "quantity",
    required: true,
    unit: "mm",
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
    name: "MGP pneumatic guided cylinder",
    description:
      "SMC MGP compact guide cylinder, one actual standard model and stroke per catalog row.",
  });

  const schemaVersion = await loadOrCreateComponentSchemaVersion(
    COMPONENT_TYPE_ID,
    SCHEMA_VERSION,
    MGP_GUIDED_CYLINDER_SCHEMA_FIELDS,
  );

  const mapping: ImportMapping = {
    id: "smc-mgp-standard-strokes",
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
        target: "bearing_type",
        source: { kind: "column", column: "Bearing Type" },
      },
      {
        target: "standard_stroke",
        source: { kind: "column", column: "Standard Stroke (mm)" },
        sourceUnit: "mm",
      },
    ],
  };

  const csvText = readFileSync(
    join(REPO_ROOT, "reference/catalog-seed/smc-mgp.csv"),
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
        "SMC MGP standard-stroke catalog seed (MGP.md pages 203 and 2841)",
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
