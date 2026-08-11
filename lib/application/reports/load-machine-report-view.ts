// The `loadMachineReportView` use case (Unit 5.3: "Machine calculation
// package"). Assembles the one whole-machine printable package a formal
// design review needs — cover/project details, the selected market profile
// and every source actually cited across the package, the requirements
// verification matrix, every assembly's own module summaries and detailed
// calculations, the BOM, open warnings/assumptions, and the latest
// baseline's ID and module-package hashes — entirely by composing existing
// read models rather than re-deriving any of them:
//
//   - `loadRequirementsView` (Unit 3.7) for requirements/assumptions/load
//     cases.
//   - `buildAssemblyReportNode` (Unit 5.2, `./load-assembly-report-view`)
//     per root assembly for the module summaries and detailed calculations
//     — the exact same per-node tree walk Unit 5.2's own assembly report
//     uses, just run once per root instead of one named assembly.
//   - `loadBomView` (Unit 5.1) for the BOM.
//   - `lib/standards`' released market-profile registry, resolved from the
//     project's own `marketProfileKey`.
//   - `listMachineBaselinesForConfiguration`/`loadMachineBaseline` (Unit
//     2.9 part 2) for the latest baseline's own frozen module-package
//     hashes.
//
// WHY THE VERIFICATION MATRIX SHOWS AUTHORING COMPLETENESS, NOT RUN-BASED
// VERIFICATION
//
// `architecture.md`'s domain model names a `VerificationLink` class linking
// a requirement to the calculation run that demonstrates it, but no unit has
// ever built it — `load-requirements-view.ts`'s own header already records
// why: deciding *which* run or check satisfies *which* requirement is real
// engineering judgment no released contract records, the same shape of gap
// Unit 3.6 hit with `CatalogAdapter.requiredSpec()`'s missing comparison
// operator. Building that link now would also combine a Prisma schema
// change with this report-rendering unit, exactly what ai-workflow-rules.md's
// Split Rule forbids. So this unit's own matrix reuses `loadRequirementsView`
// unchanged — the same "acceptance criteria defined, or not yet" honesty the
// live Requirements panel already shows, not a new claim of verification.

import "server-only";
import type { CheckStatus, Warning } from "@/lib/engine";
import {
  loadConfigurationForOwner,
  loadConfigurationTree,
  listMachineBaselinesForConfiguration,
  loadMachineBaseline,
  type MachineConfigurationId,
  type UserId,
} from "@/lib/db";
import {
  marketProfileKey,
  SOURCE_REGISTRY,
  type SourceApplicability,
} from "@/lib/standards";
import type { BaselineAssemblyNode } from "@/lib/configuration";
import {
  loadRequirementsView,
  type RequirementsView,
} from "../requirements/load-requirements-view";
import { loadBomView, type BomView } from "./load-bom-view";
import {
  buildAssemblyReportNode,
  type AssemblyReportNode,
} from "./load-assembly-report-view";
import type { AssumptionView } from "./load-module-report-view";
import type { SourceReferenceView } from "../calculations/run-view-helpers";

/** One market-profile reference entry, resolved to its document title — `lib/reports` never performs a registry lookup itself. */
export interface MachineReportMarketProfileEntryView {
  readonly documentTitle: string;
  readonly edition: string;
  readonly applicability: SourceApplicability;
  readonly use: string;
}

/** The project's selected market profile, resolved for display. */
export interface MachineReportMarketProfileView {
  readonly id: string;
  readonly displayName: string;
  readonly scope: string;
  readonly disclaimer: string;
  readonly entries: readonly MachineReportMarketProfileEntryView[];
}

/** One open (non-passing-context) warning, attributed to the module instance that raised it. */
export interface OpenWarningView {
  readonly moduleInstanceId: string;
  readonly moduleInstanceLabel: string;
  readonly warning: Warning;
}

/** One recorded assumption, attributed to the module instance that relied on it. */
export interface OpenAssumptionView {
  readonly moduleInstanceId: string;
  readonly moduleInstanceLabel: string;
  readonly assumption: AssumptionView;
}

/** One module instance's frozen package identity, as captured in the latest baseline. */
export interface MachineReportBaselineModuleRef {
  readonly moduleInstanceId: string;
  readonly moduleInstanceLabel: string;
  readonly modulePackageId: string;
  readonly moduleVersion: string;
  readonly modulePackageHash: string;
  readonly status: CheckStatus;
  readonly stale: boolean;
}

/** The configuration's latest baseline, described for the report's own reproducibility footer. */
export interface MachineReportBaselineView {
  readonly id: string;
  readonly label: string;
  readonly createdAt: Date;
  readonly moduleRefs: readonly MachineReportBaselineModuleRef[];
}

/** What the printable whole-machine report renderer needs for one configuration. */
export interface MachineReportView {
  readonly project: { readonly id: string; readonly name: string };
  readonly configuration: { readonly id: string; readonly name: string };
  readonly generatedAt: Date;
  /** `null` when the project's own `marketProfileKey` no longer resolves against the released registry. */
  readonly marketProfile: MachineReportMarketProfileView | null;
  readonly requirements: RequirementsView;
  /** Root assemblies, each with its own module summaries/detailed calculations and nested children. */
  readonly assemblies: readonly AssemblyReportNode[];
  readonly bom: BomView;
  readonly openWarnings: readonly OpenWarningView[];
  readonly openAssumptions: readonly OpenAssumptionView[];
  /** Every source cited anywhere across the package's own calculations, deduplicated. */
  readonly sources: readonly SourceReferenceView[];
  /** `null` when the configuration has no baseline yet. */
  readonly latestBaseline: MachineReportBaselineView | null;
}

function sourceReferenceKey(source: SourceReferenceView): string {
  return `${source.documentTitle}|${source.edition}|${source.clause ?? ""}|${source.page ?? ""}`;
}

/** Walks an assembly report tree once, collecting every module's own open warnings/assumptions/sources. */
function collectFromAssemblies(nodes: readonly AssemblyReportNode[]): {
  readonly openWarnings: OpenWarningView[];
  readonly openAssumptions: OpenAssumptionView[];
  readonly sources: SourceReferenceView[];
} {
  const openWarnings: OpenWarningView[] = [];
  const openAssumptions: OpenAssumptionView[] = [];
  const sourcesByKey = new Map<string, SourceReferenceView>();

  function visit(node: AssemblyReportNode): void {
    for (const moduleReport of node.modules) {
      const moduleInstanceId = moduleReport.moduleInstance.id;
      const moduleInstanceLabel = moduleReport.moduleInstance.label;
      for (const warning of moduleReport.warnings) {
        openWarnings.push({ moduleInstanceId, moduleInstanceLabel, warning });
      }
      for (const assumption of moduleReport.assumptions) {
        openAssumptions.push({
          moduleInstanceId,
          moduleInstanceLabel,
          assumption,
        });
      }
      for (const source of moduleReport.sources) {
        sourcesByKey.set(sourceReferenceKey(source), source);
      }
    }
    for (const child of node.children) {
      visit(child);
    }
  }
  nodes.forEach(visit);

  return { openWarnings, openAssumptions, sources: [...sourcesByKey.values()] };
}

/** Maps every frozen module instance's own label, walking a baseline snapshot's assembly tree once. */
function collectBaselineModuleLabels(
  nodes: readonly BaselineAssemblyNode[],
): Map<string, string> {
  const labels = new Map<string, string>();
  function visit(node: BaselineAssemblyNode): void {
    for (const moduleInstance of node.moduleInstances) {
      labels.set(moduleInstance.id, moduleInstance.label);
    }
    for (const child of node.children) {
      visit(child);
    }
  }
  nodes.forEach(visit);
  return labels;
}

/** Resolves a `MarketProfile`'s reference entries to document titles/editions, so `lib/reports` needs no registry lookup of its own. */
function resolveMarketProfile(
  profileKey: string,
): MachineReportMarketProfileView | null {
  const profile = SOURCE_REGISTRY.listProfiles().find(
    (p) => marketProfileKey(p) === profileKey,
  );
  if (profile === undefined) {
    return null;
  }
  const documentsById = new Map(
    SOURCE_REGISTRY.listDocuments().map((doc) => [doc.id, doc]),
  );
  const revisionsById = new Map(
    SOURCE_REGISTRY.listRevisions().map((rev) => [rev.id, rev]),
  );
  const entries: MachineReportMarketProfileEntryView[] = profile.entries.map(
    (entry) => {
      const revision = revisionsById.get(entry.sourceRevisionId);
      const document =
        revision !== undefined ? documentsById.get(revision.documentId) : undefined;
      return {
        documentTitle: document?.title ?? entry.sourceRevisionId,
        edition: revision?.edition ?? "",
        applicability: entry.applicability,
        use: entry.use,
      };
    },
  );
  return {
    id: profile.id,
    displayName: profile.displayName,
    scope: profile.scope,
    disclaimer: profile.disclaimer,
    entries,
  };
}

/**
 * Loads the printable whole-machine report read model for `configurationId`,
 * scoped to `ownerId`. Returns `null` when the configuration does not exist
 * or is not owned by `ownerId` — the same "nothing real to render" outcome
 * every other configuration-scoped view in this codebase returns.
 */
export async function loadMachineReportView(
  configurationId: MachineConfigurationId,
  ownerId: UserId,
): Promise<MachineReportView | null> {
  const context = await loadConfigurationForOwner(configurationId, ownerId);
  if (context === null) {
    return null;
  }
  const { configuration, project } = context;

  const tree = await loadConfigurationTree(configurationId, ownerId);
  if (tree === null) {
    // Ownership already passed above; this would only happen on a race with
    // a concurrent delete between the two loads.
    return null;
  }

  const [requirements, bom, baselineSummaries] = await Promise.all([
    loadRequirementsView(configurationId, ownerId),
    loadBomView(configurationId, ownerId),
    listMachineBaselinesForConfiguration(configurationId, ownerId),
  ]);

  const assemblies: AssemblyReportNode[] = [];
  for (const node of tree.assemblies) {
    assemblies.push(await buildAssemblyReportNode(node, ownerId));
  }

  const { openWarnings, openAssumptions, sources } =
    collectFromAssemblies(assemblies);

  const marketProfile = resolveMarketProfile(project.marketProfileKey);

  let latestBaseline: MachineReportBaselineView | null = null;
  const latestSummary = baselineSummaries[0];
  if (latestSummary !== undefined) {
    const record = await loadMachineBaseline(latestSummary.id, ownerId);
    if (record !== null) {
      const labels = collectBaselineModuleLabels(record.snapshot.assemblies);
      latestBaseline = {
        id: record.id,
        label: record.label,
        createdAt: record.createdAt,
        moduleRefs: record.snapshot.calculationRuns.map((run) => ({
          moduleInstanceId: run.moduleInstanceId,
          moduleInstanceLabel:
            labels.get(run.moduleInstanceId) ?? run.moduleInstanceId,
          modulePackageId: run.modulePackageId,
          moduleVersion: run.moduleVersion,
          modulePackageHash: run.modulePackageHash,
          status: run.status,
          stale: run.stale,
        })),
      };
    }
  }

  return {
    project: { id: project.id, name: project.name },
    configuration: { id: configuration.id, name: configuration.name },
    generatedAt: new Date(),
    marketProfile,
    requirements: requirements ?? {
      configurationId,
      requirements: [],
      designAssumptions: [],
      loadCases: [],
    },
    assemblies,
    bom: bom ?? {
      configurationId,
      configurationName: configuration.name,
      machineLevelItems: [],
      assemblies: [],
      totalLineCount: 0,
      staleLineCount: 0,
    },
    openWarnings,
    openAssumptions,
    sources,
    latestBaseline,
  };
}
