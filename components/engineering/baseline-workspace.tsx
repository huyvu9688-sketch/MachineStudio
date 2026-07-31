"use client";

import { useActionState, useId, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  GitCompareArrows,
  History,
} from "lucide-react";
import { createBaselineAction } from "@/app/(workspace)/workspace/actions";
import { IDLE_ACTION_STATE } from "@/app/(workspace)/workspace/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  BaselineCheckChangeView,
  BaselineComparisonView,
  BaselineWorkspaceView,
} from "@/lib/application";
import type {
  BaselineComparison,
  BaselineComponentAssignment,
  BaselineParameterLink,
  BaselineParameterValue,
  BaselineRequirement,
} from "@/lib/configuration";
import type { EngineeringValue } from "@/lib/engine";
import { formatEngineeringValue } from "./format-engineering-value";
import { StatusBadge } from "./status-badge";

export interface BaselineWorkspaceProps {
  readonly view: BaselineWorkspaceView;
}

const CONTROL_CLASS =
  "h-9 rounded-md border border-border-default bg-bg-surface px-2.5 text-[13px] text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary";

function PanelSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border-default bg-bg-surface p-4">
      <h2 className="text-[14px] font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

function ErrorText({ message }: { readonly message?: string }) {
  if (message === undefined) return null;
  return (
    <p
      role="alert"
      className="text-[12px]"
      style={{ color: "var(--state-error)" }}
    >
      {message}
    </p>
  );
}

function formatValue(value: EngineeringValue | null | undefined): string {
  return value === null || value === undefined
    ? "Not recorded"
    : formatEngineeringValue(value);
}

function formatTimestamp(value: Date): string {
  return value
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d{3}Z$/, " UTC");
}

function ReadinessNotice({ view }: { readonly view: BaselineWorkspaceView }) {
  if (view.blockers.length === 0) {
    return (
      <div
        className="flex items-start gap-2 rounded-md border px-3 py-2 text-[13px]"
        style={{
          borderColor: "var(--state-success)",
          color: "var(--state-success)",
        }}
      >
        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          No stale, failed, or invalid calculation items currently block a
          baseline.
        </span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border px-3 py-2 text-[13px]"
      style={{
        borderColor: "var(--state-stale)",
        color: "var(--text-primary)",
        backgroundColor: "rgba(180, 83, 9, 0.06)",
      }}
    >
      <AlertTriangle
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0"
        style={{ color: "var(--state-stale)" }}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p>
          Review these current readiness items. Creating a baseline requires an
          explicit acknowledgement.
        </p>
        <ul className="list-inside list-disc text-[12px] text-text-muted">
          {view.blockers.map((blocker) => (
            <li key={`${blocker.kind}-${blocker.message}`}>
              {blocker.message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CreateBaselineForm({
  view,
}: {
  readonly view: BaselineWorkspaceView;
}) {
  const [state, formAction, isPending] = useActionState(
    createBaselineAction,
    IDLE_ACTION_STATE,
  );
  const labelId = useId();
  const acknowledgementId = useId();
  const requiresAcknowledgement = view.blockers.length > 0;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-md border border-border-default p-3"
    >
      <input
        type="hidden"
        name="configurationId"
        value={view.configurationId}
      />
      <div className="flex min-w-52 flex-1 flex-col gap-1.5">
        <Label htmlFor={labelId}>Baseline label</Label>
        <Input
          id={labelId}
          name="label"
          required
          maxLength={200}
          placeholder="e.g. Design review 01"
        />
      </div>
      {requiresAcknowledgement ? (
        <label
          htmlFor={acknowledgementId}
          className="flex items-start gap-2 text-[13px] text-text-primary"
        >
          <input
            id={acknowledgementId}
            name="acknowledgeWarnings"
            type="checkbox"
            value="true"
            required
            className="mt-0.5 h-4 w-4 accent-[var(--accent-primary)]"
          />
          <span>
            I acknowledge the current readiness items and want to create this
            immutable baseline.
          </span>
        </label>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Creating…" : "Create baseline"}
        </Button>
        <ErrorText
          message={state.status === "error" ? state.message : undefined}
        />
      </div>
    </form>
  );
}

function BaselineHistory({ view }: { readonly view: BaselineWorkspaceView }) {
  if (view.baselines.length === 0) {
    return (
      <p className="text-[13px] text-text-muted">
        No baselines have been recorded yet.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {view.baselines.map((baseline) => (
        <li
          key={baseline.id}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md border border-border-default px-3 py-2"
        >
          <span className="text-[13px] font-medium text-text-primary">
            {baseline.label}
          </span>
          <span className="font-mono text-[11px] text-text-muted">
            {formatTimestamp(baseline.createdAt)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function CompareSelector({ view }: { readonly view: BaselineWorkspaceView }) {
  const beforeId = useId();
  const afterId = useId();

  if (view.baselines.length < 2) {
    return (
      <p className="text-[13px] text-text-muted">
        Save at least two baselines to compare design states.
      </p>
    );
  }

  return (
    <form
      method="get"
      action="/workspace"
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="project" value={view.projectId} />
      <input type="hidden" name="configuration" value={view.configurationId} />
      <input type="hidden" name="panel" value="baselines" />
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <Label htmlFor={beforeId}>Before baseline</Label>
        <select
          id={beforeId}
          name="before"
          required
          defaultValue={view.selectedBeforeBaselineId ?? ""}
          className={CONTROL_CLASS}
        >
          <option value="" disabled>
            Select baseline
          </option>
          {view.baselines.map((baseline) => (
            <option key={baseline.id} value={baseline.id}>
              {baseline.label} — {formatTimestamp(baseline.createdAt)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <Label htmlFor={afterId}>After baseline</Label>
        <select
          id={afterId}
          name="after"
          required
          defaultValue={view.selectedAfterBaselineId ?? ""}
          className={CONTROL_CLASS}
        >
          <option value="" disabled>
            Select baseline
          </option>
          {view.baselines.map((baseline) => (
            <option key={baseline.id} value={baseline.id}>
              {baseline.label} — {formatTimestamp(baseline.createdAt)}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm">
        Compare baselines
      </Button>
    </form>
  );
}

interface ChangeRow {
  readonly key: string;
  readonly label: string;
  readonly before: string;
  readonly after: string;
}

function ChangeRows({
  rows,
  emptyMessage,
}: {
  readonly rows: readonly ChangeRow[];
  readonly emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p className="text-[12px] text-text-muted">{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={row.key}
          className="flex flex-col gap-1 rounded-md border border-border-default px-3 py-2 text-[12px]"
        >
          <span className="font-medium text-text-primary">{row.label}</span>
          <span className="text-text-muted">
            Before: <span className="text-text-primary">{row.before}</span>
          </span>
          <span className="text-text-muted">
            After: <span className="text-text-primary">{row.after}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function countDiff(diff: {
  readonly added: readonly unknown[];
  readonly removed: readonly unknown[];
  readonly changed: readonly unknown[];
}): number {
  return diff.added.length + diff.removed.length + diff.changed.length;
}

function requirementSummary(requirement: BaselineRequirement): string {
  const criteria = requirement.acceptanceCriteria
    .map((criterion) => criterion.statement)
    .join("; ");
  return `${requirement.code}: ${requirement.statement}${criteria.length > 0 ? ` (Criteria: ${criteria})` : ""}`;
}

function requirementRows(comparison: BaselineComparison): ChangeRow[] {
  const diff = comparison.requirements;
  return [
    ...diff.added.map((requirement) => ({
      key: `added-${requirement.id}`,
      label: requirement.code,
      before: "Not recorded",
      after: requirementSummary(requirement),
    })),
    ...diff.removed.map((requirement) => ({
      key: `removed-${requirement.id}`,
      label: requirement.code,
      before: requirementSummary(requirement),
      after: "Not recorded",
    })),
    ...diff.changed.map((change) => ({
      key: `changed-${change.id}`,
      label: change.after.code,
      before: requirementSummary(change.before),
      after: requirementSummary(change.after),
    })),
  ];
}

function parameterValueSummary(value: BaselineParameterValue): string {
  const loadCase = value.loadCase === null ? "" : ` [${value.loadCase}]`;
  return `${formatEngineeringValue(value.value)} (${value.source}${loadCase})`;
}

function parameterLinkSummary(link: BaselineParameterLink): string {
  const sourceScope =
    link.sourceModuleInstanceId ?? link.sourceAssemblyId ?? "machine";
  const sourceCase =
    link.sourceLoadCase === null ? "" : ` [${link.sourceLoadCase}]`;
  const targetCase =
    link.targetLoadCase === null ? "" : ` [${link.targetLoadCase}]`;
  return `${sourceScope}.${link.sourceParameterId}${sourceCase} → ${link.targetModuleInstanceId}.${link.targetParameterId}${targetCase}`;
}

function inputRows(comparison: BaselineComparison): ChangeRow[] {
  const valueDiff = comparison.parameterValues;
  const linkDiff = comparison.parameterLinks;
  return [
    ...valueDiff.added.map((value) => ({
      key: `value-added-${value.id}`,
      label: value.parameterId,
      before: "Not recorded",
      after: parameterValueSummary(value),
    })),
    ...valueDiff.removed.map((value) => ({
      key: `value-removed-${value.id}`,
      label: value.parameterId,
      before: parameterValueSummary(value),
      after: "Not recorded",
    })),
    ...valueDiff.changed.map((change) => ({
      key: `value-changed-${change.id}`,
      label: change.after.parameterId,
      before: parameterValueSummary(change.before),
      after: parameterValueSummary(change.after),
    })),
    ...linkDiff.added.map((link) => ({
      key: `link-added-${link.id}`,
      label: "Confirmed parameter link",
      before: "Not recorded",
      after: parameterLinkSummary(link),
    })),
    ...linkDiff.removed.map((link) => ({
      key: `link-removed-${link.id}`,
      label: "Confirmed parameter link",
      before: parameterLinkSummary(link),
      after: "Not recorded",
    })),
    ...linkDiff.changed.map((change) => ({
      key: `link-changed-${change.id}`,
      label: "Confirmed parameter link",
      before: parameterLinkSummary(change.before),
      after: parameterLinkSummary(change.after),
    })),
  ];
}

function assignmentPartSummary(
  assignment: BaselineComponentAssignment,
): string {
  const target =
    assignment.moduleInstanceId ?? assignment.assemblyId ?? "unknown target";
  const manualDetails = assignment.manualPartDetails;
  const source =
    assignment.partSource === "catalog"
      ? (assignment.manufacturerPartRevisionId ?? "catalog part")
      : [
          manualDetails?.description ?? "manual part",
          manualDetails?.manufacturerName === undefined
            ? null
            : `Manufacturer: ${manualDetails.manufacturerName}`,
          manualDetails?.partNumber === undefined
            ? null
            : `Part number: ${manualDetails.partNumber}`,
          manualDetails?.notes === undefined
            ? null
            : `Notes: ${manualDetails.notes}`,
        ]
          .filter((detail): detail is string => detail !== null)
          .join("; ");
  return `${source} × ${assignment.quantity} on ${target}${assignment.stale ? " (stale)" : ""}`;
}

function partRows(comparison: BaselineComparison): ChangeRow[] {
  const diff = comparison.componentAssignments;
  return [
    ...diff.added.map((assignment) => ({
      key: `added-${assignment.id}`,
      label: "Part assignment",
      before: "Not recorded",
      after: assignmentPartSummary(assignment),
    })),
    ...diff.removed.map((assignment) => ({
      key: `removed-${assignment.id}`,
      label: "Part assignment",
      before: assignmentPartSummary(assignment),
      after: "Not recorded",
    })),
    ...diff.changed.map((change) => ({
      key: `changed-${change.id}`,
      label: "Part assignment",
      before: assignmentPartSummary(change.before),
      after: assignmentPartSummary(change.after),
    })),
  ];
}

function CheckChangeRows({
  changes,
}: {
  readonly changes: readonly BaselineCheckChangeView[];
}) {
  if (changes.length === 0) {
    return (
      <p className="text-[12px] text-text-muted">No recorded check changes.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {changes.map((change) => (
        <li
          key={`${change.moduleInstanceId}-${change.id}`}
          className="flex flex-col gap-1 rounded-md border border-border-default px-3 py-2 text-[12px]"
        >
          <span className="font-medium text-text-primary">
            {change.moduleLabel} · {change.message}
          </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-text-muted">
            <span>Before:</span>
            {change.before === null ? (
              <span className="text-text-primary">Not recorded</span>
            ) : (
              <>
                <StatusBadge
                  status={change.before.status}
                  className="text-[12px]"
                />
                <span className="text-text-primary">
                  {checkPayloadSummary(change.before)}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-text-muted">
            <span>After:</span>
            {change.after === null ? (
              <span className="text-text-primary">Not recorded</span>
            ) : (
              <>
                <StatusBadge
                  status={change.after.status}
                  className="text-[12px]"
                />
                <span className="text-text-primary">
                  {checkPayloadSummary(change.after)}
                </span>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function checkPayloadSummary(
  check: NonNullable<BaselineCheckChangeView["before"]>,
): string {
  const details = [
    check.observed === undefined
      ? null
      : `Observed ${formatValue(check.observed)}`,
    check.allowable === undefined
      ? null
      : `Allowable ${formatValue(check.allowable)}`,
    check.margin === undefined ? null : `Margin ${formatValue(check.margin)}`,
    check.sources === undefined || check.sources.length === 0
      ? null
      : `Sources ${check.sources
          .map((source) => {
            const location =
              source.clause ??
              (source.page === undefined ? "" : `p. ${source.page}`);
            return location.length > 0
              ? `${source.sourceRevisionId} ${location}`
              : source.sourceRevisionId;
          })
          .join(", ")}`,
  ].filter((detail): detail is string => detail !== null);
  const criterion = check.criterion ?? "Check criterion not recorded";
  return details.length === 0
    ? criterion
    : `${criterion}; ${details.join("; ")}`;
}

function OtherStructuralChanges({
  comparison,
}: {
  readonly comparison: BaselineComparison;
}) {
  const categories: readonly (readonly [string, number])[] = [
    ["Design assumptions", countDiff(comparison.designAssumptions)],
    ["Load cases", countDiff(comparison.loadCases)],
    ["Assemblies", countDiff(comparison.assemblies)],
    ["Module instances", countDiff(comparison.moduleInstances)],
    ["Calculation-run references", countDiff(comparison.calculationRuns)],
  ];
  const changedCategories = categories.filter(([, count]) => count > 0);

  if (changedCategories.length === 0) return null;

  return (
    <PanelSection title="Other recorded design changes">
      <ul className="flex flex-col gap-1 text-[13px] text-text-primary">
        {changedCategories.map(([label, count]) => (
          <li key={label}>
            {label}: {count}
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}

function ComparisonResult({
  comparison,
}: {
  readonly comparison: BaselineComparisonView;
}) {
  const { comparison: structural } = comparison;
  const requiredDifferenceCount =
    countDiff(structural.requirements) +
    countDiff(structural.parameterValues) +
    countDiff(structural.parameterLinks) +
    countDiff(structural.componentAssignments) +
    comparison.changedOutputs.length +
    comparison.changedChecks.length;
  const otherDifferenceCount =
    countDiff(structural.designAssumptions) +
    countDiff(structural.loadCases) +
    countDiff(structural.assemblies) +
    countDiff(structural.moduleInstances) +
    countDiff(structural.calculationRuns);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border-default pb-3">
        <div>
          <h2 className="text-[15px] font-semibold text-text-primary">
            Baseline comparison
          </h2>
          <p className="text-[12px] text-text-muted">
            {comparison.before.label} → {comparison.after.label}
          </p>
        </div>
        <span className="text-[11px] text-text-muted">
          {formatTimestamp(comparison.before.createdAt)} →{" "}
          {formatTimestamp(comparison.after.createdAt)}
        </span>
      </header>

      {requiredDifferenceCount + otherDifferenceCount === 0 ? (
        <p className="rounded-md border border-border-default px-3 py-2 text-[13px] text-text-muted">
          No recorded differences between these baselines.
        </p>
      ) : null}

      <PanelSection title="Requirements">
        <ChangeRows
          rows={requirementRows(structural)}
          emptyMessage="No recorded requirement changes."
        />
      </PanelSection>

      <PanelSection title="Inputs">
        <ChangeRows
          rows={inputRows(structural)}
          emptyMessage="No recorded input or parameter-link changes."
        />
      </PanelSection>

      <PanelSection title="Outputs">
        <ChangeRows
          rows={comparison.changedOutputs.map((change) => ({
            key: `${change.moduleInstanceId}-${change.portKey}`,
            label: `${change.moduleLabel} · ${change.portKey}`,
            before: formatValue(change.before),
            after: formatValue(change.after),
          }))}
          emptyMessage="No recorded output changes."
        />
      </PanelSection>

      <PanelSection title="Checks">
        <CheckChangeRows changes={comparison.changedChecks} />
      </PanelSection>

      <PanelSection title="Parts">
        <ChangeRows
          rows={partRows(structural)}
          emptyMessage="No recorded part-assignment changes."
        />
      </PanelSection>

      {comparison.unavailableRunDetails.length > 0 ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border px-3 py-2 text-[13px]"
          style={{
            borderColor: "var(--state-stale)",
            backgroundColor: "rgba(180, 83, 9, 0.06)",
          }}
        >
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-text-muted"
          />
          <div>
            {comparison.unavailableRunDetails.map((detail) => (
              <p key={detail.moduleInstanceId}>
                {detail.moduleLabel}: {detail.message}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <OtherStructuralChanges comparison={structural} />
    </div>
  );
}

/**
 * Configuration-level immutable baseline workspace (Unit 3.8). It uses the
 * current configuration only for advisory readiness before creation; the
 * selected comparison is rendered from baseline snapshots and the immutable
 * calculation runs those snapshots pin. The component never triggers a
 * calculation or substitutes current module-package metadata for history.
 */
export function BaselineWorkspace({ view }: BaselineWorkspaceProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 pb-6">
      <header className="flex items-center gap-2 border-b border-border-default pb-3">
        <GitCompareArrows
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-text-muted"
        />
        <h1 className="text-[16px] font-semibold text-text-primary">
          Baselines & comparison
        </h1>
      </header>

      <PanelSection title="Create immutable baseline">
        <ReadinessNotice view={view} />
        <p className="text-[12px] text-text-muted">
          Readiness is checked again when the baseline is written, so this
          review cannot bypass a concurrent change.
        </p>
        <CreateBaselineForm view={view} />
      </PanelSection>

      <PanelSection title="Baseline history">
        <div className="flex items-center gap-2 text-text-muted">
          <History aria-hidden="true" className="h-4 w-4" />
          <span className="text-[12px]">Newest baseline first</span>
        </div>
        <BaselineHistory view={view} />
      </PanelSection>

      <PanelSection title="Compare baselines">
        <CompareSelector view={view} />
        <ErrorText message={view.comparisonError ?? undefined} />
      </PanelSection>

      {view.comparison !== null ? (
        <ComparisonResult comparison={view.comparison} />
      ) : null}
    </div>
  );
}
