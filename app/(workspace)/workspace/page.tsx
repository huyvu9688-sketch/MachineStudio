import { auth } from "@clerk/nextjs/server";
import {
  loadBomView,
  loadComponentAssignmentView,
  loadBaselineWorkspaceView,
  loadModuleResultView,
  loadModuleWorkspaceView,
  loadRequirementsView,
  loadWorkflowInstanceView,
  loadWorkspaceView,
} from "@/lib/application";
import {
  asMachineConfigurationId,
  asMachineProjectId,
  asModuleInstanceId,
  asUserId,
  asWorkflowInstanceId,
} from "@/lib/db";
import { listModulePackages } from "@/lib/modules";
import { listWorkflowDefinitions } from "@/lib/workflows";
import { marketProfileKey, SOURCE_REGISTRY } from "@/lib/standards";
import { WorkspaceShell } from "@/components/engineering/workspace-shell";
import { summarizeModuleStatuses } from "@/components/engineering/module-status-summary";
import type { MarketProfileOption } from "@/components/engineering/create-project-dialog";
import type { ModulePackageOption } from "@/components/engineering/add-module-instance-dialog";
import type { WorkflowDefinitionOption } from "@/components/engineering/start-workflow-instance-dialog";

interface WorkspacePageProps {
  readonly searchParams: Promise<{
    readonly project?: string;
    readonly configuration?: string;
    readonly module?: string;
    readonly workflow?: string;
    readonly panel?: string;
    readonly before?: string;
    readonly after?: string;
  }>;
}

function marketProfileOptions(): readonly MarketProfileOption[] {
  return SOURCE_REGISTRY.listProfiles().map((profile) => ({
    key: marketProfileKey(profile),
    displayName: profile.displayName,
  }));
}

/**
 * The seven Milestone 4 linear-axis discipline categories (ADR-0011
 * "Existing modules: kept, immutable, hidden from the primary picker"). Their
 * modules and `linear-axis@1` itself stay registered and immutable — this is
 * a route-level "Add module" list filter over an unmodified registry, not a
 * core-engine, module-SDK, or generic-UI change.
 */
const HIDDEN_MODULE_CATEGORIES: ReadonlySet<string> = new Set([
  "motion.axis",
  "motion.profile",
  "screw",
  "guide",
  "coupling",
  "bearing",
  "drive",
]);

/** `linear-axis@1`'s own workflow id, hidden from "Start workflow" the same way. */
const HIDDEN_WORKFLOW_IDS: ReadonlySet<string> = new Set(["linear-axis"]);

function modulePackageOptions(): readonly ModulePackageOption[] {
  return listModulePackages()
    .filter((pkg) => !HIDDEN_MODULE_CATEGORIES.has(pkg.manifest.category))
    .map((pkg) => ({
      modulePackageId: pkg.manifest.id,
      moduleVersion: pkg.manifest.version,
      category: pkg.manifest.category,
    }));
}

function workflowDefinitionOptions(): readonly WorkflowDefinitionOption[] {
  return listWorkflowDefinitions()
    .filter((definition) => !HIDDEN_WORKFLOW_IDS.has(definition.manifest.id))
    .map((definition) => ({
      workflowId: definition.manifest.id,
      workflowVersion: definition.manifest.version,
      title: definition.manifest.title,
    }));
}

/**
 * The workspace shell route (Unit 3.1 read path; Unit 3.2 adds the create/
 * rename/add-module actions). A thin Server Component: authorize, read the
 * `?project=`/`?configuration=` selection, call one application service,
 * and hand the result to `WorkspaceShell` (context/code-standards.md
 * "Next.js"). `loading.tsx`/`error.tsx` in this route segment supply the
 * loading/error states; this file only needs to cover the empty-data state,
 * which is a normal render, not a thrown error.
 */
export default async function WorkspacePage({
  searchParams,
}: WorkspacePageProps) {
  const { userId } = await auth.protect();
  const params = await searchParams;

  const view = await loadWorkspaceView(
    asUserId(userId),
    params.project ? asMachineProjectId(params.project) : undefined,
  );

  const marketProfiles = marketProfileOptions();
  const modulePackages = modulePackageOptions();
  const workflowDefinitions = workflowDefinitionOptions();

  if (view.selectedProject === null) {
    return (
      <WorkspaceShell
        status="empty"
        marketProfiles={marketProfiles}
        modulePackages={modulePackages}
        workflowDefinitions={workflowDefinitions}
      />
    );
  }

  const selectedConfiguration =
    view.selectedProject.configurations.find(
      (configuration) => configuration.id === params.configuration,
    ) ??
    view.selectedProject.configurations[0] ??
    null;

  const moduleWorkspace = params.module
    ? await loadModuleWorkspaceView(
        asModuleInstanceId(params.module),
        asUserId(userId),
      )
    : null;
  const moduleResult = params.module
    ? await loadModuleResultView(
        asModuleInstanceId(params.module),
        asUserId(userId),
      )
    : null;
  const componentAssignment = params.module
    ? await loadComponentAssignmentView(
        asModuleInstanceId(params.module),
        asUserId(userId),
      )
    : null;
  const workflowInstanceResult = params.workflow
    ? await loadWorkflowInstanceView(
        asWorkflowInstanceId(params.workflow),
        asUserId(userId),
      )
    : null;
  // `unauthorized` (not found, or owned by someone else) and
  // `workflow_not_found` (its definition was since unregistered) both fall
  // back to "nothing selected" here, the same treatment every other nullable
  // deep-link view in this file already gets — no distinct error UI exists
  // for a deep link a user could only reach by guessing or a stale bookmark.
  const workflowInstance =
    workflowInstanceResult?.ok === true ? workflowInstanceResult.view : null;
  // A module deep link owns the main canvas over a workflow deep link, which
  // itself owns the canvas over a static panel — `WorkspaceShell` applies the
  // same precedence when choosing what to render.
  const selectedPanel =
    params.module || workflowInstance !== null ? undefined : params.panel;
  const requirements =
    selectedPanel === "requirements" && selectedConfiguration !== null
      ? await loadRequirementsView(
          asMachineConfigurationId(selectedConfiguration.id),
          asUserId(userId),
        )
      : null;
  const baselines =
    selectedPanel === "baselines" && selectedConfiguration !== null
      ? await loadBaselineWorkspaceView(
          asMachineConfigurationId(selectedConfiguration.id),
          asUserId(userId),
          params.before,
          params.after,
        )
      : null;
  const bom =
    selectedPanel === "bom" && selectedConfiguration !== null
      ? await loadBomView(
          asMachineConfigurationId(selectedConfiguration.id),
          asUserId(userId),
        )
      : null;

  return (
    <WorkspaceShell
      status="loaded"
      projects={view.projects}
      selectedProject={view.selectedProject}
      selectedConfigurationId={selectedConfiguration?.id ?? null}
      selectedModuleInstanceId={moduleWorkspace?.moduleInstance.id ?? null}
      selectedWorkflowInstanceId={workflowInstance?.workflowInstance.id ?? null}
      moduleWorkspace={moduleWorkspace}
      moduleResult={moduleResult}
      componentAssignment={componentAssignment}
      requirements={requirements}
      baselines={baselines}
      bom={bom}
      workflowInstance={workflowInstance}
      summary={summarizeModuleStatuses(selectedConfiguration?.assemblies ?? [])}
      marketProfiles={marketProfiles}
      modulePackages={modulePackages}
      workflowDefinitions={workflowDefinitions}
    />
  );
}
