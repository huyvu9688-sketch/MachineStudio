import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Info,
  XCircle,
} from "lucide-react";

const statusExamples = [
  {
    label: "Pass",
    icon: CheckCircle2,
    colorVar: "var(--state-success)",
  },
  {
    label: "Fail",
    icon: XCircle,
    colorVar: "var(--state-error)",
  },
  {
    label: "Stale",
    icon: AlertTriangle,
    colorVar: "var(--state-stale)",
  },
  {
    label: "Info",
    icon: Info,
    colorVar: "var(--state-info)",
  },
  {
    label: "Not configured",
    icon: CircleDashed,
    colorVar: "var(--state-neutral)",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-base">
      <header className="flex h-12 shrink-0 items-center border-b border-border-default bg-bg-appbar px-4 text-text-on-accent">
        <span className="text-[16px] font-semibold">MachineStudio</span>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 py-10">
        <div className="w-full max-w-2xl rounded-lg border border-border-default bg-bg-surface p-8 shadow-sm">
          <h1 className="text-[20px] font-semibold text-text-primary">
            Repository initialized
          </h1>
          <p className="mt-2 text-[14px] text-text-muted">
            This placeholder page is styled only with the design tokens defined
            in{" "}
            <code className="font-mono text-[13px]">context/ui-context.md</code>
            .
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {statusExamples.map(({ label, icon: Icon, colorVar }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 rounded-md border border-border-default bg-bg-surface px-2.5 py-1.5 text-[13px] font-medium"
                style={{ color: colorVar }}
              >
                <Icon className="h-4 w-4" style={{ color: colorVar }} />
                {label}
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between rounded-md border border-border-default px-3 py-2">
            <span className="text-[13px] text-text-muted">Payload mass</span>
            <span className="font-mono text-[13px] tabular-nums text-text-primary">
              12.000 kg
            </span>
          </div>

          <button
            type="button"
            className="mt-6 rounded-md bg-accent-primary px-4 py-2 text-[14px] font-medium text-text-on-accent transition-colors duration-150 ease-out hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
          >
            Primary action
          </button>
        </div>
      </main>
    </div>
  );
}
