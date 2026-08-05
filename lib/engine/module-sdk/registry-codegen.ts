// Compile-time module registry code generator (Unit 1.7; context/architecture.md
// "Module Consistency Mechanisms" #4). Given the discovered module packages,
// emits the source of lib/modules/registry.generated.ts: a keyed
// `Record<"<moduleId>@<version>", ModulePackage>` importing each package's
// default export. A generated (not hand-maintained) registry keeps the module
// list in sync with the filesystem and is typechecked like any other source.
//
// Like ./scaffold, this module has no runtime imports (types are local) so the
// `scripts/generate-registry.ts` CLI can import it under Node's native
// TypeScript execution. It performs no I/O; the CLI writes the returned source.

/** One module to register. */
export interface RegistryModuleEntry {
  /** Stable module ID. */
  readonly moduleId: string;
  /** Semantic version. */
  readonly version: string;
  /** Import path relative to lib/modules, e.g. `"./ball-screw/1.0.0"`. */
  readonly importPath: string;
}

/** The registry key for a module: `"<moduleId>@<version>"`. */
export function moduleRegistryKey(moduleId: string, version: string): string {
  return `${moduleId}@${version}`;
}

/** A safe JS identifier for a default import of the given entry. */
function importIdentifier(entry: RegistryModuleEntry): string {
  const base = `${entry.moduleId}_${entry.version}`.replace(
    /[^a-zA-Z0-9]/g,
    "_",
  );
  return `mod_${base}`;
}

const HEADER = `// GENERATED FILE — do not edit by hand.
// Run \`npm run registry:generate\` to regenerate from
// lib/modules/<module-id>/<version>/index.ts default exports.
`;

/**
 * Generates the source of the compile-time module registry from `entries`.
 * Entries are emitted in the order given; the caller sorts for determinism.
 */
export function generateRegistrySource(
  entries: readonly RegistryModuleEntry[],
): string {
  const importLines = entries
    .map((e) => `import ${importIdentifier(e)} from "${e.importPath}";`)
    .join("\n");

  const recordLines = entries
    .map(
      (e) =>
        `  ${JSON.stringify(moduleRegistryKey(e.moduleId, e.version))}: ${importIdentifier(e)},`,
    )
    .join("\n");

  const imports =
    entries.length === 0
      ? `import type { ModulePackage } from "@/lib/engine";`
      : `import type { ModulePackage } from "@/lib/engine";\n${importLines}`;

  const record =
    entries.length === 0
      ? `export const MODULE_REGISTRY: Readonly<Record<string, ModulePackage>> = {};`
      : `export const MODULE_REGISTRY: Readonly<Record<string, ModulePackage>> = {\n${recordLines}\n};`;

  return `${HEADER}\n${imports}\n\n/** Every registered module package, keyed by "<moduleId>@<version>". */\n${record}\n`;
}
