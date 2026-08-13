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

export interface ModulePackageOption {
  readonly modulePackageId: string;
  readonly moduleVersion: string;
  readonly category: string;
}

const MOTOR_SIZING_CATEGORY_PREFIX = "motor-sizing.";

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
  const showCategoryStep =
    motorSizingPackages.length > 0 && otherPackages.length > 0;
  const [category, setCategory] = useState<"motor-sizing" | "other">(
    motorSizingPackages.length > 0 ? "motor-sizing" : "other",
  );
  const activePackages =
    category === "motor-sizing" ? motorSizingPackages : otherPackages;

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

  function handlePackageChange(key: string): void {
    const pkg = activePackages.find(
      (candidate) => `${candidate.modulePackageId}@${candidate.moduleVersion}` === key,
    );
    if (pkg !== undefined && !labelTouched) {
      setLabel(category === "motor-sizing" ? mechanismLabel(pkg) : pkg.modulePackageId);
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
                    }}
                  >
                    Other modules
                  </Button>
                </div>
              </div>
            ) : null}
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
                      : `${pkg.modulePackageId}@${pkg.moduleVersion} (${pkg.category})`}
                  </option>
                ))}
              </select>
            </div>
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
