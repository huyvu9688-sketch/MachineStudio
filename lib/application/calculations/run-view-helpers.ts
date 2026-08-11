// Shared read-model helpers for describing a stored `CalculationRunSnapshot`'s
// `ModuleComputation` for display — port values and cited sources. Used by
// both the live result panel's read model (`loadModuleResultView`, Unit 3.5)
// and the printable report's read model (`loadModuleReportView`, Unit 5.2):
// both describe the exact same stored computation shape, so this is shared
// rather than duplicated (code-standards.md "prefer explicit duplication over
// premature abstraction" applies to call sites that are actually different —
// these two read the identical `ModuleComputation`/port shape).

import "server-only";
import {
  getParameter,
  walkTrace,
  type EngineeringValue,
  type LoadCaseCategory,
  type ModuleComputation,
} from "@/lib/engine";
import { SOURCE_REGISTRY, type ClauseReference } from "@/lib/standards";

/** One resolved port value, described for display — no engine imports needed downstream. */
export interface PortValueView {
  readonly portKey: string;
  readonly parameterId: string;
  readonly label: string;
  readonly value: EngineeringValue;
  /** The port's declared load case, when it is load-case specific. */
  readonly loadCase: LoadCaseCategory | null;
}

/** A resolved source citation, ready to render without a registry lookup. */
export interface SourceReferenceView {
  readonly documentTitle: string;
  readonly edition: string;
  readonly clause: string | null;
  readonly page: number | null;
  readonly label: string | null;
}

/** A port's fields these helpers need — matches `ModuleInputPort`/`ModuleOutputPort` without importing module-sdk directly. */
export interface PortShape {
  readonly key: string;
  readonly parameterId: string;
  readonly loadCase?: LoadCaseCategory;
}

/** Describes a set of resolved port values (input or output) against their declared ports, in port order. */
export function describePortValues(
  values: Readonly<Record<string, EngineeringValue>>,
  ports: readonly PortShape[],
): PortValueView[] {
  const views: PortValueView[] = [];
  for (const port of ports) {
    const value = values[port.key];
    if (value === undefined) continue;
    views.push({
      portKey: port.key,
      parameterId: port.parameterId,
      label: getParameter(port.parameterId)?.displayName ?? port.key,
      value,
      loadCase: port.loadCase ?? null,
    });
  }
  return views;
}

/** A stable key for deduplicating {@link ClauseReference}s across a run's checks/warnings/validity/trace/assumptions. */
function clauseReferenceKey(ref: ClauseReference): string {
  return `${ref.sourceRevisionId}|${ref.clause ?? ""}|${ref.page ?? ""}`;
}

/** Collects every unique `ClauseReference` cited anywhere in a computation. */
export function collectClauseReferences(
  computation: ModuleComputation,
): ClauseReference[] {
  const byKey = new Map<string, ClauseReference>();
  const add = (refs: readonly ClauseReference[] | undefined): void => {
    for (const ref of refs ?? []) {
      byKey.set(clauseReferenceKey(ref), ref);
    }
  };
  for (const check of computation.checks) add(check.sources);
  for (const warning of computation.warnings) add(warning.sources);
  for (const validity of computation.validity) add(validity.sources);
  for (const assumption of computation.assumptions) add(assumption.sources);
  walkTrace(computation.trace, { step: (step) => add(step.sources) });
  return [...byKey.values()];
}

/** Resolves a set of cited sources; a reference this build no longer registers is skipped, not thrown. */
export function resolveSourceReferences(
  refs: readonly ClauseReference[],
): SourceReferenceView[] {
  const views: SourceReferenceView[] = [];
  for (const ref of refs) {
    try {
      const resolved = SOURCE_REGISTRY.resolveReference(ref);
      views.push({
        documentTitle: resolved.document.title,
        edition: resolved.revision.edition,
        clause: resolved.clause ?? null,
        page: resolved.page ?? null,
        label: resolved.label ?? null,
      });
    } catch {
      // A stored run's citation no longer resolves in this build's source
      // registry (e.g. a revision was renamed). The run itself is immutable
      // and still authoritative; the caller degrades by omitting the
      // unresolvable citation rather than failing the whole view.
    }
  }
  return views;
}
