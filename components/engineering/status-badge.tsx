import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  MinusCircle,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { CheckStatus } from "@/lib/engine";
import { cn } from "@/lib/utils";

/**
 * A module instance's overall status as shown in the navigator and status
 * bar. `CheckStatus` (`lib/engine/trace`) covers a completed run's outcome;
 * `"not_configured"` is the pre-run state (`ModuleInstance.lastRunStatus ===
 * null`), matching ui-context.md's Status Model.
 */
export type ModuleStatus = CheckStatus | "not_configured";

interface StatusMeta {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly colorVar: string;
}

// Warning and stale intentionally share one color role in ui-context.md's
// Colors table ("Stale / warning" → --state-stale) — they are distinguished
// by icon and label, not color.
const STATUS_META: Record<ModuleStatus, StatusMeta> = {
  not_configured: {
    label: "Not configured",
    icon: CircleDashed,
    colorVar: "var(--state-neutral)",
  },
  pass: { label: "Pass", icon: CheckCircle2, colorVar: "var(--state-success)" },
  fail: { label: "Fail", icon: XCircle, colorVar: "var(--state-error)" },
  warning: { label: "Warning", icon: AlertTriangle, colorVar: "var(--state-stale)" },
  invalid_input: {
    label: "Invalid input",
    icon: CircleAlert,
    colorVar: "var(--state-error)",
  },
  not_applicable: {
    label: "Not applicable",
    icon: MinusCircle,
    colorVar: "var(--state-neutral)",
  },
};

export interface StatusBadgeProps {
  readonly status: ModuleStatus;
  /** Renders only the icon, for dense tree rows. Still has an accessible name. */
  readonly iconOnly?: boolean;
  readonly className?: string;
}

/**
 * Status indicator pairing an icon with a label — state is never conveyed by
 * color alone (context/ui-context.md "Colors").
 */
export function StatusBadge({ status, iconOnly = false, className }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  if (iconOnly) {
    return (
      <span
        role="img"
        aria-label={meta.label}
        className={cn("inline-flex shrink-0", className)}
      >
        <Icon aria-hidden="true" className="h-4 w-4" style={{ color: meta.colorVar }} />
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium", className)}
      style={{ color: meta.colorVar }}
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      {meta.label}
    </span>
  );
}
