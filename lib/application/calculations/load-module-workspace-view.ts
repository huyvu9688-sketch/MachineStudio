// The `loadModuleWorkspaceView` use case (Unit 3.3) — the read model the
// generic module input renderer needs, closing the gap the Unit 3.3 blocker
// named: "the workspace read model does not expose the resolved input
// source/value/link provenance needed to render the required source badges
// and load-case context" (context/progress-tracker.md "Open Questions").
//
// This performs no writes, like `loadWorkspaceView` (lib/application/
// projects/). It composes three existing boundaries without duplicating
// their logic:
//
//   - lib/db — authorizes the owner and resolves each declared input port to
//     its manual/workflow/linked/default source (`resolveModuleInputs`,
//     Unit 2.2), exactly as `executeModuleInstance` (Unit 2.4) already does.
//   - lib/modules — loads the pinned package for its ports and UI schema.
//   - lib/engine — looks up each port's canonical parameter definition, so
//     the renderer gets a fully-described field (unit/enum-options/etc.)
//     without importing the parameter registry itself.
//
// Scope note (2026-07-31 decision, superseding the BLOCKER entry this
// resolves): curve-typed fields remain deferred — the registry has no
// released curve-parameter contract yet (`ParameterValueType` has no
// "curve" member). `vector_quantity` is modeled generically here as
// "unsupported" for the same reason a curve editor is deferred: no released
// module declares one yet, and building an editor for it is out of this
// unit's literal deliverable list (implementation-map.md Unit 3.3 names only
// "Quantity with unit selector" and "Enum and boolean"). The renderer must
// never crash on either kind — it shows an honest "not yet editable" field
// instead, the same posture the curve deferral already established. A field
// still offers link suggestions regardless of this deferral (see below) —
// linking never needs a native editor.
//
// Unit 3.4 (link suggestions) extends this view with two more compositions,
// both from lib/application/parameters/: `buildConfigurationSuggestionIndex`
// + `describeLinkSuggestions` (Unit 1.8's `suggestSources`, described in
// human terms) for every non-linked field, and
// `previewRemoveParameterLinkImpact` (Unit 2.5's stale-impact computation,
// reused read-only) for every already-linked field, so a "Remove link"
// confirmation can state its downstream impact before the user commits to it
// (ui-context.md "Modals and Errors").

import "server-only";
import {
  getParameter,
  type CheckStatus,
  type LoadCaseCategory,
  type ParameterValueType,
} from "@/lib/engine";
import { getModulePackage } from "@/lib/modules";
import {
  loadModuleInstanceForOwner,
  parameterGraphNodeId,
  resolveModuleInputs,
  type AssemblyId,
  type MachineConfigurationId,
  type ModuleInstanceId,
  type ResolvedInputSource,
  type UserId,
} from "@/lib/db";
import {
  buildConfigurationSuggestionIndex,
  describeLinkSuggestions,
  previewRemoveParameterLinkImpact,
  type LinkSuggestionSourceView,
} from "../parameters";

/** A field's editable shape, derived from its canonical parameter's `valueType`. */
export type ModuleInputFieldDescriptor =
  | {
      readonly kind: "quantity";
      readonly canonicalUnit: string;
      readonly displayUnits: readonly string[];
    }
  | { readonly kind: "enum"; readonly enumId: string; readonly options: readonly string[] }
  | { readonly kind: "boolean" }
  /** `vector_quantity` today; would also cover a future `curve` parameter type. */
  | { readonly kind: "unsupported"; readonly valueType: ParameterValueType };

/** One input field, fully described for the generic renderer — no engine imports needed downstream. */
export interface ModuleInputFieldView {
  readonly portKey: string;
  readonly parameterId: string;
  readonly label: string;
  readonly help: string | null;
  readonly required: boolean;
  readonly loadCase: LoadCaseCategory | null;
  readonly field: ModuleInputFieldDescriptor;
  readonly resolved: ResolvedInputSource;
  /**
   * Ranked link suggestions for this port (Unit 3.4), nearest scope first.
   * Always `[]` when `resolved.source === "linked"` — a field with a
   * confirmed link is not offered alternatives; the user must remove the
   * existing link first (`ui-context.md` "Link Suggestions").
   */
  readonly suggestions: readonly LinkSuggestionSourceView[];
  /**
   * The number of module instances that would be marked stale if this
   * field's confirmed link were removed (Unit 3.4's "Downstream stale-impact
   * warning on removal"). `null` when `resolved.source !== "linked"` — there
   * is no link to remove.
   */
  readonly linkRemovalImpact: number | null;
}

/** A titled group of resolved input fields, in the module's declared UI order. */
export interface ModuleInputGroupView {
  readonly id: string;
  readonly title: string;
  readonly fields: readonly ModuleInputFieldView[];
}

/** Summary header fields the input workspace renders above the field groups. */
export interface ModuleWorkspaceModuleSummary {
  readonly id: ModuleInstanceId;
  readonly assemblyId: AssemblyId;
  readonly configurationId: MachineConfigurationId;
  readonly label: string;
  readonly modulePackageId: string;
  readonly moduleVersion: string;
  readonly category: string;
  readonly lastRunStatus: CheckStatus | null;
}

/** What the generic module input renderer needs for one module instance. */
export interface ModuleWorkspaceView {
  readonly moduleInstance: ModuleWorkspaceModuleSummary;
  readonly groups: readonly ModuleInputGroupView[];
}

function describeField(valueType: ParameterValueType, definition: {
  readonly canonicalUnit?: string;
  readonly displayUnits?: readonly string[];
  readonly enumId?: string;
  readonly enumOptions?: readonly string[];
}): ModuleInputFieldDescriptor {
  switch (valueType) {
    case "quantity": {
      if (definition.canonicalUnit === undefined) {
        throw new Error("Quantity parameter is missing its canonicalUnit.");
      }
      return {
        kind: "quantity",
        canonicalUnit: definition.canonicalUnit,
        displayUnits: definition.displayUnits ?? [definition.canonicalUnit],
      };
    }
    case "enum": {
      if (definition.enumId === undefined) {
        throw new Error("Enum parameter is missing its enumId.");
      }
      return { kind: "enum", enumId: definition.enumId, options: definition.enumOptions ?? [] };
    }
    case "boolean":
      return { kind: "boolean" };
    case "vector_quantity":
      return { kind: "unsupported", valueType };
    default: {
      const exhaustive: never = valueType;
      return { kind: "unsupported", valueType: exhaustive };
    }
  }
}

/**
 * Loads the generic module input renderer's read model for `moduleInstanceId`,
 * scoped to `ownerId`. Returns `null` when the module instance does not exist,
 * is not owned by `ownerId`, or its pinned package is not registered — the
 * same "nothing real to render" outcome an unknown/foreign `?module=` deep
 * link should get (mirrors `loadWorkspaceView`'s unknown-`?project=` fallback
 * posture, context/progress-tracker.md Unit 3.1).
 *
 * @throws when a registered module's UI schema references a port key or
 * canonical parameter that does not exist — an invariant the module
 * conformance suite already proves for every registered module
 * (`runModuleConformance`'s UI-schema check), so this is a genuine bug, not a
 * user-facing error.
 */
export async function loadModuleWorkspaceView(
  moduleInstanceId: ModuleInstanceId,
  ownerId: UserId,
): Promise<ModuleWorkspaceView | null> {
  const context = await loadModuleInstanceForOwner(moduleInstanceId, ownerId);
  if (context === null) {
    return null;
  }
  const { moduleInstance } = context;

  const pkg = getModulePackage(moduleInstance.modulePackageId, moduleInstance.moduleVersion);
  if (pkg === undefined) {
    return null;
  }

  const resolvedPorts = await resolveModuleInputs(
    moduleInstanceId,
    ownerId,
    pkg.ports.inputs.map((port) => ({
      parameterId: port.parameterId,
      ...(port.loadCase !== undefined ? { loadCase: port.loadCase } : {}),
    })),
  );
  if (resolvedPorts === null) {
    return null;
  }

  const resolvedByPortKey = new Map<string, ResolvedInputSource>();
  pkg.ports.inputs.forEach((port, index) => {
    resolvedByPortKey.set(port.key, resolvedPorts[index].resolved);
  });
  const portsByKey = new Map(pkg.ports.inputs.map((port) => [port.key, port]));

  // Built once per module (not per field): the suggestion index composes the
  // whole configuration's graph, so recomputing it per field would repeat the
  // same three reads for every port. `null` only when ownership was lost
  // between the check above and here (a concurrent delete) — suggestions
  // degrade to "none" rather than failing the whole view for that race.
  const suggestionIndex = await buildConfigurationSuggestionIndex(
    moduleInstance.configurationId,
    ownerId,
  );

  // Previewed up front, one read per currently-linked port, so the field map
  // below stays synchronous. Failed previews (a race with a concurrent
  // removal) degrade to "no impact" rather than failing the whole view.
  const removalImpactByPortKey = new Map<string, number>();
  for (const [portKey, resolved] of resolvedByPortKey) {
    if (resolved.source !== "linked") continue;
    const preview = await previewRemoveParameterLinkImpact(resolved.link.id, ownerId);
    removalImpactByPortKey.set(portKey, preview.ok ? preview.staleModuleInstanceIds.length : 0);
  }

  const groups: ModuleInputGroupView[] = pkg.uiSchema.groups.map((group) => ({
    id: group.id,
    title: group.title,
    fields: group.fields.map((field) => {
      const port = portsByKey.get(field.portKey);
      if (port === undefined) {
        throw new Error(
          `Module "${pkg.manifest.id}@${pkg.manifest.version}" UI schema references unknown input port "${field.portKey}".`,
        );
      }
      const resolved = resolvedByPortKey.get(field.portKey);
      if (resolved === undefined) {
        throw new Error(`No resolved input for port "${field.portKey}".`);
      }
      const definition = getParameter(port.parameterId);
      if (definition === undefined) {
        throw new Error(`Unknown canonical parameter "${port.parameterId}".`);
      }

      const suggestions: LinkSuggestionSourceView[] =
        resolved.source === "linked" || suggestionIndex === null
          ? []
          : describeLinkSuggestions(
              suggestionIndex,
              parameterGraphNodeId({
                kind: "module_input",
                moduleInstanceId,
                assemblyId: null,
                parameterId: port.parameterId,
                loadCase: port.loadCase ?? null,
              }),
            );

      return {
        portKey: field.portKey,
        parameterId: port.parameterId,
        label: field.label ?? definition.displayName,
        help: field.help ?? null,
        required: port.required,
        loadCase: port.loadCase ?? null,
        field: describeField(definition.valueType, definition),
        resolved,
        suggestions,
        linkRemovalImpact:
          resolved.source === "linked" ? removalImpactByPortKey.get(field.portKey) ?? 0 : null,
      };
    }),
  }));

  return {
    moduleInstance: {
      id: moduleInstance.id,
      assemblyId: moduleInstance.assemblyId,
      configurationId: moduleInstance.configurationId,
      label: moduleInstance.label,
      modulePackageId: moduleInstance.modulePackageId,
      moduleVersion: moduleInstance.moduleVersion,
      category: pkg.manifest.category,
      lastRunStatus: moduleInstance.lastRunStatus,
    },
    groups,
  };
}
