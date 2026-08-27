"use client";

import { useActionState, useEffect, useId, useState } from "react";
import {
  Boxes,
  CircleAlert,
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
  LinkSuggestionMenu,
} from "./link-suggestion-panel";
import { LoadCaseChip } from "./load-case-chip";
import {
  previewModuleComputationAction,
  saveModuleInputsAction,
} from "@/app/(workspace)/workspace/actions";
import {
  IDLE_ACTION_STATE,
  IDLE_MODULE_PREVIEW_ACTION_STATE,
} from "@/app/(workspace)/workspace/action-state";
import { convert } from "@/lib/engine/units";
import { cn } from "@/lib/utils";
import type { ResolvedInputSource } from "@/lib/db";
import type {
  ModuleInputFieldView,
  ModuleInputGroupView,
  ModulePreviewView,
  ModuleWorkspaceView,
} from "@/lib/application";

export interface ModuleInputWorkspaceProps {
  readonly view: ModuleWorkspaceView;
  /**
   * Called with the fresh computation after a successful Run (preview), and
   * with `null` right after a successful Save (the persisted result takes
   * over once the page revalidates). `ModuleInputWorkspace` and
   * `ModuleResultPanel` are rendered as siblings by `WorkspaceShell`, not
   * nested, so the preview has to be lifted through the shared parent rather
   * than passed directly.
   */
  readonly onPreviewChange: (preview: ModulePreviewView | null) => void;
}

const CONTROL_CLASS =
  "h-9 rounded-md border border-border-default bg-bg-surface px-2.5 text-[13px] text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary";

/**
 * axis.v1's fixed 3-component order and physical meaning
 * (context/modules/axis-load-cases/stage-1-spec.md): X = the engineer-declared
 * positive travel direction, Y = horizontal transverse, Z = the resulting
 * right-handed axis. Only `frame: "axis"` vectors are editable today — see
 * docs/design/vector-quantity-input-editor.md.
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
 * apart too. Deliberately not a `placeholder`, which disappears the moment a
 * value is typed — exactly when re-checking which box is which matters most.
 */
const AXIS_COMPONENT_CAPTIONS = ["X", "Y", "Z"] as const;

/**
 * Bento grid-cell placement for a module whose declared `ModuleUiSchema`
 * groups happen to match this exact 4-group id set — currently only
 * belt-pulley-drive-motor-sizing@0.3.x. Keyed by group id (not module id),
 * so this stays a generic "layout follows declared structure" rule rather
 * than a module-specific form: any module that declares these same four
 * group ids gets the same 2-column x 3-row bento automatically, and any
 * module whose groups don't match this set falls back to the plain stacked
 * layout below unchanged.
 */
const BENTO_CELL_CLASS: Record<string, string> = {
  "geometry-and-environment": "lg:col-start-1 lg:row-start-1",
  "motor-and-safety-factors": "lg:col-start-1 lg:row-start-2",
  "pulleys-and-belt": "lg:col-start-2 lg:row-start-1 lg:row-span-2",
  motion: "lg:col-start-1 lg:col-span-2 lg:row-start-3",
};
const BENTO_GROUP_IDS = Object.keys(BENTO_CELL_CLASS);

/**
 * Seeds a field's completeness from its *server-resolved* value alone (no
 * client typing yet) — so an already-saved field counts as complete
 * immediately on mount, not only after the user types (design doc, "Action
 * bar"). A `linked` field is always complete regardless of its own link's
 * run status (`ModuleInputFieldRow` excludes linked fields from the
 * required-check separately, using `field.resolved.source` directly — this
 * seed only matters for a field that *could* later become non-linked, which
 * never happens without a page reload, so its value here is inert for
 * linked fields but kept for symmetry). A `boolean` field is always complete
 * — a checkbox is always definitively true or false, never empty. Any other
 * kind is complete when it already has a manual/workflow value, or a
 * "default" resolution backed by a real registry constant.
 */
function isFieldInitiallyComplete(field: ModuleInputFieldView): boolean {
  if (field.resolved.source === "linked") return true;
  if (field.field.kind === "boolean") return true;
  if (field.resolved.source !== "default") return true;
  return field.hasBuiltInDefault ?? false;
}

/**
 * The generic module input renderer (Unit 3.3/3.4, redesigned 2026-08-27 —
 * see docs/superpowers/specs/2026-08-27-module-workspace-save-run-redesign-
 * design.md). One `<form>` covers every field in every group; a sticky
 * header holds `Run` (preview — computes from the form's current values,
 * persists nothing) and `Save` (persists every field plus a real
 * `CalculationRun`, in that order). Renders `quantity`, `enum`, `boolean`,
 * and axis-frame `vector_quantity` fields, grouped per the module's declared
 * `ModuleUiSchema` — the same component for every module. A non-linked
 * field's suggestions live behind a ⋮ menu next to its label
 * (`LinkSuggestionMenu`); a linked field renders its remove-link control
 * (`LinkedFieldControl`) instead of an editor.
 *
 * Deliberately deferred (unchanged from before this redesign): a `curve`
 * parameter, or a `vector_quantity` whose frame is not `"axis"` — both
 * render as an honest "not yet editable" notice via the field descriptor's
 * `"unsupported"` branch. Such a field still offers link suggestions, since
 * linking never needs a native editor.
 */
export function ModuleInputWorkspace({
  view,
  onPreviewChange,
}: ModuleInputWorkspaceProps) {
  const allFields = view.groups.flatMap((group) => group.fields);

  const [complete, setComplete] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      allFields.map((field) => [field.portKey, isFieldInitiallyComplete(field)]),
    ),
  );
  const handleCompletenessChange = (portKey: string, isComplete: boolean) => {
    setComplete((prev) =>
      prev[portKey] === isComplete ? prev : { ...prev, [portKey]: isComplete },
    );
  };

  const [saveState, saveFormAction, isSaving] = useActionState(
    saveModuleInputsAction,
    IDLE_ACTION_STATE,
  );
  const [previewState, previewFormAction, isPreviewing] = useActionState(
    previewModuleComputationAction,
    IDLE_MODULE_PREVIEW_ACTION_STATE,
  );

  // Lifts a successful preview up to the sibling ModuleResultPanel via
  // WorkspaceShell. An effect, not a render-time call: onPreviewChange
  // updates a DIFFERENT component's (WorkspaceShell's) state, which React
  // only supports doing from an effect, not synchronously during this
  // component's own render.
  useEffect(() => {
    if (previewState.status === "success") {
      onPreviewChange(previewState.preview);
    }
  }, [previewState, onPreviewChange]);

  // Clears any showing preview once Save actually persists a real run — the
  // page revalidates and ModuleResultPanel's own `view` prop takes over.
  useEffect(() => {
    if (saveState.status === "success") {
      onPreviewChange(null);
    }
  }, [saveState, onPreviewChange]);

  const missingRequiredFields = allFields.filter(
    (field) =>
      field.required &&
      !(field.disabled ?? false) &&
      field.field.kind !== "unsupported" &&
      field.resolved.source !== "linked" &&
      !(complete[field.portKey] ?? false),
  );
  const runDisabled = missingRequiredFields.length > 0 || isSaving || isPreviewing;
  const runTitle =
    missingRequiredFields.length > 0
      ? `Missing required input${missingRequiredFields.length > 1 ? "s" : ""}: ${missingRequiredFields.map((field) => field.label).join(", ")}`
      : undefined;

  const isBentoLayout =
    view.groups.length === BENTO_GROUP_IDS.length &&
    view.groups.every((group) => group.id in BENTO_CELL_CLASS);

  return (
    <form
      action={saveFormAction}
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6"
    >
      <input
        type="hidden"
        name="configurationId"
        value={view.moduleInstance.configurationId}
      />
      <input
        type="hidden"
        name="moduleInstanceId"
        value={view.moduleInstance.id}
      />

      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-default bg-bg-base pb-4">
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
          className="shrink-0"
        />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* `title` goes on the wrapping span, not the disabled Button
              itself: a disabled native <button> does not fire hover events
              in most browsers, so a `title` on the button alone would never
              show its tooltip while Run is actually disabled. */}
          <span title={runTitle}>
            <Button
              type="submit"
              formAction={previewFormAction}
              variant="outline"
              size="sm"
              disabled={runDisabled}
            >
              {isPreviewing ? "Running…" : "Run"}
            </Button>
          </span>
          <Button
            type="submit"
            formAction={saveFormAction}
            size="sm"
            disabled={isSaving || isPreviewing}
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </header>

      {runTitle !== undefined ? (
        // The `title` on the Run button's wrapping span (below) only reaches
        // a sighted mouse user: a disabled native <button> can't receive
        // keyboard focus in any browser, so nothing ever triggers its hover
        // tooltip for a keyboard or screen-reader user. This line is the
        // actual accessible surface for "what's missing" — always in the
        // document, not conditional on hover/focus.
        <p className="text-[12px] text-text-muted">{runTitle}</p>
      ) : null}

      {previewState.status === "error" ? (
        <p
          role="alert"
          className="text-[12px]"
          style={{ color: "var(--state-error)" }}
        >
          {previewState.message}
        </p>
      ) : null}
      {saveState.status === "error" ? (
        <p
          role="alert"
          className="text-[12px]"
          style={{ color: "var(--state-error)" }}
        >
          {saveState.message}
        </p>
      ) : null}

      {view.groups.length === 0 ? (
        <p className="text-[13px] text-text-muted">
          This module declares no input fields.
        </p>
      ) : isBentoLayout ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto]">
          {view.groups.map((group) => (
            <FieldGroup
              key={group.id}
              group={group}
              configurationId={view.moduleInstance.configurationId}
              moduleInstanceId={view.moduleInstance.id}
              onCompletenessChange={handleCompletenessChange}
              className={cn("h-full", BENTO_CELL_CLASS[group.id])}
              showMotionProfilePlaceholder={group.id === "motion"}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {view.groups.map((group) => (
            <FieldGroup
              key={group.id}
              group={group}
              configurationId={view.moduleInstance.configurationId}
              moduleInstanceId={view.moduleInstance.id}
              onCompletenessChange={handleCompletenessChange}
            />
          ))}
        </div>
      )}
    </form>
  );
}

function FieldGroup({
  group,
  configurationId,
  moduleInstanceId,
  onCompletenessChange,
  className,
  showMotionProfilePlaceholder = false,
}: {
  readonly group: ModuleInputGroupView;
  readonly configurationId: string;
  readonly moduleInstanceId: string;
  readonly onCompletenessChange: (portKey: string, complete: boolean) => void;
  readonly className?: string;
  readonly showMotionProfilePlaceholder?: boolean;
}) {
  const fields = (
    <div className="flex flex-col gap-5">
      {group.fields.map((field) => (
        <ModuleInputFieldRow
          key={field.portKey}
          field={field}
          configurationId={configurationId}
          moduleInstanceId={moduleInstanceId}
          onCompletenessChange={onCompletenessChange}
        />
      ))}
    </div>
  );

  if (showMotionProfilePlaceholder) {
    return (
      <section
        className={cn(
          "flex flex-col gap-5 rounded-lg border border-border-default bg-bg-surface p-4",
          className,
        )}
      >
        <h2 className="text-[14px] font-semibold text-text-primary">
          {group.title}
        </h2>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
          {group.fields.map((field) => (
            <ModuleInputFieldRow
              key={field.portKey}
              field={field}
              configurationId={configurationId}
              moduleInstanceId={moduleInstanceId}
              onCompletenessChange={onCompletenessChange}
            />
          ))}
        </div>
        <div className="flex min-h-40 flex-1 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border-default text-center">
          <p className="text-[12px] font-medium text-text-muted">
            Motion profile chart
          </p>
          <p className="text-[11px] text-text-muted">Coming soon</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "flex flex-col gap-5 rounded-lg border border-border-default bg-bg-surface p-4",
        className,
      )}
    >
      <h2 className="text-[14px] font-semibold text-text-primary">
        {group.title}
      </h2>
      {fields}
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

/**
 * Source badge: manual, linked, default, or workflow (ui-context.md
 * "Generic Module Workspace"). `source === "default"` on its own only means
 * "nothing was manually entered, linked, or workflow-supplied" — it does not
 * mean a real value is behind it. When `hasBuiltInDefault` is false, this
 * renders "Not set" in the error color instead of "Default", so an empty
 * required field never looks pre-filled.
 */
function SourceBadge({
  source,
  hasBuiltInDefault,
}: {
  readonly source: ResolvedInputSource["source"];
  readonly hasBuiltInDefault: boolean;
}) {
  if (source === "default" && !hasBuiltInDefault) {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
        style={{
          borderColor: "var(--state-error)",
          color: "var(--state-error)",
        }}
      >
        <CircleAlert aria-hidden="true" className="h-3 w-3" />
        Not set
      </span>
    );
  }
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
  onCompletenessChange,
}: {
  readonly field: ModuleInputFieldView;
  readonly configurationId: string;
  readonly moduleInstanceId: string;
  readonly onCompletenessChange: (portKey: string, complete: boolean) => void;
}) {
  const inputId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={inputId}>{field.label}</Label>
        {field.required ? (
          <span className="text-[11px] text-text-muted">(required)</span>
        ) : null}
        <SourceBadge
          source={field.resolved.source}
          hasBuiltInDefault={field.hasBuiltInDefault ?? false}
        />
        {field.loadCase !== null ? (
          <LoadCaseChip loadCase={field.loadCase} />
        ) : null}
        {!(field.disabled ?? false) && field.resolved.source !== "linked" ? (
          <LinkSuggestionMenu
            field={field}
            configurationId={configurationId}
            targetModuleInstanceId={moduleInstanceId}
          />
        ) : null}
      </div>
      {field.help !== null ? (
        <p className="text-[12px] text-text-muted">{field.help}</p>
      ) : null}

      {field.resolved.source === "linked" ? (
        <LinkedFieldControl
          resolved={field.resolved}
          linkRemovalImpact={field.linkRemovalImpact ?? 0}
          linkedSourceStatus={field.linkedSourceStatus}
        />
      ) : field.field.kind === "unsupported" ? (
        <p className="text-[12px] text-text-muted italic">
          Editing {field.field.valueType.replace("_", " ")} values is not
          supported yet — link a source instead.
        </p>
      ) : (
        <div className="flex flex-wrap items-start gap-2">
          <input
            type="hidden"
            name={`fields.${field.portKey}.parameterId`}
            value={field.parameterId}
            disabled={field.disabled ?? false}
          />
          {field.loadCase !== null ? (
            <input
              type="hidden"
              name={`fields.${field.portKey}.loadCase`}
              value={field.loadCase}
              disabled={field.disabled ?? false}
            />
          ) : null}
          <input
            type="hidden"
            name={`fields.${field.portKey}.valueKind`}
            value={field.field.kind}
            disabled={field.disabled ?? false}
          />

          <FieldControl
            field={field}
            inputId={inputId}
            disabled={field.disabled ?? false}
            onCompletenessChange={(isComplete) =>
              onCompletenessChange(field.portKey, isComplete)
            }
          />
        </div>
      )}
    </div>
  );
}

function FieldControl({
  field,
  inputId,
  disabled,
  onCompletenessChange,
}: {
  readonly field: ModuleInputFieldView;
  readonly inputId: string;
  readonly disabled: boolean;
  readonly onCompletenessChange: (complete: boolean) => void;
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
          name={`fields.${field.portKey}.magnitude`}
          defaultValue={defaultMagnitude}
          required={field.required}
          disabled={disabled}
          onChange={(event) => {
            const text = event.target.value.trim();
            onCompletenessChange(
              text.length > 0 && Number.isFinite(Number(text)),
            );
          }}
          className={cn(CONTROL_CLASS, "w-36 font-mono tabular-nums")}
        />
        <select
          name={`fields.${field.portKey}.unit`}
          defaultValue={defaultUnit}
          aria-label={`${field.label} unit`}
          disabled={disabled}
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
      <div
        className="flex flex-wrap items-start gap-2"
        onChange={(event) => {
          const inputs =
            event.currentTarget.querySelectorAll<HTMLInputElement>(
              "input[type='number']",
            );
          const allParseable =
            inputs.length === 3 &&
            Array.from(inputs).every((el) => {
              const text = el.value.trim();
              return text.length > 0 && Number.isFinite(Number(text));
            });
          onCompletenessChange(allParseable);
        }}
      >
        {AXIS_COMPONENT_LABELS.map((axisLabel, index) => (
          <div key={axisLabel} className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-muted">
              {AXIS_COMPONENT_CAPTIONS[index]}
            </span>
            <input
              id={index === 0 ? inputId : undefined}
              type="number"
              step="any"
              name={`fields.${field.portKey}.component-${index}`}
              defaultValue={defaultComponents?.[index]}
              aria-label={`${field.label} ${axisLabel}`}
              required={field.required}
              disabled={disabled}
              className={cn(CONTROL_CLASS, "w-24 font-mono tabular-nums")}
            />
          </div>
        ))}
        <select
          name={`fields.${field.portKey}.unit`}
          defaultValue={defaultUnit}
          aria-label={`${field.label} unit`}
          disabled={disabled}
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
        name={`fields.${field.portKey}.option`}
        defaultValue={current ?? ""}
        required={field.required}
        disabled={disabled}
        onChange={(event) => onCompletenessChange(event.target.value !== "")}
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
        name={`fields.${field.portKey}.checked`}
        value="true"
        defaultChecked={current}
        disabled={disabled}
        className="h-4 w-4 rounded border-border-default"
      />
      Yes
    </label>
  );
}
