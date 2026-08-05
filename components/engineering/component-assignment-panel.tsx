"use client";

import { useActionState, useState, type ReactNode } from "react";
import { AlertTriangle, ExternalLink, Info, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "./status-badge";
import { assignComponentAction } from "@/app/(workspace)/workspace/actions";
import { IDLE_ACTION_STATE } from "@/app/(workspace)/workspace/action-state";
import type {
  CandidatePartView,
  ComponentAssignmentPanelView,
  ComponentAssignmentView,
  RankedCandidateView,
  RejectedCandidateView,
} from "@/lib/application";

export interface ComponentAssignmentPanelProps {
  readonly view: ComponentAssignmentPanelView;
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
    <section className="flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-4">
      <h2 className="text-[14px] font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

/** An informational notice — paired with an icon, never colour alone (ui-context.md). */
function InfoNotice({ children }: { readonly children: ReactNode }) {
  return (
    <div
      className="flex items-start gap-2 rounded-md border px-3 py-2 text-[13px]"
      style={{
        borderColor: "var(--state-info)",
        color: "var(--state-info)",
        backgroundColor: "rgba(29, 78, 216, 0.06)",
      }}
    >
      <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/** Manufacturer, exact part number, revision/source, lifecycle, datasheet link (ui-context.md). */
function PartIdentity({ part }: { readonly part: CandidatePartView }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-[13px] font-medium text-text-primary">
        {part.manufacturerName}{" "}
        <span className="font-mono">{part.partNumber}</span>
      </span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text-muted">
        <span className="font-mono">rev {part.sourceRevision}</span>
        {part.lifecycleStatus !== null ? (
          <span>{part.lifecycleStatus}</span>
        ) : null}
        <span>data: {part.dataQualityStatus}</span>
        {part.sourceLink !== null ? (
          <a
            href={part.sourceLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
            style={{ color: "var(--accent-primary)" }}
          >
            Datasheet
            <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </a>
        ) : null}
      </span>
    </div>
  );
}

/** Required specification summary, shown first (ui-context.md "Catalog and Assignment UI"). */
function RequiredSpecPanel({
  view,
}: {
  readonly view: ComponentAssignmentPanelView;
}) {
  if (view.requiredSpec.length === 0) {
    return (
      <p className="text-[13px] text-text-muted">
        No required specification has been calculated for this module.
      </p>
    );
  }
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr className="border-b border-border-default text-left text-[11px] font-semibold tracking-wide text-text-muted uppercase">
          <th scope="col" className="py-1.5 pr-2">
            Specification
          </th>
          <th scope="col" className="py-1.5 pr-2">
            Constraint
          </th>
          <th scope="col" className="py-1.5 text-right">
            Required
          </th>
        </tr>
      </thead>
      <tbody>
        {view.requiredSpec.map((entry) => (
          <tr
            key={entry.key}
            className="border-b border-border-default last:border-0"
          >
            <td className="py-1.5 pr-2 text-text-primary">{entry.label}</td>
            <td className="py-1.5 pr-2 font-mono text-[12px] text-text-muted">
              {entry.operator}
            </td>
            <td className="py-1.5 text-right font-mono tabular-nums text-text-primary">
              {entry.displayValue}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Hard-filter-passing candidates, ranked, each with its transparent ranking reasons. */
function CandidateTable({
  candidates,
  moduleInstanceId,
  configurationId,
  calculationRunId,
}: {
  readonly candidates: readonly RankedCandidateView[];
  readonly moduleInstanceId: string;
  readonly configurationId: string;
  readonly calculationRunId: string | null;
}) {
  if (candidates.length === 0) {
    return (
      <p className="text-[13px] text-text-muted">
        No manufacturer part satisfies every required specification.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {candidates.map((candidate, index) => (
        <li
          key={candidate.part.id}
          className="flex flex-col gap-2 rounded-md border border-border-default p-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5 shrink-0 rounded-md border border-border-default px-1.5 py-0.5 font-mono text-[11px] text-text-muted">
                #{index + 1}
              </span>
              <PartIdentity part={candidate.part} />
            </div>
            <AssignPartForm
              moduleInstanceId={moduleInstanceId}
              configurationId={configurationId}
              calculationRunId={calculationRunId}
              manufacturerPartRevisionId={candidate.part.id}
            />
          </div>
          {candidate.rankingReasons.length > 0 ? (
            <ul className="flex list-inside list-disc flex-col gap-0.5 text-[12px] text-text-muted">
              {candidate.rankingReasons.map((reason, reasonIndex) => (
                <li key={reasonIndex}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Rejected candidates and exactly why each was excluded (ui-context.md "Rejection reasons"). */
function RejectedTable({
  candidates,
}: {
  readonly candidates: readonly RejectedCandidateView[];
}) {
  const [expanded, setExpanded] = useState(false);
  if (candidates.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
      >
        {expanded ? "Hide" : "Show"} {candidates.length} rejected part
        {candidates.length === 1 ? "" : "s"}
      </Button>
      {expanded ? (
        <ul className="flex flex-col gap-2">
          {candidates.map((candidate) => (
            <li
              key={candidate.part.id}
              className="flex flex-col gap-1 rounded-md border border-border-default p-3"
            >
              <PartIdentity part={candidate.part} />
              <ul className="flex list-inside list-disc flex-col gap-0.5 text-[12px]">
                {candidate.rejectionReasons.map((reason, index) => (
                  <li key={index} style={{ color: "var(--state-error)" }}>
                    {reason}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * The assign action. A `"module_instance"` target requires a supporting
 * calculation run (`assignComponent`, Unit 2.8), so the button is disabled
 * with an explanation until the module has been run.
 */
function AssignPartForm({
  moduleInstanceId,
  configurationId,
  calculationRunId,
  manufacturerPartRevisionId,
}: {
  readonly moduleInstanceId: string;
  readonly configurationId: string;
  readonly calculationRunId: string | null;
  readonly manufacturerPartRevisionId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    assignComponentAction,
    IDLE_ACTION_STATE,
  );
  const blocked = calculationRunId === null;

  return (
    <form
      action={formAction}
      className="flex shrink-0 flex-col items-end gap-1"
    >
      <input type="hidden" name="partSource" value="catalog" />
      <input type="hidden" name="moduleInstanceId" value={moduleInstanceId} />
      <input type="hidden" name="configurationId" value={configurationId} />
      <input
        type="hidden"
        name="calculationRunId"
        value={calculationRunId ?? ""}
      />
      <input
        type="hidden"
        name="manufacturerPartRevisionId"
        value={manufacturerPartRevisionId}
      />
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-[12px] text-text-muted">
          Qty
          <input
            type="number"
            name="quantity"
            min={1}
            step={1}
            defaultValue={1}
            aria-label="Quantity"
            className={`${CONTROL_CLASS} w-16 font-mono tabular-nums`}
          />
        </label>
        <Button type="submit" size="sm" disabled={isPending || blocked}>
          {isPending ? "Assigning…" : "Assign"}
        </Button>
      </div>
      {blocked ? (
        <p className="max-w-xs text-right text-[11px] text-text-muted">
          Run this module first — a calculated component needs a supporting run.
        </p>
      ) : null}
      {state.status === "error" ? (
        <p
          role="alert"
          className="max-w-xs text-right text-[12px]"
          style={{ color: "var(--state-error)" }}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/** Manual/custom part entry (ui-context.md: "Manual/custom part entry is supported"). */
function ManualPartForm({
  moduleInstanceId,
  configurationId,
  calculationRunId,
}: {
  readonly moduleInstanceId: string;
  readonly configurationId: string;
  readonly calculationRunId: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    assignComponentAction,
    IDLE_ACTION_STATE,
  );
  const blocked = calculationRunId === null;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="partSource" value="manual" />
      <input type="hidden" name="moduleInstanceId" value={moduleInstanceId} />
      <input type="hidden" name="configurationId" value={configurationId} />
      <input
        type="hidden"
        name="calculationRunId"
        value={calculationRunId ?? ""}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="manual-description">
          Description{" "}
          <span className="text-[11px] text-text-muted">(required)</span>
        </Label>
        <Input
          id="manual-description"
          name="description"
          required
          placeholder="e.g. Custom machined mounting bracket"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex min-w-40 flex-1 flex-col gap-1.5">
          <Label htmlFor="manual-manufacturer">Manufacturer</Label>
          <Input id="manual-manufacturer" name="manufacturerName" />
        </div>
        <div className="flex min-w-40 flex-1 flex-col gap-1.5">
          <Label htmlFor="manual-part-number">Part number</Label>
          <Input id="manual-part-number" name="partNumber" />
        </div>
        <div className="flex w-24 flex-col gap-1.5">
          <Label htmlFor="manual-quantity">Quantity</Label>
          <input
            id="manual-quantity"
            type="number"
            name="quantity"
            min={1}
            step={1}
            defaultValue={1}
            className={`${CONTROL_CLASS} font-mono tabular-nums`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="manual-notes">Notes</Label>
        <Input id="manual-notes" name="notes" />
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={isPending || blocked}
        >
          {isPending ? "Assigning…" : "Assign manual part"}
        </Button>
        {blocked ? (
          <p className="text-[12px] text-text-muted">
            Run this module first — a calculated component needs a supporting
            run.
          </p>
        ) : null}
      </div>
      {state.status === "error" ? (
        <p
          role="alert"
          className="text-[12px]"
          style={{ color: "var(--state-error)" }}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/**
 * Assigned parts and their supporting runs — this unit's exit criterion
 * ("An engineer can assign a manufacturer part and see its supporting run")
 * and the "Assigned manufacturer part and stale state" bullet Unit 3.5's
 * Result pane deferred here.
 */
function AssignmentList({
  assignments,
}: {
  readonly assignments: readonly ComponentAssignmentView[];
}) {
  if (assignments.length === 0) {
    return (
      <p className="text-[13px] text-text-muted">
        No part is assigned to this module yet.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {assignments.map((assignment) => (
        <li
          key={assignment.id}
          className="flex flex-col gap-1.5 rounded-md border border-border-default p-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            {assignment.part !== null ? (
              <PartIdentity part={assignment.part} />
            ) : (
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[13px] font-medium text-text-primary">
                  {assignment.manualDescription ?? "Manual part"}
                </span>
                <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-text-muted">
                  {assignment.manualManufacturerName !== null ? (
                    <span>{assignment.manualManufacturerName}</span>
                  ) : null}
                  {assignment.manualPartNumber !== null ? (
                    <span className="font-mono">
                      {assignment.manualPartNumber}
                    </span>
                  ) : null}
                  <span>manual / custom part</span>
                </span>
              </div>
            )}
            <span className="shrink-0 font-mono text-[12px] tabular-nums text-text-muted">
              qty {assignment.quantity}
            </span>
          </div>

          {assignment.stale ? (
            <p
              className="flex items-center gap-1.5 text-[12px]"
              style={{ color: "var(--state-stale)" }}
            >
              <AlertTriangle
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0"
              />
              {assignment.staleReason ??
                "This assignment is stale — its supporting calculation changed."}
            </p>
          ) : null}

          {assignment.supportingRun !== null ? (
            <p className="flex flex-wrap items-center gap-1.5 text-[12px] text-text-muted">
              <span>Supporting run:</span>
              <StatusBadge status={assignment.supportingRun.status} iconOnly />
              <span className="font-mono">{assignment.supportingRun.id}</span>
              <span>
                ({assignment.supportingRun.createdAt.toLocaleString()})
              </span>
            </p>
          ) : (
            <p className="text-[12px] text-text-muted">
              No supporting run recorded.
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * The catalog matching and assignment panel (Unit 3.6,
 * `implementation-map.md`: "Required-spec panel", "Filtered candidate
 * table", "Rejection reasons", "Ranking explanations", "Datasheet/source
 * link", "Assign and manual-part actions"). Renders entirely from
 * `loadComponentAssignmentView`'s already-described view — no catalog
 * filtering, ranking, or engineering calculation happens here.
 *
 * When `matchingAvailable` is `false` (today: every module, since none
 * declares a `catalogAdapter` — see the read model's header for the standing
 * Milestone 4 deferral), the candidate tables are replaced by an honest
 * notice stating why, and the manual/custom part path stays fully usable.
 */
export function ComponentAssignmentPanel({
  view,
}: ComponentAssignmentPanelProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 pb-6">
      <header className="flex items-center gap-2 border-b border-border-default pb-3">
        <Package
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-text-muted"
        />
        <h1 className="text-[16px] font-semibold text-text-primary">
          Component assignment
        </h1>
        {view.componentType !== null ? (
          <span className="ml-auto shrink-0 rounded-md border border-border-default px-1.5 py-0.5 font-mono text-[11px] text-text-muted">
            {view.componentType}
          </span>
        ) : null}
      </header>

      <PanelSection title="Required specification">
        <RequiredSpecPanel view={view} />
      </PanelSection>

      <PanelSection title="Candidate parts">
        {view.matchingAvailable ? (
          <>
            <CandidateTable
              candidates={view.accepted}
              moduleInstanceId={view.moduleInstance.id}
              configurationId={view.moduleInstance.configurationId}
              calculationRunId={view.latestRunId}
            />
            <RejectedTable candidates={view.rejected} />
          </>
        ) : (
          <InfoNotice>{view.matchingUnavailableReason}</InfoNotice>
        )}
      </PanelSection>

      <PanelSection title="Assign a manual or custom part">
        <ManualPartForm
          moduleInstanceId={view.moduleInstance.id}
          configurationId={view.moduleInstance.configurationId}
          calculationRunId={view.latestRunId}
        />
      </PanelSection>

      <PanelSection title="Assigned parts">
        <AssignmentList assignments={view.assignments} />
      </PanelSection>
    </div>
  );
}
