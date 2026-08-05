"use client";

import { useActionState, useId, type ReactNode } from "react";
import { CheckCircle2, Circle, ClipboardList, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAcceptanceCriterionAction,
  createDesignAssumptionAction,
  createLoadCaseAction,
  createRequirementAction,
} from "@/app/(workspace)/workspace/actions";
import { IDLE_ACTION_STATE } from "@/app/(workspace)/workspace/action-state";
import { LOAD_CASE_LABELS } from "./load-case-labels";
import type {
  RequirementsView,
  RequirementView,
  RequirementVerificationStatus,
} from "@/lib/application";
import type { AssemblyNode } from "@/lib/db";

export interface RequirementsWorkspaceProps {
  readonly view: RequirementsView;
  /** The configuration's root assemblies, for the scope picker. */
  readonly assemblies: readonly AssemblyNode[];
}

const CONTROL_CLASS =
  "h-9 rounded-md border border-border-default bg-bg-surface px-2.5 text-[13px] text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary";
const TEXTAREA_CLASS =
  "min-h-16 rounded-md border border-border-default bg-bg-surface px-2.5 py-2 text-[13px] text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary";

interface AssemblyOption {
  readonly id: string;
  readonly label: string;
}

/** Flattens the assembly tree into an indented-path list for the scope picker. */
function flattenAssemblies(
  assemblies: readonly AssemblyNode[],
  prefix = "",
): AssemblyOption[] {
  const options: AssemblyOption[] = [];
  for (const assembly of assemblies) {
    const label =
      prefix.length > 0 ? `${prefix} / ${assembly.name}` : assembly.name;
    options.push({ id: assembly.id, label });
    options.push(...flattenAssemblies(assembly.children, label));
  }
  return options;
}

function assemblyLabel(
  assemblyId: string | null,
  options: readonly AssemblyOption[],
): string {
  if (assemblyId === null) return "Whole machine";
  return (
    options.find((option) => option.id === assemblyId)?.label ?? assemblyId
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

function AssemblyScopeField({
  id,
  label,
  assemblyOptions,
}: {
  readonly id: string;
  readonly label: string;
  readonly assemblyOptions: readonly AssemblyOption[];
}) {
  return (
    <div className="flex min-w-48 flex-1 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name="assemblyId"
        defaultValue=""
        className={CONTROL_CLASS}
      >
        <option value="">Whole machine (no assembly)</option>
        {assemblyOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * A requirement's authoring-completeness status — whether at least one
 * acceptance criterion is recorded. Deliberately not "Verified"/"Failed":
 * no calculation run is consulted (see `load-requirements-view.ts`'s
 * header for the full reasoning).
 */
function VerificationStatusBadge({
  status,
}: {
  readonly status: RequirementVerificationStatus;
}) {
  const defined = status === "criteria_defined";
  const Icon = defined ? CheckCircle2 : Circle;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
      style={{
        borderColor: defined ? "var(--state-success)" : "var(--border-default)",
        color: defined ? "var(--state-success)" : "var(--text-muted)",
      }}
    >
      <Icon aria-hidden="true" className="h-3 w-3" />
      {defined ? "Acceptance criteria defined" : "No acceptance criteria yet"}
    </span>
  );
}

function AddRequirementForm({
  configurationId,
  assemblyOptions,
}: {
  readonly configurationId: string;
  readonly assemblyOptions: readonly AssemblyOption[];
}) {
  const [state, formAction, isPending] = useActionState(
    createRequirementAction,
    IDLE_ACTION_STATE,
  );
  const codeId = useId();
  const statementId = useId();
  const scopeId = useId();

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-md border border-border-default p-3"
    >
      <input type="hidden" name="configurationId" value={configurationId} />
      <div className="flex flex-wrap gap-3">
        <div className="flex w-32 flex-col gap-1.5">
          <Label htmlFor={codeId}>Code</Label>
          <Input
            id={codeId}
            name="code"
            required
            maxLength={40}
            placeholder="REQ-01"
          />
        </div>
        <AssemblyScopeField
          id={scopeId}
          label="Requirement scope"
          assemblyOptions={assemblyOptions}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={statementId}>Requirement statement</Label>
        <textarea
          id={statementId}
          name="statement"
          required
          maxLength={2000}
          className={TEXTAREA_CLASS}
          placeholder="e.g. Axis positions the payload within 0.1 mm."
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Adding…" : "Add requirement"}
        </Button>
        <ErrorText
          message={state.status === "error" ? state.message : undefined}
        />
      </div>
    </form>
  );
}

function AddAcceptanceCriterionForm({
  requirementId,
}: {
  readonly requirementId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    createAcceptanceCriterionAction,
    IDLE_ACTION_STATE,
  );
  const id = useId();

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="requirementId" value={requirementId} />
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <Label htmlFor={id} className="text-[11px]">
          Add acceptance criterion
        </Label>
        <Input
          id={id}
          name="statement"
          required
          maxLength={2000}
          className="h-8 text-[12px]"
        />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? "Adding…" : "Add"}
      </Button>
      <ErrorText
        message={state.status === "error" ? state.message : undefined}
      />
    </form>
  );
}

function RequirementCard({
  requirement,
  assemblyOptions,
}: {
  readonly requirement: RequirementView;
  readonly assemblyOptions: readonly AssemblyOption[];
}) {
  return (
    <li className="flex flex-col gap-2 rounded-md border border-border-default p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[12px] font-medium text-text-primary">
              {requirement.code}
            </span>
            <span className="text-[11px] text-text-muted">
              {assemblyLabel(requirement.assemblyId, assemblyOptions)}
            </span>
          </div>
          <p className="text-[13px] text-text-primary">
            {requirement.statement}
          </p>
        </div>
        <VerificationStatusBadge status={requirement.verificationStatus} />
      </div>

      {requirement.acceptanceCriteria.length > 0 ? (
        <ul className="flex list-inside list-disc flex-col gap-0.5 pl-1 text-[12px] text-text-muted">
          {requirement.acceptanceCriteria.map((criterion) => (
            <li key={criterion.id}>{criterion.statement}</li>
          ))}
        </ul>
      ) : null}

      <AddAcceptanceCriterionForm requirementId={requirement.id} />
    </li>
  );
}

function RequirementsSection({
  view,
  assemblyOptions,
}: {
  readonly view: RequirementsView;
  readonly assemblyOptions: readonly AssemblyOption[];
}) {
  return (
    <PanelSection title="Requirements">
      <InfoNotice>
        Verification status here reflects only whether acceptance criteria have
        been recorded — it does not yet check a requirement against a
        calculation run. A requirements verification matrix linking requirements
        to supporting runs is planned for Milestone 5.
      </InfoNotice>
      <AddRequirementForm
        configurationId={view.configurationId}
        assemblyOptions={assemblyOptions}
      />
      {view.requirements.length === 0 ? (
        <p className="text-[13px] text-text-muted">
          No requirements recorded yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {view.requirements.map((requirement) => (
            <RequirementCard
              key={requirement.id}
              requirement={requirement}
              assemblyOptions={assemblyOptions}
            />
          ))}
        </ul>
      )}
    </PanelSection>
  );
}

function AddLoadCaseForm({
  configurationId,
}: {
  readonly configurationId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    createLoadCaseAction,
    IDLE_ACTION_STATE,
  );
  const categoryId = useId();
  const labelId = useId();
  const descriptionId = useId();

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="configurationId" value={configurationId} />
      <div className="flex w-40 flex-col gap-1.5">
        <Label htmlFor={categoryId}>Category</Label>
        <select
          id={categoryId}
          name="category"
          required
          defaultValue=""
          className={CONTROL_CLASS}
        >
          <option value="" disabled>
            Select
          </option>
          {Object.entries(LOAD_CASE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-40 flex-1 flex-col gap-1.5">
        <Label htmlFor={labelId}>Label</Label>
        <Input
          id={labelId}
          name="label"
          required
          maxLength={200}
          placeholder="e.g. Peak acceleration"
        />
      </div>
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <Label htmlFor={descriptionId}>Description</Label>
        <Input id={descriptionId} name="description" maxLength={2000} />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Adding…" : "Add load case"}
      </Button>
      <ErrorText
        message={state.status === "error" ? state.message : undefined}
      />
    </form>
  );
}

function LoadCasesSection({ view }: { readonly view: RequirementsView }) {
  return (
    <PanelSection title="Load cases">
      <AddLoadCaseForm configurationId={view.configurationId} />
      {view.loadCases.length === 0 ? (
        <p className="text-[13px] text-text-muted">
          No load cases recorded yet.
        </p>
      ) : (
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border-default text-left text-[11px] font-semibold tracking-wide text-text-muted uppercase">
              <th scope="col" className="py-1.5 pr-2">
                Category
              </th>
              <th scope="col" className="py-1.5 pr-2">
                Label
              </th>
              <th scope="col" className="py-1.5">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {view.loadCases.map((loadCase) => (
              <tr
                key={loadCase.id}
                className="border-b border-border-default last:border-0"
              >
                <td className="py-1.5 pr-2 text-text-primary">
                  {LOAD_CASE_LABELS[loadCase.category]}
                </td>
                <td className="py-1.5 pr-2 text-text-primary">
                  {loadCase.label}
                </td>
                <td className="py-1.5 text-text-muted">
                  {loadCase.description ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PanelSection>
  );
}

function AddDesignAssumptionForm({
  configurationId,
  assemblyOptions,
}: {
  readonly configurationId: string;
  readonly assemblyOptions: readonly AssemblyOption[];
}) {
  const [state, formAction, isPending] = useActionState(
    createDesignAssumptionAction,
    IDLE_ACTION_STATE,
  );
  const statementId = useId();
  const rationaleId = useId();
  const scopeId = useId();

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-md border border-border-default p-3"
    >
      <input type="hidden" name="configurationId" value={configurationId} />
      <div className="flex flex-wrap gap-3">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <Label htmlFor={statementId}>Assumption statement</Label>
          <textarea
            id={statementId}
            name="statement"
            required
            maxLength={2000}
            className={TEXTAREA_CLASS}
            placeholder="e.g. Guideway friction coefficient 0.005."
          />
        </div>
        <AssemblyScopeField
          id={scopeId}
          label="Assumption scope"
          assemblyOptions={assemblyOptions}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={rationaleId}>Rationale</Label>
        <Input
          id={rationaleId}
          name="rationale"
          maxLength={2000}
          placeholder="Optional"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Adding…" : "Add assumption"}
        </Button>
        <ErrorText
          message={state.status === "error" ? state.message : undefined}
        />
      </div>
    </form>
  );
}

function DesignAssumptionsSection({
  view,
  assemblyOptions,
}: {
  readonly view: RequirementsView;
  readonly assemblyOptions: readonly AssemblyOption[];
}) {
  return (
    <PanelSection title="Design assumptions">
      <AddDesignAssumptionForm
        configurationId={view.configurationId}
        assemblyOptions={assemblyOptions}
      />
      {view.designAssumptions.length === 0 ? (
        <p className="text-[13px] text-text-muted">
          No design assumptions recorded yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {view.designAssumptions.map((assumption) => (
            <li
              key={assumption.id}
              className="flex flex-col gap-1 rounded-md border border-border-default p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-[13px] text-text-primary">
                  {assumption.statement}
                </p>
                <span className="shrink-0 text-[11px] text-text-muted">
                  {assemblyLabel(assumption.assemblyId, assemblyOptions)}
                </span>
              </div>
              {assumption.rationale !== null ? (
                <p className="text-[12px] text-text-muted">
                  {assumption.rationale}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </PanelSection>
  );
}

/**
 * The requirements, assumptions, and load-case workspace (Unit 3.7,
 * `implementation-map.md`: "Requirement editor", "Acceptance criteria",
 * "Load-case table", "Assumption register", "Verification status"). Exit
 * criterion: "Axis design intent is stored before downstream modules are
 * run" — this panel renders and writes entirely at the configuration level,
 * independent of any module instance.
 *
 * "Verification status" reports whether a requirement has recorded
 * acceptance criteria, not whether a calculation run demonstrates it — see
 * `load-requirements-view.ts`'s header for why a real requirement-to-run
 * link (`VerificationLink` in architecture.md's domain model) is deferred
 * to Milestone 5's requirements verification matrix (Unit 5.3), not
 * invented here.
 */
export function RequirementsWorkspace({
  view,
  assemblies,
}: RequirementsWorkspaceProps) {
  const assemblyOptions = flattenAssemblies(assemblies);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 pb-6">
      <header className="flex items-center gap-2 border-b border-border-default pb-3">
        <ClipboardList
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-text-muted"
        />
        <h1 className="text-[16px] font-semibold text-text-primary">
          Requirements & design intent
        </h1>
      </header>

      <RequirementsSection view={view} assemblyOptions={assemblyOptions} />
      <LoadCasesSection view={view} />
      <DesignAssumptionsSection view={view} assemblyOptions={assemblyOptions} />
    </div>
  );
}
