"use client";

import { useActionState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Archive,
  Boxes,
  CheckCircle2,
  CircleDashed,
  CirclePlay,
  GitBranch,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
// Deep imports, not the `@/lib/engine`/`@/lib/application` barrels — those
// barrels also re-export server-only modules (see module-result-panel.tsx's
// own header for the precedent), which would break this client component's
// bundle. Both `lib/engine/parameters` and `lib/workflows/workflow-sdk` are
// their own self-contained, server-only-free public surfaces.
import { getParameter } from "@/lib/engine/parameters";
import { linkProposalKey } from "@/lib/workflows/workflow-sdk";
import { confirmSuggestedLinkAction } from "@/app/(workspace)/workspace/actions";
import { IDLE_ACTION_STATE } from "@/app/(workspace)/workspace/action-state";
import type { WorkflowInstanceView } from "@/lib/application";
import type {
  CompletionRuleResult,
  WorkflowInstanceContext,
  WorkflowLinkProposal,
  WorkflowModuleRole,
} from "@/lib/workflows/workflow-sdk";
import type { WorkflowInstanceStatus } from "@/lib/db";

export interface WorkflowInstanceWorkspaceProps {
  readonly view: WorkflowInstanceView;
  readonly projectId: string;
}

interface WorkflowStatusMeta {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly colorVar: string;
}

const WORKFLOW_STATUS_META: Record<WorkflowInstanceStatus, WorkflowStatusMeta> =
  {
    draft: {
      label: "Draft",
      icon: CircleDashed,
      colorVar: "var(--state-neutral)",
    },
    active: {
      label: "Active",
      icon: CirclePlay,
      colorVar: "var(--state-info)",
    },
    completed: {
      label: "Completed",
      icon: CheckCircle2,
      colorVar: "var(--state-success)",
    },
    abandoned: {
      label: "Abandoned",
      icon: Archive,
      colorVar: "var(--state-neutral)",
    },
  };

/** A workflow instance's lifecycle status — distinct from `StatusBadge`'s `ModuleStatus` vocabulary (a completed run's outcome, not a workflow's progress). */
function WorkflowStatusBadge({
  status,
}: {
  readonly status: WorkflowInstanceStatus;
}) {
  const meta = WORKFLOW_STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[13px] font-medium"
      style={{ color: meta.colorVar }}
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      {meta.label}
    </span>
  );
}

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

function parameterLabel(parameterId: string): string {
  return getParameter(parameterId)?.displayName ?? parameterId;
}

function RoleCard({
  role,
  instances,
  instanceLabels,
  moduleHref,
}: {
  readonly role: WorkflowModuleRole;
  readonly instances: readonly WorkflowInstanceContext[];
  readonly instanceLabels: Readonly<Record<string, string>>;
  readonly moduleHref: (instanceId: string) => string;
}) {
  const filled = instances.length;
  const satisfiesMin = filled >= role.cardinality.min;
  const cardinalityText =
    role.cardinality.max === undefined
      ? `${role.cardinality.min}+`
      : role.cardinality.min === role.cardinality.max
        ? `${role.cardinality.min}`
        : `${role.cardinality.min}-${role.cardinality.max}`;

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border-default p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-text-primary">
            {role.label}
          </span>
          <span className="font-mono text-[11px] text-text-muted">
            {role.id}
          </span>
        </div>
        <span
          className="shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
          style={{
            borderColor: satisfiesMin
              ? "var(--state-success)"
              : "var(--border-default)",
            color: satisfiesMin ? "var(--state-success)" : "var(--text-muted)",
          }}
        >
          {filled} of {cardinalityText} filled
        </span>
      </div>
      {filled === 0 ? (
        <p className="text-[12px] text-text-muted">
          No module instance fills this role yet — attach one from an
          assembly&apos;s &quot;Add module&quot; dialog, with this workflow
          selected.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {instances.map((instance) => (
            <li key={instance.instanceId}>
              <a
                href={moduleHref(instance.instanceId)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-text-primary hover:bg-surface-hover"
              >
                <Boxes
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-text-muted"
                />
                <span className="truncate">
                  {instanceLabels[instance.instanceId] ?? instance.instanceId}
                </span>
                <span className="font-mono text-[11px] text-text-muted">
                  {instance.moduleId}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function LinkProposalRow({
  proposal,
  configurationId,
  fromLabel,
  toLabel,
  confirmed,
}: {
  readonly proposal: WorkflowLinkProposal;
  readonly configurationId: string;
  readonly fromLabel: string;
  readonly toLabel: string;
  readonly confirmed: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    confirmSuggestedLinkAction,
    IDLE_ACTION_STATE,
  );

  return (
    <li className="flex flex-col gap-1.5 border-t border-border-default pt-2 first:border-t-0 first:pt-0">
      <p className="text-[12px] text-text-primary">
        {parameterLabel(proposal.parameterId)}: {fromLabel} → {toLabel}
      </p>
      {confirmed ? (
        <span
          className="inline-flex w-fit items-center gap-1.5 text-[12px] font-medium"
          style={{ color: "var(--state-success)" }}
        >
          <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
          Confirmed
        </span>
      ) : (
        <form action={formAction} className="contents">
          <input type="hidden" name="configurationId" value={configurationId} />
          <input
            type="hidden"
            name="targetModuleInstanceId"
            value={proposal.toInstanceId}
          />
          <input
            type="hidden"
            name="targetParameterId"
            value={proposal.parameterId}
          />
          {proposal.loadCase !== undefined ? (
            <input
              type="hidden"
              name="targetLoadCase"
              value={proposal.loadCase}
            />
          ) : null}
          <input type="hidden" name="sourceKind" value="module_output" />
          <input
            type="hidden"
            name="sourceModuleInstanceId"
            value={proposal.fromInstanceId}
          />
          <input
            type="hidden"
            name="sourceParameterId"
            value={proposal.parameterId}
          />
          {proposal.loadCase !== undefined ? (
            <input
              type="hidden"
              name="sourceLoadCase"
              value={proposal.loadCase}
            />
          ) : null}
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={isPending}
          >
            {isPending ? "Confirming…" : "Confirm"}
          </Button>
        </form>
      )}
      {state.status === "error" ? (
        <p
          role="alert"
          className="text-[12px]"
          style={{ color: "var(--state-error)" }}
        >
          {state.message}
        </p>
      ) : null}
    </li>
  );
}

function LinkProposalsSection({
  view,
}: {
  readonly view: WorkflowInstanceView;
}) {
  if (view.linkProposals.length === 0) {
    return (
      <PanelSection title="Link proposals">
        <p className="text-[13px] text-text-muted">
          No link proposals yet — attach module instances to more than one role
          to see suggested connections here.
        </p>
      </PanelSection>
    );
  }

  const labelFor = (instanceId: string) =>
    view.instanceLabels[instanceId] ?? instanceId;

  return (
    <PanelSection title="Link proposals">
      <ul className="flex flex-col gap-2">
        {view.linkProposals.map((proposal) => (
          <LinkProposalRow
            key={linkProposalKey(proposal)}
            proposal={proposal}
            configurationId={view.workflowInstance.configurationId}
            fromLabel={labelFor(proposal.fromInstanceId)}
            toLabel={labelFor(proposal.toInstanceId)}
            confirmed={view.confirmedLinkKeys.includes(
              linkProposalKey(proposal),
            )}
          />
        ))}
      </ul>
    </PanelSection>
  );
}

function CompletionRow({ result }: { readonly result: CompletionRuleResult }) {
  const Icon = result.satisfied ? CheckCircle2 : XCircle;
  return (
    <li className="flex items-start gap-2 text-[13px]">
      <Icon
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0"
        style={{
          color: result.satisfied
            ? "var(--state-success)"
            : "var(--text-muted)",
        }}
      />
      <span className="text-text-primary">{result.message}</span>
    </li>
  );
}

function CompletionSection({ view }: { readonly view: WorkflowInstanceView }) {
  return (
    <PanelSection title="Completion">
      <ul className="flex flex-col gap-1.5">
        {view.completion.results.map((result) => (
          <CompletionRow key={result.ruleId} result={result} />
        ))}
      </ul>
    </PanelSection>
  );
}

function ChecksSection({ view }: { readonly view: WorkflowInstanceView }) {
  if (view.checks.length === 0) {
    return (
      <PanelSection title="Checks">
        <p className="text-[13px] text-text-muted">
          This workflow declares no cross-module checks.
        </p>
      </PanelSection>
    );
  }
  return (
    <PanelSection title="Checks">
      <ul className="flex flex-col gap-1.5">
        {view.checks.map((check) => (
          <li key={check.id} className="flex items-center gap-2 text-[13px]">
            <StatusBadge status={check.status} iconOnly />
            <span className="text-text-primary">{check.message}</span>
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}

function ExcludedInstancesSection({
  view,
}: {
  readonly view: WorkflowInstanceView;
}) {
  if (view.excludedModuleInstances.length === 0) return null;
  return (
    <PanelSection title="Excluded module instances">
      <ul className="flex flex-col gap-1.5">
        {view.excludedModuleInstances.map((excluded) => (
          <li
            key={excluded.moduleInstanceId}
            className="rounded-md border px-2.5 py-1.5 text-[12px]"
            style={{
              borderColor: "var(--state-stale)",
              color: "var(--state-stale)",
            }}
          >
            {excluded.reason}
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}

/**
 * The generic workflow-instance workspace (Unit 4.9's UI surface): renders
 * `loadWorkflowInstanceView`'s already-assembled read model — roles and
 * their present instances, link proposals with a reused `confirmParameterLink`
 * confirm action, completion-rule results, workflow-level checks, and any
 * excluded module instances — mirroring `ModuleResultPanel`'s own
 * "renders entirely from already-shaped view data, no compute logic here"
 * discipline one level up (a workflow instance, not a single module).
 *
 * Confirming a proposed link reuses `confirmSuggestedLinkAction` unchanged —
 * a `WorkflowLinkProposal` maps directly onto the same
 * `CreateParameterLinkInput` shape that action already validates through
 * `confirmParameterLink`, so no new mutation code exists for this (see
 * `load-workflow-instance-view.ts`'s own file header).
 */
export function WorkflowInstanceWorkspace({
  view,
  projectId,
}: WorkflowInstanceWorkspaceProps) {
  const pathname = usePathname();
  const moduleHref = (instanceId: string) =>
    `${pathname}?project=${encodeURIComponent(projectId)}&configuration=${encodeURIComponent(view.workflowInstance.configurationId)}&module=${encodeURIComponent(instanceId)}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 pb-8">
      <header className="flex flex-col gap-1 border-b border-border-default pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <GitBranch
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-text-muted"
          />
          <h1 className="text-[16px] font-semibold text-text-primary">
            {view.definition.title}
          </h1>
          <WorkflowStatusBadge status={view.workflowInstance.status} />
          <span className="ml-auto font-mono text-[12px] text-text-muted">
            {view.definition.id}@{view.definition.version}
          </span>
        </div>
        <p className="text-[13px] text-text-muted">
          {view.definition.description}
        </p>
      </header>

      <RolesSection view={view} moduleHref={moduleHref} />
      <LinkProposalsSection view={view} />
      <CompletionSection view={view} />
      <ChecksSection view={view} />
      <ExcludedInstancesSection view={view} />
    </div>
  );
}

function RolesSection({
  view,
  moduleHref,
}: {
  readonly view: WorkflowInstanceView;
  readonly moduleHref: (instanceId: string) => string;
}) {
  return (
    <PanelSection title="Roles">
      <ul className="flex flex-col gap-2">
        {view.roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            instances={view.roleInstances.filter(
              (instance) => instance.roleId === role.id,
            )}
            instanceLabels={view.instanceLabels}
            moduleHref={moduleHref}
          />
        ))}
      </ul>
    </PanelSection>
  );
}
