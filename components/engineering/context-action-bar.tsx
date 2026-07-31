export interface ContextActionBarProps {
  readonly projectName: string | null;
  readonly configurationName: string | null;
}

/**
 * Context action bar (context/ui-context.md "Application Shell":
 * "workflow/module actions"). No actions are wired yet — none of Milestone
 * 4's modules or Unit 3.7's requirements/BOM surfaces exist — so this unit
 * ships the persistent chrome (the active project/configuration path) and
 * reserves the action slot rather than inventing buttons with nothing to
 * do. A later unit populates the right-hand slot without changing this
 * shell (context/architecture.md invariant "Generic extension").
 */
export function ContextActionBar({ projectName, configurationName }: ContextActionBarProps) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-b border-border-default bg-bg-surface px-4">
      <p className="truncate text-[13px]">
        {projectName ? (
          <span className="text-text-primary">{projectName}</span>
        ) : (
          <span className="text-text-muted">No project selected</span>
        )}
        {configurationName ? (
          <>
            <span className="mx-1.5 text-text-muted">/</span>
            <span className="text-text-primary">{configurationName}</span>
          </>
        ) : null}
      </p>
      <div className="flex shrink-0 items-center gap-2" />
    </div>
  );
}
