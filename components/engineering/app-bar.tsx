"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Plus,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  CreateProjectDialog,
  type MarketProfileOption,
} from "./create-project-dialog";
import { RenameDialog } from "./rename-dialog";
import { AccountSettingsDialog } from "./account-settings-dialog";
import { renameProjectAction } from "@/app/(workspace)/workspace/actions";
import type {
  MachineConfigurationRecord,
  MachineProjectRecord,
} from "@/lib/db";

export interface AppBarProps {
  readonly projects: readonly MachineProjectRecord[];
  readonly selectedProject: {
    readonly id: string;
    readonly name: string;
    readonly configurations: readonly MachineConfigurationRecord[];
  } | null;
  readonly selectedConfigurationId: string | null;
  readonly marketProfiles: readonly MarketProfileOption[];
  readonly navigatorCollapsed: boolean;
  readonly onToggleNavigator: () => void;
}

/**
 * 48px app bar (context/ui-context.md "Application Shell": "product name,
 * project/configuration, global actions"). The project and configuration
 * pickers navigate via real `<Link>`s to `?project=`/`?configuration=` — a
 * page reload preserves the selection (deep-linkable, matches
 * ui-ux-pro-max's `deep-linking` guidance), not client state that resets on
 * refresh. "New project" and "Rename project" (Unit 3.2) open dialogs backed
 * by Server Actions, not client-only state.
 */
export function AppBar({
  projects,
  selectedProject,
  selectedConfigurationId,
  marketProfiles,
  navigatorCollapsed,
  onToggleNavigator,
}: AppBarProps) {
  const pathname = usePathname();

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border-default bg-bg-appbar px-3 text-text-on-accent">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onToggleNavigator}
        aria-label={
          navigatorCollapsed
            ? "Show machine navigator"
            : "Hide machine navigator"
        }
        aria-pressed={!navigatorCollapsed}
        className="text-text-on-accent hover:bg-white/10 hover:text-text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {navigatorCollapsed ? (
          <ChevronsRight aria-hidden="true" className="h-4 w-4" />
        ) : (
          <ChevronsLeft aria-hidden="true" className="h-4 w-4" />
        )}
      </Button>

      <span className="ml-1 shrink-0 text-[16px] font-semibold tracking-tight">
        MachineStudio
      </span>

      <span aria-hidden="true" className="mx-2 h-5 w-px shrink-0 bg-white/20" />

      {selectedProject !== null ? (
        <div className="flex min-w-0 items-center gap-1 text-[13px]">
          <Picker
            triggerLabel={selectedProject.name}
            items={projects.map((project) => ({
              key: project.id,
              label: project.name,
              href: `${pathname}?project=${encodeURIComponent(project.id)}`,
              active: project.id === selectedProject.id,
            }))}
          />
          <TopBarIconButton
            icon={Pencil}
            label="Rename project"
            renderAsChild={(trigger) => (
              <RenameDialog
                title="Rename project"
                action={renameProjectAction}
                idFieldName="projectId"
                idValue={selectedProject.id}
                currentName={selectedProject.name}
                trigger={trigger}
              />
            )}
          />
          {selectedProject.configurations.length > 0 ? (
            <>
              <span aria-hidden="true" className="text-text-on-accent/50">
                /
              </span>
              <Picker
                triggerLabel={
                  selectedProject.configurations.find(
                    (c) => c.id === selectedConfigurationId,
                  )?.name ?? "Select configuration"
                }
                items={selectedProject.configurations.map((configuration) => ({
                  key: configuration.id,
                  label: configuration.name,
                  href: `${pathname}?project=${encodeURIComponent(selectedProject.id)}&configuration=${encodeURIComponent(configuration.id)}`,
                  active: configuration.id === selectedConfigurationId,
                }))}
              />
            </>
          ) : null}
          <TopBarIconButton
            icon={Plus}
            label="New project"
            renderAsChild={(trigger) => (
              <CreateProjectDialog
                marketProfiles={marketProfiles}
                trigger={trigger}
              />
            )}
          />
        </div>
      ) : (
        <CreateProjectDialog
          marketProfiles={marketProfiles}
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-text-on-accent hover:bg-white/10 hover:text-text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              New project
            </Button>
          }
        />
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <AccountSettingsDialog
          trigger={
            <button
              type="button"
              aria-label="Account settings"
              title="Account settings"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-on-accent/80 transition-colors duration-150 ease-out hover:bg-white/10 hover:text-text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <UserCog aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          }
        />
        <UserButton />
      </div>
    </header>
  );
}

interface PickerItem {
  readonly key: string;
  readonly label: string;
  readonly href: string;
  readonly active: boolean;
}

function Picker({
  triggerLabel,
  items,
}: {
  readonly triggerLabel: string;
  readonly items: readonly PickerItem[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex max-w-48 items-center gap-1 rounded-md px-2 py-1 font-medium text-text-on-accent transition-colors duration-150 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 opacity-80"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {items.map((item) => (
          <DropdownMenuItem key={item.key} asChild>
            <Link
              href={item.href}
              aria-current={item.active ? "true" : undefined}
            >
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * A small on-accent icon button. Takes a render-prop so the caller can wrap
 * the actual `<button>` in a Dialog's `asChild` trigger — the button itself
 * must be the literal child Radix clones, not nested inside another element.
 */
function TopBarIconButton({
  icon: Icon,
  label,
  renderAsChild,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly renderAsChild: (trigger: React.ReactElement) => React.ReactNode;
}) {
  const trigger = (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-on-accent/80 transition-colors duration-150 ease-out hover:bg-white/10 hover:text-text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
    </button>
  );
  return renderAsChild(trigger);
}
