import { FolderOpen, LayoutPanelLeft, PackageOpen, Plus } from "lucide-react";
import { EmptyState } from "./empty-state";
import {
  CreateProjectDialog,
  type MarketProfileOption,
} from "./create-project-dialog";
import { CreateAssemblyDialog } from "./create-assembly-dialog";
import { Button } from "@/components/ui/button";

export interface WorkspaceCanvasProps {
  readonly hasProjects: boolean;
  readonly hasConfigurations: boolean;
  readonly hasContent: boolean;
  readonly marketProfiles: readonly MarketProfileOption[];
  /** The active configuration's id, when one exists (for the "add assembly" CTA). */
  readonly configurationId: string | null;
}

/**
 * The main canvas (context/ui-context.md "Application Shell": "active
 * workspace"). Unit 3.2 made the no-projects/empty-configuration states
 * actionable (real "New project"/"Add assembly" CTAs); Unit 3.3 added the
 * per-module input workspace (`ModuleInputWorkspace`), rendered by the parent
 * `WorkspaceShell` instead of this component whenever `?module=` resolves —
 * this file's own final state is only the "nothing selected yet" case.
 */
export function WorkspaceCanvas({
  hasProjects,
  hasConfigurations,
  hasContent,
  marketProfiles,
  configurationId,
}: WorkspaceCanvasProps) {
  if (!hasProjects) {
    return (
      <div className="flex flex-col items-center gap-4">
        <EmptyState
          icon={FolderOpen}
          title="No machine projects yet"
          description="Create a project to start building a machine."
        />
        <CreateProjectDialog marketProfiles={marketProfiles} />
      </div>
    );
  }
  if (!hasConfigurations) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="No configurations yet"
        description="This project doesn't have a configuration yet."
      />
    );
  }
  if (!hasContent) {
    return (
      <div className="flex flex-col items-center gap-4">
        <EmptyState
          icon={PackageOpen}
          title="This configuration is empty"
          description="Add an assembly to start building the machine tree."
        />
        {configurationId !== null ? (
          <CreateAssemblyDialog
            configurationId={configurationId}
            trigger={
              <Button type="button">
                <Plus aria-hidden="true" className="h-4 w-4" />
                Add assembly
              </Button>
            }
          />
        ) : null}
      </div>
    );
  }
  return (
    <EmptyState
      icon={LayoutPanelLeft}
      title="Select an item in the navigator"
      description="Select a module to view and edit its inputs."
    />
  );
}
