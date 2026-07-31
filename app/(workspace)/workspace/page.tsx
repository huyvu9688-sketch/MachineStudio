import { auth } from "@clerk/nextjs/server";
import {
  loadComponentAssignmentView,
  loadModuleResultView,
  loadModuleWorkspaceView,
  loadWorkspaceView,
} from "@/lib/application";
import { asMachineProjectId, asModuleInstanceId, asUserId } from "@/lib/db";
import { listModulePackages } from "@/lib/modules";
import { marketProfileKey, SOURCE_REGISTRY } from "@/lib/standards";
import { WorkspaceShell } from "@/components/engineering/workspace-shell";
import { summarizeModuleStatuses } from "@/components/engineering/module-status-summary";
import type { MarketProfileOption } from "@/components/engineering/create-project-dialog";
import type { ModulePackageOption } from "@/components/engineering/add-module-instance-dialog";

interface WorkspacePageProps {
  readonly searchParams: Promise<{
    readonly project?: string;
    readonly configuration?: string;
    readonly module?: string;
  }>;
}

function marketProfileOptions(): readonly MarketProfileOption[] {
  return SOURCE_REGISTRY.listProfiles().map((profile) => ({
    key: marketProfileKey(profile),
    displayName: profile.displayName,
  }));
}

function modulePackageOptions(): readonly ModulePackageOption[] {
  return listModulePackages().map((pkg) => ({
    modulePackageId: pkg.manifest.id,
    moduleVersion: pkg.manifest.version,
    category: pkg.manifest.category,
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
export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const { userId } = await auth.protect();
  const params = await searchParams;

  const view = await loadWorkspaceView(
    asUserId(userId),
    params.project ? asMachineProjectId(params.project) : undefined,
  );

  const marketProfiles = marketProfileOptions();
  const modulePackages = modulePackageOptions();

  if (view.selectedProject === null) {
    return <WorkspaceShell status="empty" marketProfiles={marketProfiles} modulePackages={modulePackages} />;
  }

  const selectedConfiguration =
    view.selectedProject.configurations.find(
      (configuration) => configuration.id === params.configuration,
    ) ??
    view.selectedProject.configurations[0] ??
    null;

  const moduleWorkspace = params.module
    ? await loadModuleWorkspaceView(asModuleInstanceId(params.module), asUserId(userId))
    : null;
  const moduleResult = params.module
    ? await loadModuleResultView(asModuleInstanceId(params.module), asUserId(userId))
    : null;
  const componentAssignment = params.module
    ? await loadComponentAssignmentView(asModuleInstanceId(params.module), asUserId(userId))
    : null;

  return (
    <WorkspaceShell
      status="loaded"
      projects={view.projects}
      selectedProject={view.selectedProject}
      selectedConfigurationId={selectedConfiguration?.id ?? null}
      selectedModuleInstanceId={moduleWorkspace?.moduleInstance.id ?? null}
      moduleWorkspace={moduleWorkspace}
      moduleResult={moduleResult}
      componentAssignment={componentAssignment}
      summary={summarizeModuleStatuses(selectedConfiguration?.assemblies ?? [])}
      marketProfiles={marketProfiles}
      modulePackages={modulePackages}
    />
  );
}
