"use client";

import { useActionState, useId } from "react";
import {
  Boxes,
  CircleDashed,
  Link2,
  PenLine,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import {
  LinkedFieldControl,
  LinkSuggestionPanel,
} from "./link-suggestion-panel";
import { LoadCaseChip } from "./load-case-chip";
import { setModuleInputValueAction } from "@/app/(workspace)/workspace/actions";
import { IDLE_ACTION_STATE } from "@/app/(workspace)/workspace/action-state";
import { convert } from "@/lib/engine/units";
import { cn } from "@/lib/utils";
import type { ResolvedInputSource } from "@/lib/db";
import type {
  ModuleInputFieldView,
  ModuleInputGroupView,
  ModuleWorkspaceView,
} from "@/lib/application";

export interface ModuleInputWorkspaceProps {
  readonly view: ModuleWorkspaceView;
}

const CONTROL_CLASS =
  "h-9 rounded-md border border-border-default bg-bg-surface px-2.5 text-[13px] text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary";

/**
 * axis.v1's fixed 3-component order and physical meaning
 * (context/axis-load-cases-stage-1-spec.md): X = the engineer-declared
 * positive travel direction, Y = horizontal transverse, Z = the resulting
 * right-handed axis. Only `frame: "axis"` vectors are editable today — see
 * docs/superpowers/specs/2026-08-05-vector-quantity-input-editor-design.md.
 */
const AXIS_COMPONENT_LABELS = [
  "X (travel direction)",
  "Y (transverse)",
  "Z",
] as const;

/**
 * Short visible captions for the 3 axis-vector component inputs — the full
 * `AXIS_COMPONENT_LABELS` phrasing (e.g. "X (travel direction)") stays in
 * each input's `aria-label` for screen readers, but a sighted user needs a
 * persistent, at-a-glance way to tell 3 otherwise-identical number boxes
 * apart too (a code-review finding: without this, mistyping a value into
 * the wrong component silently saves and validates — 3 finite numbers, no
 * error — unlike the blank-rejection guard this feature already takes
 * seriously elsewhere, Unit 3.9's Defect 3). Deliberately not a
 * `placeholder`, which disappears the moment a value is typed — exactly
 * when re-checking which box is which matters most.
 */
const AXIS_COMPONENT_CAPTIONS = ["X", "Y", "Z"] as const;

/**
 * The generic module input renderer (Unit 3.3, `implementation-map.md`:
 * "Render fields from ModuleUiSchema"; extended by Unit 3.4, "Link
 * Suggestion UI"). Renders `quantity` (with an explicit unit selector),
 * `enum`, `boolean`, and axis-frame `vector_quantity` (three labeled
 * component inputs plus a shared unit selector — see
 * docs/superpowers/specs/2026-08-05-vector-quantity-input-editor-design.md)
 * fields, grouped per the module's declared `ModuleUiSchema` — the same
 * component for every module, per the "No module-specific form is permitted
 * in this unit" rule. A non-linked field also renders its ranked link
 * suggestions (`LinkSuggestionPanel`, link-suggestion-panel.tsx); a linked
 * field renders its remove-link control (`LinkedFieldControl`) instead of an
 * editor.
 *
 * Deliberately deferred (2026-07-31 decision, see
 * context/progress-tracker.md Open Questions): a `curve` parameter, or a
 * `vector_quantity` whose frame is not `"axis"` (same wording as the
 * `"unsupported"` union member's own comment in describe-field.ts). Neither
 * has a released registry contract for what a generic editor needs yet, and
 * no registered module declares either kind today. Both render as an honest
 * "not yet editable" notice via the `"unsupported"` field-descriptor branch
 * rather than being invented here — such a field still offers link
 * suggestions, since linking never needs a native editor.
 *
 * Still deliberately out of scope: a "Run module" action —
 * `ui-context.md`'s Generic Module Workspace section assigns that to the
 * Result pane (Unit 3.5), a later unit.
 */
export function ModuleInputWorkspace({ view }: ModuleInputWorkspaceProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-6">
      <header className="flex items-center gap-3 border-b border-border-default pb-4">
        <Boxes
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-text-muted"
        />
        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-semibold text-text-primary">
            {view.moduleInstance.label}
          </h1>
          <p className="truncate font-mono text-[12px] text-text-muted">
            {view.moduleInstance.modulePackageId}@
            {view.moduleInstance.moduleVersion}
          </p>
        </div>
        <StatusBadge
          status={view.moduleInstance.lastRunStatus ?? "not_configured"}
          className="ml-auto shrink-0"
        />
      </header>

      {view.groups.length === 0 ? (
        <p className="text-[13px] text-text-muted">
          This module declares no input fields.
        </p>
      ) : (
        view.groups.map((group) => (
          <FieldGroup
            key={group.id}
            group={group}
            configurationId={view.moduleInstance.configurationId}
            moduleInstanceId={view.moduleInstance.id}
          />
        ))
      )}
    </div>
  );
}

function FieldGroup({
  group,
  configurationId,
  moduleInstanceId,
}: {
  readonly group: ModuleInputGroupView;
  readonly configurationId: string;
  readonly moduleInstanceId: string;
}) {
  return (
    <section className="flex flex-col gap-5 rounded-lg border border-border-default bg-bg-surface p-4">
      <h2 className="text-[14px] font-semibold text-text-primary">
        {group.title}
      </h2>
      <div className="flex flex-col gap-5">
        {group.fields.map((field) => (
          <ModuleInputFieldRow
            key={field.portKey}
            field={field}
            configurationId={configurationId}
            moduleInstanceId={moduleInstanceId}
          />
        ))}
      </div>
    </section>
  );
}

const SOURCE_META: Record<
  ResolvedInputSource["source"],
  { label: string; icon: LucideIcon }
> = {
  manual: { label: "Manual", icon: PenLine },
  workflow: { label: "Workflow", icon: Workflow },
  linked: { label: "Linked", icon: Link2 },
  default: { label: "Default", icon: CircleDashed },
};

/** Source badge: manual, linked, default, or workflow (ui-context.md "Generic Module Workspace"). */
function SourceBadge({
  source,
}: {
  readonly source: ResolvedInputSource["source"];
}) {
  const meta = SOURCE_META[source];
  const Icon = meta.icon;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border-default px-1.5 py-0.5 text-[11px] font-medium text-text-muted">
      <Icon aria-hidden="true" className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function ModuleInputFieldRow({
  field,
  configurationId,
  moduleInstanceId,
}: {
  readonly field: ModuleInputFieldView;
  readonly configurationId: string;
  readonly moduleInstanceId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    setModuleInputValueAction,
    IDLE_ACTION_STATE,
  );
  const inputId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={inputId}>{field.label}</Label>
        {field.required ? (
          <span className="text-[11px] text-text-muted">(required)</span>
        ) : null}
        <SourceBadge source={field.resolved.source} />
        {field.loadCase !== null ? (
          <LoadCaseChip loadCase={field.loadCase} />
        ) : null}
      </div>
      {field.help !== null ? (
        <p className="text-[12px] text-text-muted">{field.help}</p>
      ) : null}

      {field.resolved.source === "linked" ? (
        <LinkedFieldControl
          resolved={field.resolved}
          linkRemovalImpact={field.linkRemovalImpact ?? 0}
        />
      ) : (
        <>
          {field.field.kind === "unsupported" ? (
            <p className="text-[12px] text-text-muted italic">
              Editing {field.field.valueType.replace("_", " ")} values is not
              supported yet — link a source instead.
            </p>
          ) : (
            <form
              action={formAction}
              className="flex flex-wrap items-start gap-2"
            >
              <input
                type="hidden"
                name="configurationId"
                value={configurationId}
              />
              <input
                type="hidden"
                name="moduleInstanceId"
                value={moduleInstanceId}
              />
              <input
                type="hidden"
                name="parameterId"
                value={field.parameterId}
              />
              {field.loadCase !== null ? (
                <input type="hidden" name="loadCase" value={field.loadCase} />
              ) : null}
              <input type="hidden" name="valueKind" value={field.field.kind} />

              <FieldControl field={field} inputId={inputId} />

              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={isPending}
              >
                {isPending ? "Saving…" : "Save"}
              </Button>
            </form>
          )}
          <LinkSuggestionPanel
            field={field}
            configurationId={configurationId}
            targetModuleInstanceId={moduleInstanceId}
          />
        </>
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
    </div>
  );
}

function FieldControl({
  field,
  inputId,
}: {
  readonly field: ModuleInputFieldView;
  readonly inputId: string;
}) {
  const descriptor = field.field;
  const resolved = field.resolved;
  // "linked"/"unsupported" never reach here (handled by the caller), so
  // `resolved` here is always "manual" | "workflow" | "default".
  const currentValue =
    resolved.source === "default" ? undefined : resolved.value;

  if (descriptor.kind === "quantity") {
    const current =
      currentValue?.kind === "quantity" ? currentValue : undefined;
    const defaultUnit =
      current?.displayUnit ?? current?.unit ?? descriptor.canonicalUnit;
    const defaultMagnitude =
      current === undefined
        ? undefined
        : convert(current.value, current.unit, defaultUnit);
    return (
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="number"
          step="any"
          name="magnitude"
          defaultValue={defaultMagnitude}
          required={field.required}
          className={cn(CONTROL_CLASS, "w-36 font-mono tabular-nums")}
        />
        <select
          name="unit"
          defaultValue={defaultUnit}
          aria-label={`${field.label} unit`}
          className={cn(CONTROL_CLASS, "w-24")}
        >
          {descriptor.displayUnits.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (descriptor.kind === "vector_quantity") {
    const current =
      currentValue?.kind === "vector_quantity" ? currentValue : undefined;
    const defaultUnit =
      current?.displayUnit ?? current?.unit ?? descriptor.canonicalUnit;
    const defaultComponents = current?.components.map((component) =>
      convert(component, current.unit, defaultUnit),
    );
    return (
      <div className="flex flex-wrap items-start gap-2">
        {AXIS_COMPONENT_LABELS.map((axisLabel, index) => (
          <div key={axisLabel} className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-muted">
              {AXIS_COMPONENT_CAPTIONS[index]}
            </span>
            <input
              id={index === 0 ? inputId : undefined}
              type="number"
              step="any"
              name={`component-${index}`}
              defaultValue={defaultComponents?.[index]}
              aria-label={`${field.label} ${axisLabel}`}
              required={field.required}
              className={cn(CONTROL_CLASS, "w-24 font-mono tabular-nums")}
            />
          </div>
        ))}
        <select
          name="unit"
          defaultValue={defaultUnit}
          aria-label={`${field.label} unit`}
          className={cn(CONTROL_CLASS, "w-24")}
        >
          {descriptor.displayUnits.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (descriptor.kind === "enum") {
    const current =
      currentValue?.kind === "enum" ? currentValue.value : undefined;
    return (
      <select
        id={inputId}
        name="option"
        defaultValue={current ?? ""}
        required={field.required}
        className={cn(CONTROL_CLASS, "w-48")}
      >
        {current === undefined ? (
          <option value="" disabled>
            Select…
          </option>
        ) : null}
        {descriptor.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  // "boolean"
  const current = currentValue?.kind === "boolean" ? currentValue.value : false;
  return (
    <label className="flex h-9 items-center gap-2 text-[13px] text-text-primary">
      <input
        id={inputId}
        type="checkbox"
        name="checked"
        value="true"
        defaultChecked={current}
        className="h-4 w-4 rounded border-border-default"
      />
      Yes
    </label>
  );
}
