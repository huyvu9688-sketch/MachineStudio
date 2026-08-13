"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  Boxes,
  ChevronRight,
  FileText,
  Folder,
  GitBranch,
  GitCompareArrows,
  Layers,
  ListChecks,
  PackagePlus,
  Pencil,
  Plus,
  type LucideIcon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EmptyState } from "./empty-state";
import { StatusBadge } from "./status-badge";
import { CreateAssemblyDialog } from "./create-assembly-dialog";
import {
  AddModuleInstanceDialog,
  type ModulePackageOption,
} from "./add-module-instance-dialog";
import {
  StartWorkflowInstanceDialog,
  type WorkflowDefinitionOption,
} from "./start-workflow-instance-dialog";
import { RenameDialog } from "./rename-dialog";
import { ArchiveModuleInstanceDialog } from "./archive-module-instance-dialog";
import {
  renameAssemblyAction,
  renameModuleInstanceAction,
} from "@/app/(workspace)/workspace/actions";
import { cn } from "@/lib/utils";
import type {
  AssemblyNode,
  ConfigurationNode,
  ModuleInstanceRecord,
  WorkflowInstanceRecord,
} from "@/lib/db";

export interface MachineNavigatorProps {
  readonly projectId: string;
  readonly projectName: string;
  readonly configuration: ConfigurationNode | null;
  readonly modulePackages: readonly ModulePackageOption[];
  readonly workflowDefinitions: readonly WorkflowDefinitionOption[];
  /** The module instance the `?module=` deep link currently selects, if any. */
  readonly selectedModuleInstanceId: string | null;
  /** The workflow instance the `?workflow=` deep link currently selects, if any. */
  readonly selectedWorkflowInstanceId: string | null;
  /** The static-row panel the `?panel=` deep link currently selects, if any. */
  readonly selectedPanel: "requirements" | "baselines" | "bom" | null;
}

/**
 * The 280px machine navigator (context/ui-context.md "Application Shell":
 * "machine, assemblies, workflows, modules, requirements, BOM, and
 * reports"). Assembly rows are interactive (real expand/collapse, plus
 * add-sub-assembly/add-module/rename actions, Unit 3.2); module rows are
 * real deep links (Unit 3.3). Requirements and Baselines are configuration
 * deep links (Units 3.7 and 3.8); BOM/Reports stay informational only, since
 * nothing they would open exists yet (Milestone 5).
 */
export function MachineNavigator({
  projectId,
  projectName,
  configuration,
  modulePackages,
  workflowDefinitions,
  selectedModuleInstanceId,
  selectedWorkflowInstanceId,
  selectedPanel,
}: MachineNavigatorProps) {
  return (
    <nav aria-label="Machine navigator" className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border-default px-3 py-2.5">
        <p
          className="truncate text-[13px] font-semibold text-text-primary"
          title={projectName}
        >
          {projectName}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {configuration === null ? (
          <EmptyState
            compact
            icon={Folder}
            title="No configurations yet"
            description="This project doesn't have a configuration yet."
          />
        ) : (
          <>
            <Section
              label="Assemblies"
              action={
                <CreateAssemblyDialog
                  configurationId={configuration.id}
                  trigger={<IconButton icon={Plus} label="Add root assembly" />}
                />
              }
            >
              {configuration.assemblies.length === 0 ? (
                <p className="px-3 py-1.5 text-[12px] text-text-muted">
                  No assemblies yet.
                </p>
              ) : (
                configuration.assemblies.map((assembly) => (
                  <AssemblyRow
                    key={assembly.id}
                    assembly={assembly}
                    modulePackages={modulePackages}
                    workflowInstances={configuration.workflowInstances}
                    projectId={configuration.projectId}
                    selectedModuleInstanceId={selectedModuleInstanceId}
                  />
                ))
              )}
            </Section>

            <Section
              label="Workflows"
              action={
                <StartWorkflowInstanceDialog
                  projectId={projectId}
                  configurationId={configuration.id}
                  workflowDefinitions={workflowDefinitions}
                  trigger={<IconButton icon={Plus} label="Start workflow" />}
                />
              }
            >
              {configuration.workflowInstances.length === 0 ? (
                <p className="px-3 py-1.5 text-[12px] text-text-muted">
                  No workflows yet.
                </p>
              ) : (
                configuration.workflowInstances.map((workflow) => (
                  <WorkflowRow
                    key={workflow.id}
                    workflow={workflow}
                    projectId={projectId}
                    selected={workflow.id === selectedWorkflowInstanceId}
                  />
                ))
              )}
            </Section>
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-border-default py-1.5">
        {configuration === null ? (
          <>
            <StaticRow icon={ListChecks} label="Requirements" />
            <StaticRow icon={GitCompareArrows} label="Baselines" />
            <StaticRow icon={Layers} label="BOM" />
            <StaticRow icon={FileText} label="Machine report" />
          </>
        ) : (
          <>
            <RequirementsRow
              projectId={configuration.projectId}
              configurationId={configuration.id}
              selected={selectedPanel === "requirements"}
            />
            <BaselinesRow
              projectId={configuration.projectId}
              configurationId={configuration.id}
              selected={selectedPanel === "baselines"}
            />
            <BomRow
              projectId={configuration.projectId}
              configurationId={configuration.id}
              selected={selectedPanel === "bom"}
            />
            <MachineReportRow configurationId={configuration.id} />
          </>
        )}
      </div>
    </nav>
  );
}

function Section({
  label,
  action,
  children,
}: {
  readonly label: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <div className="mb-1">
      <div className="flex items-center justify-between px-3 py-1">
        <p className="text-[11px] font-semibold tracking-wide text-text-muted uppercase">
          {label}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

function StaticRow({
  icon: Icon,
  label,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
}) {
  return (
    <div
      className="flex cursor-not-allowed items-center gap-2 px-3 py-1.5 text-[13px] text-text-muted/50"
      aria-disabled="true"
      title={`${label} is not available yet.`}
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      {label}
    </div>
  );
}

/**
 * A small (24px) icon-only action button used for per-row navigator actions.
 * A real `<button>`, not a styled `<span>` — Enter/Space activation is
 * native to `<button>` and would not fire on a `role="button"` span without
 * hand-rolling key handlers (ui-context.md "Interaction States":
 * keyboard-first, every action reachable by keyboard).
 *
 * Every call site passes this as a Dialog's `trigger` prop (`asChild`, e.g.
 * `<CreateAssemblyDialog trigger={<IconButton .../>} />`). Radix's
 * `DialogTrigger asChild` clones extra props — `onClick`, `aria-expanded`,
 * `aria-haspopup`, `data-state`, `ref` — onto whatever element it is given.
 * Because `<IconButton .../>` is a *custom component* element (not a raw
 * `<button>`), those cloned props land on `IconButton`'s own props object,
 * not on the DOM node, unless `IconButton` explicitly forwards them — which
 * an earlier version of this function did not do, silently dropping
 * `onClick` and leaving every one of these buttons inert (a real bug this
 * project's own component tests never caught, since they only asserted the
 * buttons existed, not that clicking one actually opened its dialog).
 */
function IconButton({
  icon: Icon,
  label,
  ref,
  ...rest
}: {
  readonly icon: LucideIcon;
  readonly label: string;
} & ComponentProps<"button">) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors duration-150 ease-out hover:bg-surface-selected hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
      {...rest}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
    </button>
  );
}

/**
 * The `<a>` counterpart to {@link IconButton} — a real 24px icon-only action
 * that navigates (here, opens a Unit 5.2 printable report at `href` in a new
 * tab) rather than triggering a Dialog, so it must be a link, not a button.
 */
function IconLinkButton({
  icon: Icon,
  label,
  href,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors duration-150 ease-out hover:bg-surface-selected hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
    </a>
  );
}

function AssemblyRow({
  assembly,
  modulePackages,
  workflowInstances,
  projectId,
  selectedModuleInstanceId,
}: {
  readonly assembly: AssemblyNode;
  readonly modulePackages: readonly ModulePackageOption[];
  readonly workflowInstances: readonly WorkflowInstanceRecord[];
  readonly projectId: string;
  readonly selectedModuleInstanceId: string | null;
}) {
  const [open, setOpen] = useState(true);
  // Archived instances are hidden here, not filtered out of the read model
  // — a UI-layer filter, the same "hide without deleting or reshaping the
  // repository read" precedent ADR-0011 already established for hiding the
  // linear-axis discipline categories from the module picker.
  const visibleModuleInstances = assembly.moduleInstances.filter(
    (moduleInstance) => moduleInstance.archivedAt === null,
  );
  const hasChildren =
    assembly.children.length > 0 || visibleModuleInstances.length > 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-0.5 rounded-md pr-1 hover:bg-surface-hover">
        <CollapsibleTrigger
          disabled={!hasChildren}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[13px] text-text-primary",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary",
            "disabled:cursor-default",
          )}
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-150 ease-out",
              open && "rotate-90",
              !hasChildren && "invisible",
            )}
          />
          <Folder
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-text-muted"
          />
          <span className="truncate">{assembly.name}</span>
        </CollapsibleTrigger>

        <div className="flex shrink-0 items-center gap-0.5">
          <CreateAssemblyDialog
            configurationId={assembly.configurationId}
            parentId={assembly.id}
            trigger={
              <IconButton
                icon={Plus}
                label={`Add sub-assembly to ${assembly.name}`}
              />
            }
          />
          <AddModuleInstanceDialog
            assemblyId={assembly.id}
            configurationId={assembly.configurationId}
            modulePackages={modulePackages}
            workflowInstances={workflowInstances.map((workflow) => ({
              id: workflow.id,
              workflowId: workflow.workflowId,
              workflowVersion: workflow.workflowVersion,
            }))}
            trigger={
              <IconButton
                icon={PackagePlus}
                label={`Add module to ${assembly.name}`}
              />
            }
          />
          <RenameDialog
            title="Rename assembly"
            action={renameAssemblyAction}
            idFieldName="assemblyId"
            idValue={assembly.id}
            currentName={assembly.name}
            trigger={
              <IconButton icon={Pencil} label={`Rename ${assembly.name}`} />
            }
          />
          <IconLinkButton
            icon={FileText}
            label={`Open report for ${assembly.name}`}
            href={`/workspace/report?assembly=${encodeURIComponent(assembly.id)}`}
          />
        </div>
      </div>

      {hasChildren ? (
        <CollapsibleContent className="ml-3.5 overflow-hidden border-l border-border-default pl-2">
          {visibleModuleInstances.map((moduleInstance) => (
            <ModuleRow
              key={moduleInstance.id}
              moduleInstance={moduleInstance}
              projectId={projectId}
              selected={moduleInstance.id === selectedModuleInstanceId}
            />
          ))}
          {assembly.children.map((child) => (
            <AssemblyRow
              key={child.id}
              assembly={child}
              modulePackages={modulePackages}
              workflowInstances={workflowInstances}
              projectId={projectId}
              selectedModuleInstanceId={selectedModuleInstanceId}
            />
          ))}
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  );
}

/**
 * The Requirements row — a real deep link to `?...&panel=requirements`,
 * opening Unit 3.7's `RequirementsWorkspace` in the main canvas. Same
 * deep-linkable pattern as `ModuleRow` below and the project/configuration
 * pickers (`app-bar.tsx`).
 */
function RequirementsRow({
  projectId,
  configurationId,
  selected,
}: {
  readonly projectId: string;
  readonly configurationId: string;
  readonly selected: boolean;
}) {
  const pathname = usePathname();
  const href = `${pathname}?project=${encodeURIComponent(projectId)}&configuration=${encodeURIComponent(configurationId)}&panel=requirements`;

  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-[13px] text-text-primary",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary",
        selected ? "bg-surface-selected" : "hover:bg-surface-hover",
      )}
    >
      <ListChecks
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-text-muted"
      />
      Requirements
    </Link>
  );
}

/** A configuration-level deep link to Unit 3.8's immutable baseline workspace. */
function BaselinesRow({
  projectId,
  configurationId,
  selected,
}: {
  readonly projectId: string;
  readonly configurationId: string;
  readonly selected: boolean;
}) {
  const pathname = usePathname();
  const href = `${pathname}?project=${encodeURIComponent(projectId)}&configuration=${encodeURIComponent(configurationId)}&panel=baselines`;

  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-[13px] text-text-primary",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary",
        selected ? "bg-surface-selected" : "hover:bg-surface-hover",
      )}
    >
      <GitCompareArrows
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-text-muted"
      />
      Baselines
    </Link>
  );
}

/** A configuration-level deep link to Unit 5.1's generic BOM workspace. */
function BomRow({
  projectId,
  configurationId,
  selected,
}: {
  readonly projectId: string;
  readonly configurationId: string;
  readonly selected: boolean;
}) {
  const pathname = usePathname();
  const href = `${pathname}?project=${encodeURIComponent(projectId)}&configuration=${encodeURIComponent(configurationId)}&panel=bom`;

  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-[13px] text-text-primary",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary",
        selected ? "bg-surface-selected" : "hover:bg-surface-hover",
      )}
    >
      <Layers aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" />
      BOM
    </Link>
  );
}

/**
 * A configuration-level report row (Unit 5.3) — opens
 * `/workspace/report?configuration=<id>` (the whole-machine calculation
 * package) in a new tab, mirroring the per-assembly `IconLinkButton`'s own
 * "opens a real URL, not a `?panel=` deep link" behavior rather than
 * `BomRow`'s in-app navigation: a report is a printable document, not a
 * workspace panel.
 */
function MachineReportRow({ configurationId }: { readonly configurationId: string }) {
  return (
    <a
      href={`/workspace/report?configuration=${encodeURIComponent(configurationId)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-text-primary hover:bg-surface-hover"
    >
      <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" />
      Machine report
    </a>
  );
}

/**
 * A module instance row — a real deep link to `?...&module=<id>`, opening
 * Unit 3.3's generic input renderer (`ModuleInputWorkspace`) in the main
 * canvas. Deep-linkable and reload-safe like the project/configuration
 * pickers (`app-bar.tsx`), not client-only selection state.
 */
function ModuleRow({
  moduleInstance,
  projectId,
  selected,
}: {
  readonly moduleInstance: ModuleInstanceRecord;
  readonly projectId: string;
  readonly selected: boolean;
}) {
  const pathname = usePathname();
  const href = `${pathname}?project=${encodeURIComponent(projectId)}&configuration=${encodeURIComponent(moduleInstance.configurationId)}&module=${encodeURIComponent(moduleInstance.id)}`;

  return (
    <div className="flex items-center gap-0.5 rounded-md pr-1 hover:bg-surface-hover">
      <Link
        href={href}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-text-primary",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary",
          selected && "bg-surface-selected",
        )}
      >
        <Boxes
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-text-muted"
        />
        <StatusBadge
          status={moduleInstance.lastRunStatus ?? "not_configured"}
          iconOnly
        />
        <span className="truncate">{moduleInstance.label}</span>
      </Link>

      <div className="flex shrink-0 items-center gap-0.5">
        <RenameDialog
          title="Rename module"
          action={renameModuleInstanceAction}
          idFieldName="moduleInstanceId"
          idValue={moduleInstance.id}
          currentName={moduleInstance.label}
          trigger={
            <IconButton icon={Pencil} label={`Rename ${moduleInstance.label}`} />
          }
        />
        <ArchiveModuleInstanceDialog
          moduleInstanceId={moduleInstance.id}
          moduleInstanceLabel={moduleInstance.label}
          trigger={
            <IconButton icon={Archive} label={`Archive ${moduleInstance.label}`} />
          }
        />
      </div>
    </div>
  );
}

/**
 * A workflow instance row — a real deep link to `?...&workflow=<id>`,
 * opening Unit 4.9's generic `WorkflowInstanceWorkspace` in the main canvas.
 * Deep-linkable and reload-safe, mirroring `ModuleRow`'s own convention one
 * level up (a workflow instance, not a module instance).
 */
function WorkflowRow({
  workflow,
  projectId,
  selected,
}: {
  readonly workflow: WorkflowInstanceRecord;
  readonly projectId: string;
  readonly selected: boolean;
}) {
  const pathname = usePathname();
  const href = `${pathname}?project=${encodeURIComponent(projectId)}&configuration=${encodeURIComponent(workflow.configurationId)}&workflow=${encodeURIComponent(workflow.id)}`;

  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] text-text-primary",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary",
        selected ? "bg-surface-selected" : "hover:bg-surface-hover",
      )}
    >
      <GitBranch
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-text-muted"
      />
      <span className="truncate font-mono text-[12px]">
        {workflow.workflowId}@{workflow.workflowVersion}
      </span>
      <span className="ml-auto shrink-0 rounded-md border border-border-default px-1.5 py-0.5 text-[11px] font-medium text-text-muted capitalize">
        {workflow.status}
      </span>
    </Link>
  );
}
