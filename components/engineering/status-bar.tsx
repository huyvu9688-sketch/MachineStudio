import type { ReactNode } from "react";
import { StatusBadge } from "./status-badge";
import type { ModuleStatusSummary } from "./module-status-summary";

export interface StatusBarProps {
  readonly marketProfileKey: string | null;
  readonly summary: ModuleStatusSummary | null;
}

/**
 * Bottom engineering status bar (context/ui-context.md "Application Shell":
 * "unit display profile, run status, stale count, failed checks, active
 * market profile"). Segmented fields with hairline dividers, monospace
 * tabular numbers — deliberately reads as engineering-tool chrome (AutoCAD/
 * SolidWorks status line), not a rounded SaaS "chip row."
 */
export function StatusBar({ marketProfileKey, summary }: StatusBarProps) {
  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-border-default bg-bg-surface px-3 text-[12px] text-text-muted">
      <Field label="Units">SI (canonical)</Field>
      <Divider />
      <Field label="Run status">
        {summary ? (
          <StatusBadge status={summary.overallStatus} />
        ) : (
          <Value>—</Value>
        )}
      </Field>
      <Divider />
      <Field label="Failed checks">
        <Value tone={summary && summary.fail > 0 ? "error" : undefined}>
          {summary ? summary.fail : "—"}
        </Value>
      </Field>
      <Divider />
      <Field
        label="Stale"
        title="Stale-run tracking is not wired into this view yet (Milestone 3.5)."
      >
        <Value>—</Value>
      </Field>

      <div className="ml-auto flex items-center gap-4">
        <Divider />
        <Field label="Market profile">
          <Value>{marketProfileKey ?? "—"}</Value>
        </Field>
      </div>
    </footer>
  );
}

function Field({
  label,
  title,
  children,
}: {
  readonly label: string;
  readonly title?: string;
  readonly children: ReactNode;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1.5" title={title}>
      <span>{label}</span>
      {children}
    </span>
  );
}

function Value({
  children,
  tone,
}: {
  readonly children: ReactNode;
  readonly tone?: "error";
}) {
  return (
    <span
      className="font-mono text-[12px] tabular-nums text-text-primary"
      style={tone === "error" ? { color: "var(--state-error)" } : undefined}
    >
      {children}
    </span>
  );
}

function Divider() {
  return (
    <span
      aria-hidden="true"
      className="h-3.5 w-px shrink-0 bg-border-default"
    />
  );
}
