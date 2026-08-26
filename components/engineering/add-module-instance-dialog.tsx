"use client";

import { useActionState, useId, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addModuleInstanceAction } from "@/app/(workspace)/workspace/actions";
import { IDLE_ACTION_STATE } from "@/app/(workspace)/workspace/action-state";
import { cn } from "@/lib/utils";

export interface ModulePackageOption {
  readonly modulePackageId: string;
  readonly moduleVersion: string;
  readonly category: string;
}

const MOTOR_SIZING_CATEGORY_PREFIX = "motor-sizing.";
const PNEUMATIC_CATEGORY_PREFIX = "cylinder-sizing.";

/** A round-body double-acting cylinder: tube, rod, and a plain rod-end mount. */
function StandardCylinderGlyph({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 64 40"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="6" y="12" width="26" height="16" rx="2" />
      <line x1="6" y1="17" x2="32" y2="17" strokeWidth={1} opacity={0.5} />
      <line x1="32" y1="20" x2="50" y2="20" />
      <rect x="48" y="16" width="8" height="8" rx="1" />
    </svg>
  );
}

/** A guided cylinder: body plus a top-mounted plate riding on two visible guide rods. */
function GuidedCylinderGlyph({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 64 40"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="20" width="34" height="12" rx="2" />
      <line x1="4" y1="24" x2="38" y2="24" strokeWidth={1} opacity={0.5} />
      <line x1="12" y1="20" x2="12" y2="8" />
      <line x1="30" y1="20" x2="30" y2="8" />
      <rect x="8" y="4" width="26" height="6" rx="1" />
      <line x1="34" y1="7" x2="56" y2="7" />
      <rect x="54" y="4" width="6" height="6" rx="1" />
    </svg>
  );
}

/**
 * Per-module display data for the pneumatic-cylinder card picker (see
 * `PneumaticModulePicker` below) — cylinder type name, the real SMC series
 * this module matches against, a one-line description, and a glyph
 * distinguishing round-body from guided-plate construction at a glance. A
 * UI-layer-only lookup, the same reasoning as `MECHANISM_LABELS`
 * (`ModuleManifest` has no display-name/image field to read this from). A
 * pneumatic module id missing from this map falls back to a generic card
 * (its own raw id, no series line, the standard-cylinder glyph) rather than
 * being hidden.
 */
interface PneumaticModuleInfo {
  readonly typeName: string;
  readonly seriesName: string;
  readonly description: string;
  readonly Glyph: (props: { readonly className?: string }) => ReactNode;
}

const PNEUMATIC_MODULE_INFO: Readonly<Record<string, PneumaticModuleInfo>> = {
  "pneumatic-cylinder-sizing": {
    typeName: "Standard Cylinder",
    seriesName: "SMC CM2 / CA2",
    description: "Round-body double-acting cylinder — load in, catalog match out.",
    Glyph: StandardCylinderGlyph,
  },
  "guided-cylinder-sizing": {
    typeName: "Guided Cylinder",
    seriesName: "SMC MGQ / MGP",
    description: "Built-in guide plate rated for lateral load and rotational torque.",
    Glyph: GuidedCylinderGlyph,
  },
};

function pneumaticModuleInfo(pkg: ModulePackageOption): PneumaticModuleInfo {
  return (
    PNEUMATIC_MODULE_INFO[pkg.modulePackageId] ?? {
      typeName: pkg.modulePackageId,
      seriesName: "",
      description: pkg.category,
      Glyph: StandardCylinderGlyph,
    }
  );
}

/**
 * Friendly mechanism names for the Motor Sizing Tool family (ADR-0011
 * "Add-module UI flow"), keyed by module id. `ModuleManifest` has no
 * display-name field to read this from — adding one would change every
 * released module's own content hash (ai-workflow-rules.md "Protected
 * Files") — so this is a UI-layer-only lookup. A motor-sizing module id
 * missing from this map falls back to its own id rather than throwing.
 */
const MECHANISM_LABELS: Readonly<Record<string, string>> = {
  "ball-screw-motor-sizing": "Ball Screw",
  "belt-pulley-drive-motor-sizing": "Belt & Pulley Drive",
  "direct-drive-conveyor-motor-sizing": "Direct-Drive Conveyor",
  "rack-pinion-motor-sizing": "Rack & Pinion",
  "index-table-motor-sizing": "Index Table",
};

function mechanismLabel(pkg: ModulePackageOption): string {
  return MECHANISM_LABELS[pkg.modulePackageId] ?? pkg.modulePackageId;
}

/**
 * Friendly names for other (non-motor-sizing) modules that would otherwise
 * show only their raw module id in the flat "Pneumatic Selection" list —
 * the same "UI-layer-only lookup, no manifest field" reasoning as
 * `MECHANISM_LABELS` above. A module id missing from this map falls back to
 * its own id.
 */
const OTHER_MODULE_LABELS: Readonly<Record<string, string>> = {
  "pneumatic-cylinder-sizing": "Pneumatic Cylinder Sizing (load-in, catalog match)",
};

/**
 * `undefined` when `pkg` has no entry in `OTHER_MODULE_LABELS` — the flat
 * "Pneumatic Selection" list keeps its original `id@version (category)`
 * option text for every module that has no friendly name, so this only
 * changes display for modules explicitly opted in above.
 */
function otherModuleLabel(pkg: ModulePackageOption): string | undefined {
  return OTHER_MODULE_LABELS[pkg.modulePackageId];
}

/** A configuration's existing workflow instance, for the optional "attach to workflow" picker. */
export interface WorkflowInstanceOption {
  readonly id: string;
  readonly workflowId: string;
  readonly workflowVersion: string;
}

export interface AddModuleInstanceDialogProps {
  readonly assemblyId: string;
  readonly configurationId: string;
  readonly modulePackages: readonly ModulePackageOption[];
  /** The configuration's own workflow instances, when any exist (Unit 4.9). */
  readonly workflowInstances?: readonly WorkflowInstanceOption[];
  readonly trigger: ReactNode;
}

/**
 * Adds a module instance to an assembly, picked from the real registered
 * module list (`lib/modules`) — never a free-typed id. Unit 3.2. When the
 * configuration has any workflow instances, an optional "Attach to workflow"
 * picker is offered too (Unit 4.9) — how a module instance actually comes to
 * fill a guided workflow's role, reusing `addModuleInstance`'s own existing
 * `workflowInstanceId` input rather than a second, workflow-specific add path.
 */
export function AddModuleInstanceDialog({
  assemblyId,
  configurationId,
  modulePackages,
  workflowInstances = [],
  trigger,
}: AddModuleInstanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    addModuleInstanceAction,
    IDLE_ACTION_STATE,
  );
  const packageId = useId();
  const categoryLabelId = useId();
  const labelId = useId();
  const workflowInstanceId = useId();

  // "Adjusting state during render," not an effect — see rename-dialog.tsx.
  const [seenStatus, setSeenStatus] = useState(state.status);
  if (state.status !== seenStatus) {
    setSeenStatus(state.status);
    if (state.status === "success") {
      setOpen(false);
    }
  }

  // ADR-0011 "Add-module UI flow": motor-sizing.* modules get a first-level
  // category step — "Motor Sizing Tools" as one entry point opening a
  // mechanism picker — instead of sitting inline in the flat module list.
  // Every other registered module (including a future non-motor-sizing,
  // non-hidden category) keeps the original flat picker unchanged, so this
  // stays a generic dialog rendering whatever list it is given, not a
  // motor-sizing-specific component.
  const motorSizingPackages = modulePackages.filter((pkg) =>
    pkg.category.startsWith(MOTOR_SIZING_CATEGORY_PREFIX),
  );
  const otherPackages = modulePackages.filter(
    (pkg) => !pkg.category.startsWith(MOTOR_SIZING_CATEGORY_PREFIX),
  );
  // The "Pneumatic Selection" category is itself split: cylinder-sizing.*
  // packages (pneumatic-cylinder-sizing, guided-cylinder-sizing, and any
  // future SMC cylinder family — dual-rod, table, rodless) render as an
  // image-card grid instead of a plain <select> (screenshot feedback: a
  // bare dropdown of module ids gives no way to tell which real cylinder
  // series each option matches against). Any other non-motor-sizing module
  // that might register later keeps the original flat picker, so this
  // dialog still renders whatever list it is given rather than being
  // hardcoded to today's two families.
  const pneumaticPackages = otherPackages.filter((pkg) =>
    pkg.category.startsWith(PNEUMATIC_CATEGORY_PREFIX),
  );
  const flatOtherPackages = otherPackages.filter(
    (pkg) => !pkg.category.startsWith(PNEUMATIC_CATEGORY_PREFIX),
  );
  const showCategoryStep =
    motorSizingPackages.length > 0 && otherPackages.length > 0;
  const [category, setCategory] = useState<"motor-sizing" | "other">(
    motorSizingPackages.length > 0 ? "motor-sizing" : "other",
  );
  const activePackages =
    category === "motor-sizing" ? motorSizingPackages : otherPackages;
  const usesCardPicker =
    category === "other" &&
    pneumaticPackages.length > 0 &&
    flatOtherPackages.length === 0;

  // Prefills "Instance label" from the selected package (the friendly
  // mechanism name for motor-sizing, the raw id otherwise) so new instances
  // stop defaulting to a blank field a founder has to fill by hand — the
  // gap that left existing instances named after raw ids like
  // "belt-pulley-drive-motor-sizing@0.1.0"
  // (docs/superpowers/specs/2026-08-13-module-instance-management-design.md).
  // Stops auto-filling the moment the founder types their own text, tracked
  // by `labelTouched` rather than by diffing values.
  const [label, setLabel] = useState("");
  const [labelTouched, setLabelTouched] = useState(false);
  // Selected card key for the pneumatic card picker — the flat <select>
  // manages its own value natively, but a card grid has no single form
  // control of its own, so this drives a hidden `modulePackageKey` input.
  const [selectedCardKey, setSelectedCardKey] = useState("");

  function labelForPackage(pkg: ModulePackageOption): string {
    if (category === "motor-sizing") return mechanismLabel(pkg);
    if (usesCardPicker) return pneumaticModuleInfo(pkg).typeName;
    return otherModuleLabel(pkg) ?? pkg.modulePackageId;
  }

  function handlePackageChange(key: string): void {
    const pkg = activePackages.find(
      (candidate) => `${candidate.modulePackageId}@${candidate.moduleVersion}` === key,
    );
    if (pkg !== undefined && !labelTouched) {
      setLabel(labelForPackage(pkg));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setLabel("");
          setLabelTouched(false);
          setSelectedCardKey("");
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <input type="hidden" name="assemblyId" value={assemblyId} />
          <input type="hidden" name="configurationId" value={configurationId} />
          <DialogHeader>
            <DialogTitle>Add module instance</DialogTitle>
            <DialogDescription>
              Pick a registered module package.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {showCategoryStep ? (
              <div className="grid gap-1.5">
                <span
                  id={categoryLabelId}
                  className="text-[13px] font-medium text-text-primary"
                >
                  Module category
                </span>
                <div
                  role="group"
                  aria-labelledby={categoryLabelId}
                  className="flex gap-1.5"
                >
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      category === "motor-sizing" ? "default" : "outline"
                    }
                    aria-pressed={category === "motor-sizing"}
                    onClick={() => {
                      setCategory("motor-sizing");
                      setLabelTouched(false);
                      setLabel("");
                      setSelectedCardKey("");
                    }}
                  >
                    Motor Sizing Tools
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={category === "other" ? "default" : "outline"}
                    aria-pressed={category === "other"}
                    onClick={() => {
                      setCategory("other");
                      setLabelTouched(false);
                      setLabel("");
                      setSelectedCardKey("");
                    }}
                  >
                    Pneumatic Selection
                  </Button>
                </div>
              </div>
            ) : null}
            {usesCardPicker ? (
              <PneumaticModulePicker
                labelId={packageId}
                packages={pneumaticPackages}
                selectedKey={selectedCardKey}
                onSelect={(key) => {
                  setSelectedCardKey(key);
                  handlePackageChange(key);
                }}
              />
            ) : (
              <div className="grid gap-1.5">
                <Label htmlFor={packageId}>
                  {category === "motor-sizing" ? "Mechanism" : "Module package"}
                </Label>
                <select
                  key={category}
                  id={packageId}
                  name="modulePackageKey"
                  required
                  defaultValue=""
                  disabled={activePackages.length === 0}
                  onChange={(event) => handlePackageChange(event.target.value)}
                  className="h-9 rounded-md border border-border-default bg-bg-surface px-3 text-[14px] text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
                >
                  <option value="" disabled>
                    {activePackages.length === 0
                      ? "No modules registered yet"
                      : category === "motor-sizing"
                        ? "Select a mechanism"
                        : "Select a module"}
                  </option>
                  {activePackages.map((pkg) => (
                    <option
                      key={`${pkg.modulePackageId}@${pkg.moduleVersion}`}
                      value={`${pkg.modulePackageId}@${pkg.moduleVersion}`}
                    >
                      {category === "motor-sizing"
                        ? `${mechanismLabel(pkg)} (${pkg.modulePackageId}@${pkg.moduleVersion})`
                        : (otherModuleLabel(pkg) === undefined
                            ? `${pkg.modulePackageId}@${pkg.moduleVersion} (${pkg.category})`
                            : `${otherModuleLabel(pkg)} (${pkg.modulePackageId}@${pkg.moduleVersion})`)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor={labelId}>Instance label</Label>
              <Input
                id={labelId}
                name="label"
                required
                maxLength={200}
                value={label}
                onChange={(event) => {
                  setLabelTouched(true);
                  setLabel(event.target.value);
                }}
              />
            </div>
            {workflowInstances.length > 0 ? (
              <div className="grid gap-1.5">
                <Label htmlFor={workflowInstanceId}>
                  Attach to workflow (optional)
                </Label>
                <select
                  id={workflowInstanceId}
                  name="workflowInstanceId"
                  defaultValue=""
                  className="h-9 rounded-md border border-border-default bg-bg-surface px-3 text-[14px] text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
                >
                  <option value="">None</option>
                  {workflowInstances.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.workflowId}@{workflow.workflowVersion}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {state.status === "error" ? (
              <p
                role="alert"
                className="text-[13px]"
                style={{ color: "var(--state-error)" }}
              >
                {state.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending || modulePackages.length === 0}
            >
              {isPending ? "Adding…" : "Add module"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface PneumaticModulePickerProps {
  readonly labelId: string;
  readonly packages: readonly ModulePackageOption[];
  /** `"{modulePackageId}@{moduleVersion}"`, or `""` when nothing is picked yet. */
  readonly selectedKey: string;
  readonly onSelect: (key: string) => void;
}

/**
 * Card-grid picker for the pneumatic cylinder-sizing modules — replaces the
 * flat `<select>` for this one category so the founder can see which real
 * SMC series each option matches against (type name, series name, and a
 * distinguishing glyph) instead of choosing a bare module id blind. Submits
 * through the same `modulePackageKey` form field the flat picker used, via
 * a hidden input, so `addModuleInstanceAction` needs no changes.
 */
function PneumaticModulePicker({
  labelId,
  packages,
  selectedKey,
  onSelect,
}: PneumaticModulePickerProps) {
  return (
    <div className="grid gap-1.5">
      <Label id={labelId}>Cylinder type</Label>
      <input type="hidden" name="modulePackageKey" value={selectedKey} required />
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="grid grid-cols-2 gap-2"
      >
        {packages.map((pkg) => {
          const key = `${pkg.modulePackageId}@${pkg.moduleVersion}`;
          const info = pneumaticModuleInfo(pkg);
          const selected = key === selectedKey;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(key)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary",
                selected
                  ? "border-accent-primary bg-surface-selected"
                  : "border-border-default bg-bg-surface hover:bg-surface-hover",
              )}
            >
              <info.Glyph
                className={cn(
                  "h-8 w-14",
                  selected ? "text-accent-primary" : "text-text-muted",
                )}
              />
              <div className="grid gap-0.5">
                <span className="text-[14px] font-medium text-text-primary">
                  {info.typeName}
                </span>
                {info.seriesName !== "" ? (
                  <span className="text-[12px] font-mono text-text-muted">
                    {info.seriesName}
                  </span>
                ) : null}
                <span className="text-[12px] text-text-muted">
                  {info.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
