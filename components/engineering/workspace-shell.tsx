"use client";

import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { AppBar } from "./app-bar";
import { ContextActionBar } from "./context-action-bar";
import { MachineNavigator } from "./machine-navigator";
import { WorkspaceCanvas } from "./workspace-canvas";
import { ModuleInputWorkspace } from "./module-input-workspace";
import { ModuleResultPanel } from "./module-result-panel";
import { ComponentAssignmentPanel } from "./component-assignment-panel";
import { BaselineWorkspace } from "./baseline-workspace";
import { RequirementsWorkspace } from "./requirements-workspace";
import { WorkflowInstanceWorkspace } from "./workflow-instance-workspace";
import { BomWorkspace } from "./bom-workspace";
import { StatusBar } from "./status-bar";
import { EmptyState } from "./empty-state";
import {
  CreateProjectDialog,
  type MarketProfileOption,
} from "./create-project-dialog";
import type { ModulePackageOption } from "./add-module-instance-dialog";
import type { WorkflowDefinitionOption } from "./start-workflow-instance-dialog";
import type { ModuleStatusSummary } from "./module-status-summary";
import type { MachineProjectRecord, ProjectTree } from "@/lib/db";
import type {
  BomView,
  ComponentAssignmentPanelView,
  BaselineWorkspaceView,
  ModulePreviewView,
  ModuleResultView,
  ModuleWorkspaceView,
  RequirementsView,
  WorkflowInstanceView,
} from "@/lib/application";
import { cn } from "@/lib/utils";

export type WorkspaceShellProps = {
  readonly marketProfiles: readonly MarketProfileOption[];
  readonly modulePackages: readonly ModulePackageOption[];
  readonly workflowDefinitions: readonly WorkflowDefinitionOption[];
} & (
  | { readonly status: "empty" }
  | {
      readonly status: "loaded";
      readonly projects: readonly MachineProjectRecord[];
      readonly selectedProject: ProjectTree;
      readonly selectedConfigurationId: string | null;
      readonly selectedModuleInstanceId: string | null;
      readonly selectedWorkflowInstanceId: string | null;
      readonly moduleWorkspace: ModuleWorkspaceView | null;
      readonly moduleResult: ModuleResultView | null;
      readonly componentAssignment: ComponentAssignmentPanelView | null;
      readonly requirements: RequirementsView | null;
      readonly baselines: BaselineWorkspaceView | null;
      readonly bom: BomView | null;
      readonly workflowInstance: WorkflowInstanceView | null;
      readonly summary: ModuleStatusSummary;
    }
);

/**
 * The workspace application shell (Unit 3.1 read-only shell; Unit 3.2 adds
 * the create/rename/add-module actions; context/ui-context.md "Application
 * Shell"): app bar, context action bar, collapsible machine navigator, main
 * canvas, and status bar. Composes only — data comes in as props from the
 * Server Component page (app/(workspace)/workspace/page.tsx); this file owns
 * purely client-side interaction (navigator collapse, dropdown pickers).
 *
 * The `status` union mirrors `WorkspaceView` (lib/application/projects/
 * load-workspace-view.ts): "empty" is the owner-has-no-projects case, kept
 * as its own branch instead of nullable fields so no non-null assertion is
 * needed to use `selectedProject` in the "loaded" branch. `marketProfiles`/
 * `modulePackages` sit outside that union — both dialogs that need them
 * (`CreateProjectDialog`, `AddModuleInstanceDialog`) can appear from the
 * "empty" state too (creating the very first project).
 */
export function WorkspaceShell(props: WorkspaceShellProps) {
  const [navigatorCollapsed, setNavigatorCollapsed] = useState(false);
  const [preview, setPreview] = useState<ModulePreviewView | null>(null);

  // A preview belongs to one module instance's current form. Selecting a
  // different module (or navigating away and back) must not carry a stale
  // preview over onto whatever renders next — the same "adjust state during
  // render when a prop changes" pattern DeleteModuleInstanceDialog already
  // uses for its own seenStatus tracking.
  const selectedModuleInstanceId =
    props.status === "loaded" ? props.selectedModuleInstanceId : null;
  const [seenModuleInstanceId, setSeenModuleInstanceId] = useState(
    selectedModuleInstanceId,
  );
  if (selectedModuleInstanceId !== seenModuleInstanceId) {
    setSeenModuleInstanceId(selectedModuleInstanceId);
    setPreview(null);
  }

  const selectedConfiguration =
    props.status === "loaded"
      ? (props.selectedProject.configurations.find(
          (configuration) => configuration.id === props.selectedConfigurationId,
        ) ?? null)
      : null;

  return (
    <div className="flex h-screen flex-col bg-bg-base">
      <AppBar
        projects={props.status === "loaded" ? props.projects : []}
        selectedProject={
          props.status === "loaded" ? props.selectedProject : null
        }
        selectedConfigurationId={
          props.status === "loaded" ? props.selectedConfigurationId : null
        }
        marketProfiles={props.marketProfiles}
        navigatorCollapsed={navigatorCollapsed}
        onToggleNavigator={() =>
          setNavigatorCollapsed((collapsed) => !collapsed)
        }
      />
      <ContextActionBar
        projectName={
          props.status === "loaded" ? props.selectedProject.name : null
        }
        configurationName={selectedConfiguration?.name ?? null}
      />

      <div className="flex min-h-0 flex-1">
        {navigatorCollapsed ? null : (
          <div className="w-[280px] shrink-0 overflow-hidden border-r border-border-default bg-bg-surface">
            {props.status === "empty" ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-4 py-8 text-center">
                <EmptyState
                  compact
                  icon={FolderOpen}
                  title="No machine projects yet"
                />
                <CreateProjectDialog marketProfiles={props.marketProfiles} />
              </div>
            ) : (
              <MachineNavigator
                projectId={props.selectedProject.id}
                projectName={props.selectedProject.name}
                configuration={selectedConfiguration}
                modulePackages={props.modulePackages}
                workflowDefinitions={props.workflowDefinitions}
                selectedModuleInstanceId={
                  props.status === "loaded"
                    ? props.selectedModuleInstanceId
                    : null
                }
                selectedWorkflowInstanceId={
                  props.status === "loaded"
                    ? props.selectedWorkflowInstanceId
                    : null
                }
                selectedPanel={
                  props.status === "loaded" && props.requirements !== null
                    ? "requirements"
                    : props.status === "loaded" && props.baselines !== null
                      ? "baselines"
                      : props.status === "loaded" && props.bom !== null
                        ? "bom"
                        : null
                }
              />
            )}
          </div>
        )}

        <main
          className={cn(
            "flex min-w-0 flex-1 overflow-y-auto",
            (props.status === "loaded" && props.moduleWorkspace !== null) ||
              (props.status === "loaded" && props.workflowInstance !== null) ||
              (props.status === "loaded" && props.requirements !== null) ||
              (props.status === "loaded" && props.baselines !== null) ||
              (props.status === "loaded" && props.bom !== null)
              ? "items-start justify-start"
              : "items-center justify-center",
          )}
        >
          {props.status === "loaded" && props.moduleWorkspace !== null ? (
            <div className="flex w-full flex-col">
              <ModuleInputWorkspace
                view={props.moduleWorkspace}
                onPreviewChange={setPreview}
              />
              {props.moduleResult !== null ? (
                <ModuleResultPanel view={props.moduleResult} preview={preview} />
              ) : null}
              {props.componentAssignment !== null ? (
                <ComponentAssignmentPanel view={props.componentAssignment} />
              ) : null}
            </div>
          ) : props.status === "loaded" && props.workflowInstance !== null ? (
            <WorkflowInstanceWorkspace
              view={props.workflowInstance}
              projectId={props.selectedProject.id}
            />
          ) : props.status === "loaded" && props.requirements !== null ? (
            <RequirementsWorkspace
              view={props.requirements}
              assemblies={selectedConfiguration?.assemblies ?? []}
            />
          ) : props.status === "loaded" && props.baselines !== null ? (
            <BaselineWorkspace view={props.baselines} />
          ) : props.status === "loaded" && props.bom !== null ? (
            <BomWorkspace view={props.bom} />
          ) : (
            <WorkspaceCanvas
              hasProjects={props.status === "loaded"}
              hasConfigurations={
                props.status === "loaded" &&
                props.selectedProject.configurations.length > 0
              }
              hasContent={
                selectedConfiguration !== null &&
                (selectedConfiguration.assemblies.length > 0 ||
                  selectedConfiguration.workflowInstances.length > 0)
              }
              marketProfiles={props.marketProfiles}
              configurationId={selectedConfiguration?.id ?? null}
            />
          )}
        </main>
      </div>

      <StatusBar
        marketProfileKey={
          props.status === "loaded"
            ? props.selectedProject.marketProfileKey
            : null
        }
        summary={props.status === "loaded" ? props.summary : null}
      />
    </div>
  );
}
