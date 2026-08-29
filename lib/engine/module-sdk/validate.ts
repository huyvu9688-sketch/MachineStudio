// Static/semantic validation of a module package (Unit 1.6). Beyond the shape
// checks in ./schemas, this enforces the package invariants that make a module
// safe to register and execute (context/architecture.md "Module Consistency
// Mechanisms"; context/code-standards.md "Module Packages"):
//  - well-formed manifest, ports, UI/report schemas, and validation record
//  - a well-formed SDK range and a compatible parameter-registry version
//  - unique input/output port keys
//  - every port references a registered canonical parameter
//  - every UI field references a declared input port
//  - the manifest's content hash matches the package content
//
// This is the registration-time gate. Run-time input/output/trace validation
// lives in ./execute.

import { PARAMETER_REGISTRY, type ParameterRegistry } from "../parameters";
import { ModuleSdkError } from "./errors";
import { packageContentHash } from "./hash";
import {
  ModuleManifestSchema,
  ModulePortsSchema,
  ModuleReportSchemaSchema,
  ModuleUiSchemaSchema,
  ValidationRecordSchema,
} from "./schemas";
import { isValidSdkRange } from "./sdk";
import type { ModulePackage } from "./types";

function fail(
  code: ModuleSdkError["code"],
  message: string,
  subjectId?: string,
): never {
  throw new ModuleSdkError(code, message, subjectId);
}

function uniqueKeys(keys: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) return key;
    seen.add(key);
  }
  return undefined;
}

/**
 * Validates a module package against the SDK invariants using `registry`
 * (default: the released canonical parameter registry).
 *
 * @throws {@link ModuleSdkError} on the first invariant violation.
 */
export function validateModulePackage(
  pkg: ModulePackage,
  registry: ParameterRegistry = PARAMETER_REGISTRY,
): void {
  const manifest = ModuleManifestSchema.safeParse(pkg.manifest);
  if (!manifest.success) {
    fail(
      "invalid_manifest",
      `Malformed manifest: ${manifest.error.message}`,
      pkg.manifest.id,
    );
  }
  const id = manifest.data.id;

  if (!isValidSdkRange(manifest.data.sdkRange)) {
    fail(
      "invalid_sdk_range",
      `Module "${id}" declares a malformed SDK range.`,
      id,
    );
  }

  const ports = ModulePortsSchema.safeParse(pkg.ports);
  if (!ports.success) {
    fail(
      "invalid_manifest",
      `Module "${id}" has malformed ports: ${ports.error.message}`,
      id,
    );
  }

  if (!registry.supportsVersion(manifest.data.parameterRegistryVersion)) {
    fail(
      "registry_version_mismatch",
      `Module "${id}" targets unsupported registry ${manifest.data.parameterRegistryVersion}; the active registry is ${registry.version}.`,
      id,
    );
  }

  const inputKeys = pkg.ports.inputs.map((p) => p.key);
  const outputKeys = pkg.ports.outputs.map((p) => p.key);
  const dupInput = uniqueKeys(inputKeys);
  if (dupInput !== undefined) {
    fail(
      "duplicate_port_key",
      `Module "${id}" has duplicate input port key "${dupInput}".`,
      id,
    );
  }
  const dupOutput = uniqueKeys(outputKeys);
  if (dupOutput !== undefined) {
    fail(
      "duplicate_port_key",
      `Module "${id}" has duplicate output port key "${dupOutput}".`,
      id,
    );
  }

  for (const port of [...pkg.ports.inputs, ...pkg.ports.outputs]) {
    if (!registry.has(port.parameterId)) {
      fail(
        "unknown_parameter",
        `Module "${id}" port "${port.key}" references unknown parameter "${port.parameterId}".`,
        port.parameterId,
      );
    }

    const definition = registry.get(port.parameterId);
    if (
      port.loadCase !== undefined &&
      (definition?.loadCases === undefined ||
        !definition.loadCases.includes(port.loadCase))
    ) {
      fail(
        "invalid_port_load_case",
        `Module "${id}" port "${port.key}" declares load case "${port.loadCase}", but parameter "${port.parameterId}" does not admit it.`,
        port.key,
      );
    }
  }

  const ui = ModuleUiSchemaSchema.safeParse(pkg.uiSchema);
  if (!ui.success) {
    fail("invalid_ui_schema", `Module "${id}" has a malformed UI schema.`, id);
  }
  const groupIds = ui.data.groups.map((g) => g.id);
  const dupGroup = uniqueKeys(groupIds);
  if (dupGroup !== undefined) {
    fail(
      "invalid_ui_schema",
      `Module "${id}" has duplicate UI group ID "${dupGroup}".`,
      id,
    );
  }
  const inputKeySet = new Set(inputKeys);
  const inputPortsByKey = new Map(pkg.ports.inputs.map((p) => [p.key, p]));
  for (const group of ui.data.groups) {
    for (const field of group.fields) {
      if (!inputKeySet.has(field.portKey)) {
        fail(
          "invalid_ui_schema",
          `Module "${id}" UI field references unknown input port "${field.portKey}".`,
          field.portKey,
        );
      }

      if (field.disabledWhen !== undefined) {
        const drivingPort = inputPortsByKey.get(field.disabledWhen.portKey);
        if (drivingPort === undefined) {
          fail(
            "invalid_ui_schema",
            `Module "${id}" UI field "${field.portKey}" has disabledWhen referencing unknown input port "${field.disabledWhen.portKey}".`,
            field.disabledWhen.portKey,
          );
        }
        const drivingDefinition = registry.get(drivingPort.parameterId);
        if (drivingDefinition?.valueType !== "enum") {
          fail(
            "invalid_ui_schema",
            `Module "${id}" UI field "${field.portKey}" has disabledWhen referencing non-enum input port "${field.disabledWhen.portKey}".`,
            field.disabledWhen.portKey,
          );
        }
      }
    }
  }

  for (const callout of ui.data.callouts ?? []) {
    if (callout.caseText === undefined) continue;
    const drivingPort = inputPortsByKey.get(callout.caseText.portKey);
    if (drivingPort === undefined) {
      fail(
        "invalid_ui_schema",
        `Module "${id}" callout "${callout.title}" references unknown input port "${callout.caseText.portKey}".`,
        callout.caseText.portKey,
      );
    }
    const drivingDefinition = registry.get(drivingPort.parameterId);
    if (drivingDefinition?.valueType !== "enum") {
      fail(
        "invalid_ui_schema",
        `Module "${id}" callout "${callout.title}" caseText must reference an enum input port.`,
        callout.caseText.portKey,
      );
    }
    for (const entry of callout.caseText.cases) {
      if (!drivingDefinition.enumOptions?.includes(entry.value)) {
        fail(
          "invalid_ui_schema",
          `Module "${id}" callout "${callout.title}" has unsupported enum value "${entry.value}".`,
          entry.value,
        );
      }
    }
  }
  const report = ModuleReportSchemaSchema.safeParse(pkg.reportSchema);
  if (!report.success) {
    fail(
      "invalid_report_schema",
      `Module "${id}" has a malformed report schema.`,
      id,
    );
  }
  const dupSection = uniqueKeys(report.data.sections.map((s) => s.id));
  if (dupSection !== undefined) {
    fail(
      "invalid_report_schema",
      `Module "${id}" has duplicate report section ID "${dupSection}".`,
      id,
    );
  }

  const validation = ValidationRecordSchema.safeParse(pkg.validation);
  if (!validation.success) {
    fail(
      "invalid_validation_record",
      `Module "${id}" has a malformed validation record.`,
      id,
    );
  }

  if (
    pkg.catalogAdapter !== undefined &&
    pkg.catalogAdapter.componentType.trim() === ""
  ) {
    fail(
      "invalid_catalog_adapter",
      `Module "${id}" catalog adapter has an empty component type.`,
      id,
    );
  }

  const expectedHash = packageContentHash(pkg);
  if (manifest.data.contentHash !== expectedHash) {
    fail(
      "content_hash_mismatch",
      `Module "${id}" content hash ${manifest.data.contentHash} does not match computed ${expectedHash}.`,
      id,
    );
  }
}
