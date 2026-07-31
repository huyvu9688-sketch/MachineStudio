import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description?: string;
  readonly className?: string;
  /** Compact renders smaller, for use inside the navigator panel. */
  readonly compact?: boolean;
}

/**
 * A helpful message where content would otherwise be missing
 * (context/ui-context.md "Modals and Errors"; implementation-map.md Unit 3.1
 * "Empty/loading/error states"). No filler illustration — an icon, a plain
 * statement of what's missing, and (where there's one) what happens next.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-16",
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("text-text-muted/60", compact ? "h-6 w-6" : "h-9 w-9")}
      />
      <p
        className={cn(
          "font-medium text-text-primary",
          compact ? "text-[13px]" : "text-[16px]",
        )}
      >
        {title}
      </p>
      {description ? (
        <p
          className={cn(
            "max-w-xs text-text-muted",
            compact ? "text-[12px]" : "text-[14px]",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
