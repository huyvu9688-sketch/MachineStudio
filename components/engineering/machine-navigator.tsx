"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ChevronRight,
  FileText,
  Folder,
  GitBranch,
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
import { AddModuleInstanceDialog, type ModulePackageOption } from "./add-module-instance-dialog";
import { RenameDialog } from "./rename-dialog";
import { renameAssemblyAction } from "@/app/(workspace)/workspace/actions";
import { cn } from "@/lib/utils";
import type { AssemblyNode, ConfigurationNode, ModuleInstanceRecord } from "@/lib/db";

export interface MachineNavigatorProps {
  readonly projectName: string;
  readonly configuration: ConfigurationNode | null;
  readonly modulePackages: readonly ModulePackageOption[];
  /** The module instance the `?module=` deep link currently selects, if any. */
  readonly selectedModuleInstanceId: string | null;
}

/**
 * The 280px machine navigator (context/ui-context.md "Application Shell":
 * "machine, assemblies, workflows, modules, requirements, BOM, and
 * reports"). Assembly rows are interactive (real expand/collapse, plus
 * add-sub-assembly/add-module/rename actions, Unit 3.2); module rows and the
 * Requirements/BOM/Reports section stay informational only, since nothing
 * they would open exists yet (Units 3.6/3.7, Milestone 5).
 */
export function MachineNavigator({
  projectName,
  configuration,
  modulePackages,
  selectedModuleInstanceId,
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
                <p className="px-3 py-1.5 text-[12px] text-text-muted">No assemblies yet.</p>
              ) : (
                configuration.assemblies.map((assembly) => (
                  <AssemblyRow
                    key={assembly.id}
                    assembly={assembly}
                    modulePackages={modulePackages}
                    projectId={configuration.projectId}
                    selectedModuleInstanceId={selectedModuleInstanceId}
                  />
                ))
              )}
            </Section>

            <Section label="Workflows">
              {configuration.workflowInstances.length === 0 ? (
                <p className="px-3 py-1.5 text-[12px] text-text-muted">No workflows yet.</p>
              ) : (
                configuration.workflowInstances.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-text-primary"
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
                  </div>
                ))
              )}
            </Section>
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-border-default py-1.5">
        <StaticRow icon={ListChecks} label="Requirements" />
        <StaticRow icon={Layers} label="BOM" />
        <StaticRow icon={FileText} label="Reports" />
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

function StaticRow({ icon: Icon, label }: { readonly icon: LucideIcon; readonly label: string }) {
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
 */
function IconButton({ icon: Icon, label }: { readonly icon: LucideIcon; readonly label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors duration-150 ease-out hover:bg-surface-selected hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
    </button>
  );
}

function AssemblyRow({
  assembly,
  modulePackages,
  projectId,
  selectedModuleInstanceId,
}: {
  readonly assembly: AssemblyNode;
  readonly modulePackages: readonly ModulePackageOption[];
  readonly projectId: string;
  readonly selectedModuleInstanceId: string | null;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = assembly.children.length > 0 || assembly.moduleInstances.length > 0;

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
          <Folder aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" />
          <span className="truncate">{assembly.name}</span>
        </CollapsibleTrigger>

        <div className="flex shrink-0 items-center gap-0.5">
          <CreateAssemblyDialog
            configurationId={assembly.configurationId}
            parentId={assembly.id}
            trigger={<IconButton icon={Plus} label={`Add sub-assembly to ${assembly.name}`} />}
          />
          <AddModuleInstanceDialog
            assemblyId={assembly.id}
            configurationId={assembly.configurationId}
            modulePackages={modulePackages}
            trigger={<IconButton icon={PackagePlus} label={`Add module to ${assembly.name}`} />}
          />
          <RenameDialog
            title="Rename assembly"
            action={renameAssemblyAction}
            idFieldName="assemblyId"
            idValue={assembly.id}
            currentName={assembly.name}
            trigger={<IconButton icon={Pencil} label={`Rename ${assembly.name}`} />}
          />
        </div>
      </div>

      {hasChildren ? (
        <CollapsibleContent className="ml-3.5 overflow-hidden border-l border-border-default pl-2">
          {assembly.moduleInstances.map((moduleInstance) => (
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
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-text-primary",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary",
        selected ? "bg-surface-selected" : "hover:bg-surface-hover",
      )}
    >
      <Boxes aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-text-muted" />
      <StatusBadge status={moduleInstance.lastRunStatus ?? "not_configured"} iconOnly />
      <span className="truncate">{moduleInstance.label}</span>
    </Link>
  );
}
