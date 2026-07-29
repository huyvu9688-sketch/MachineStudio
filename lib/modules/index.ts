// lib/modules owns the versioned calculation module packages. Each package
// lives at lib/modules/<module-id>/<version>/ and exports a sealed ModulePackage
// as its default export (context/architecture.md `lib/modules/`;
// context/code-standards.md "Module Packages"). Scaffold a new module with
// `npm run module:new -- <id>`; regenerate the registry with
// `npm run registry:generate`.
//
// The registry itself is generated (./registry.generated) so the module list
// stays in sync with the filesystem and is typechecked like any other source.

import type { ModulePackage } from "@/lib/engine";
import { moduleRegistryKey } from "@/lib/engine";
import { MODULE_REGISTRY } from "./registry.generated";

export { MODULE_REGISTRY };

/**
 * Looks up a registered module package by ID and version, or `undefined` when
 * no such version is registered.
 */
export function getModulePackage(
  moduleId: string,
  version: string,
): ModulePackage | undefined {
  return MODULE_REGISTRY[moduleRegistryKey(moduleId, version)];
}

/** Every registered module package, in registration-key order. */
export function listModulePackages(): readonly ModulePackage[] {
  return Object.values(MODULE_REGISTRY);
}
