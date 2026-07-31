"use client";

import { useActionState, useState, type ReactNode } from "react";
import { AlertTriangle, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { StatusBadge } from "./status-badge";
import { EmptyState } from "./empty-state";
import { formatEngineeringValue } from "./format-engineering-value";
import { runModuleInstanceAction } from "@/app/(workspace)/workspace/actions";
import { IDLE_ACTION_STATE } from "@/app/(workspace)/workspace/action-state";
// Deep import, not the `@/lib/engine` barrel: that barrel also re-exports
// `lib/engine/module-sdk`'s `runModuleConformance` (`conformance.ts`, which
// has its own `import "server-only"`), which would break this client
// component's bundle. `lib/engine/units` is its own self-contained,
// server-only-free public surface.
import { formatQuantity } from "@/lib/engine/units";
import type { EngineeringValue, TraceNode } from "@/lib/engine";
import type { ModuleResultView, SourceReferenceView } from "@/lib/application";
import { cn } from "@/lib/utils";

export interface ModuleResultPanelProps {
  readonly view: ModuleResultView;
}

/** Numeric cells use `formatQuantity` (proper significant figures + unit); every other kind falls back to the shared short form. */
function formatResultValue(value: EngineeringValue): string {
  return value.kind === "quantity"
    ? formatQuantity(value, { useDisplayUnit: true })
    : formatEngineeringValue(value);
}

function RunButton({ moduleInstanceId }: { readonly moduleInstanceId: string }) {
  const [state, formAction, isPending] = useActionState(
    runModuleInstanceAction,
    IDLE_ACTION_STATE,
  );
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="moduleInstanceId" value={moduleInstanceId} />
      <Button type="submit" size="sm" disabled={isPending}>
        <Play aria-hidden="true" className="h-3.5 w-3.5" />
        {isPending ? "Running…" : "Run"}
      </Button>
      {state.status === "error" ? (
        <p role="alert" className="max-w-xs text-right text-[12px]" style={{ color: "var(--state-error)" }}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/** ui-context.md Status Model "Stale" — shown above every other result, per that section. */
function StaleBanner({ reason }: { readonly reason: string | null }) {
  return (
    <div
      className="flex items-center gap-2 rounded-md border px-3 py-2 text-[13px]"
      style={{
        borderColor: "var(--state-stale)",
        color: "var(--state-stale)",
        backgroundColor: "rgba(180, 83, 9, 0.06)",
      }}
    >
      <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span>{reason ?? "This result is stale — an upstream input changed since it was computed."}</span>
    </div>
  );
}

function OutputSummary({ view }: { readonly view: ModuleResultView }) {
  if (view.outputs.length === 0) {
    return <p className="text-[13px] text-text-muted">This run produced no output values.</p>;
  }
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
      {view.outputs.map((output) => (
        <div key={output.portKey} className="contents">
          <dt className="text-[13px] text-text-primary">{output.label}</dt>
          <dd className="text-right font-mono text-[13px] tabular-nums text-text-primary">
            {formatResultValue(output.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ComparisonSection({ view }: { readonly view: ModuleResultView }) {
  const comparison = view.comparison;
  if (comparison === null) return null;
  if (comparison.changedOutputs.length === 0 && comparison.changedChecks.length === 0) {
    return (
      <p className="text-[12px] text-text-muted">
        No change since the previous run ({comparison.previousRunCreatedAt.toLocaleString()}).
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] text-text-muted">
        Changed since the previous run ({comparison.previousRunCreatedAt.toLocaleString()}):
      </p>
      {comparison.changedOutputs.length > 0 ? (
        <dl className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-2 gap-y-1 text-[12px]">
          {comparison.changedOutputs.map((changed) => (
            <div key={changed.portKey} className="contents">
              <dt className="text-text-primary">{changed.label}</dt>
              <dd className="text-right font-mono tabular-nums text-text-muted">
                {formatResultValue(changed.before)}
              </dd>
              <dd aria-hidden="true" className="text-text-muted">
                →
              </dd>
              <dd className="text-right font-mono tabular-nums text-text-primary">
                {formatResultValue(changed.after)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {comparison.changedChecks.length > 0 ? (
        <ul className="flex flex-col gap-1 text-[12px]">
          {comparison.changedChecks.map((changed) => (
            <li key={changed.id} className="flex items-center gap-2">
              <StatusBadge status={changed.before} iconOnly />
              <span aria-hidden="true" className="text-text-muted">
                →
              </span>
              <StatusBadge status={changed.after} iconOnly />
              <span className="text-text-primary">{changed.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function CheckTable({ view }: { readonly view: ModuleResultView }) {
  if (view.checks.length === 0) {
    return <p className="text-[13px] text-text-muted">This run declares no checks.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-130 border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border-default text-left text-[11px] font-medium tracking-wide text-text-muted uppercase">
            <th className="py-1.5 pr-3">Status</th>
            <th className="py-1.5 pr-3">Criterion</th>
            <th className="py-1.5 pr-3 text-right">Observed</th>
            <th className="py-1.5 pr-3 text-right">Allowable</th>
            <th className="py-1.5 pr-3 text-right">Margin</th>
          </tr>
        </thead>
        <tbody>
          {view.checks.map((check) => (
            <tr key={check.id} className="border-b border-border-default last:border-b-0">
              <td className="py-1.5 pr-3">
                <StatusBadge status={check.status} />
              </td>
              <td className="py-1.5 pr-3 text-text-primary">
                {check.criterion ?? check.message}
              </td>
              <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-text-primary">
                {check.observed !== undefined ? formatResultValue(check.observed) : "—"}
              </td>
              <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-text-primary">
                {check.allowable !== undefined ? formatResultValue(check.allowable) : "—"}
              </td>
              <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-text-primary">
                {check.margin !== undefined ? formatResultValue(check.margin) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WarningsPanel({ view }: { readonly view: ModuleResultView }) {
  const outOfEnvelope = view.validity.filter((v) => v.status !== "within_limits");
  if (view.warnings.length === 0 && outOfEnvelope.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {view.warnings.map((warning) => (
        <p
          key={warning.id}
          className="rounded-md border px-2.5 py-1.5 text-[12px]"
          style={{ borderColor: "var(--state-stale)", color: "var(--state-stale)" }}
        >
          {warning.message}
          {warning.detail !== undefined ? ` — ${warning.detail}` : ""}
        </p>
      ))}
      {outOfEnvelope.map((validity) => (
        <p
          key={validity.id}
          className="rounded-md border px-2.5 py-1.5 text-[12px]"
          style={{
            borderColor: validity.status === "out_of_range" ? "var(--state-error)" : "var(--state-neutral)",
            color: validity.status === "out_of_range" ? "var(--state-error)" : "var(--state-neutral)",
          }}
        >
          {validity.limit}
          {validity.message !== undefined ? ` — ${validity.message}` : ""}
          {validity.status === "not_evaluated" ? " (not evaluated for these inputs)" : ""}
        </p>
      ))}
    </div>
  );
}

function TraceOperandList({
  label,
  operands,
}: {
  readonly label: string;
  readonly operands: readonly { readonly label: string; readonly value: EngineeringValue }[];
}) {
  if (operands.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-text-muted">
      <span className="font-medium">{label}:</span>
      {operands.map((operand, index) => (
        <span key={`${operand.label}-${index}`} className="font-mono tabular-nums">
          {operand.label} = {formatResultValue(operand.value)}
        </span>
      ))}
    </div>
  );
}

/** One trace node (section or step), recursively — ui-context.md "Expandable structured calculation trace." */
function TraceNodeItem({ node, depth }: { readonly node: TraceNode; readonly depth: number }) {
  const [open, setOpen] = useState(depth === 0);

  if (node.node === "section") {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          className="flex w-full items-center gap-1.5 py-1 text-left text-[13px] font-medium text-text-primary"
          style={{ paddingLeft: depth * 16 }}
        >
          <ChevronRight
            aria-hidden="true"
            className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open ? "rotate-90" : "")}
          />
          {node.title}
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col">
          {node.children.map((child) => (
            <TraceNodeItem key={`${child.node}-${child.id}`} node={child} depth={depth + 1} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className="flex w-full items-center gap-1.5 py-1 text-left text-[13px] text-text-primary"
        style={{ paddingLeft: depth * 16 }}
      >
        <ChevronRight
          aria-hidden="true"
          className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open ? "rotate-90" : "")}
        />
        {node.title ?? node.methodId}
        {node.expression !== undefined ? (
          <span className="font-mono text-[12px] text-text-muted">{node.expression}</span>
        ) : null}
      </CollapsibleTrigger>
      <CollapsibleContent
        className="flex flex-col gap-1 pb-1.5"
        style={{ paddingLeft: (depth + 1) * 16 }}
      >
        <p className="font-mono text-[11px] text-text-muted">{node.methodId}</p>
        <TraceOperandList label="Inputs" operands={node.inputs} />
        <TraceOperandList label="Outputs" operands={node.outputs} />
        {node.notes !== undefined && node.notes.length > 0 ? (
          <ul className="list-inside list-disc text-[12px] text-text-muted">
            {node.notes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

function SourceReferencesList({ sources }: { readonly sources: readonly SourceReferenceView[] }) {
  if (sources.length === 0) {
    return <p className="text-[12px] text-text-muted">No source references cited.</p>;
  }
  return (
    <ul className="flex flex-col gap-1 text-[12px] text-text-muted">
      {sources.map((source, index) => (
        <li key={index}>
          {source.documentTitle} ({source.edition})
          {source.clause !== null ? ` — ${source.clause}` : ""}
          {source.page !== null ? `, p. ${source.page}` : ""}
          {source.label !== null ? ` (${source.label})` : ""}
        </li>
      ))}
    </ul>
  );
}

function ResultSection({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-4">
      <h2 className="text-[14px] font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

/**
 * The generic result and trace renderer (Unit 3.5, `implementation-map.md`:
 * "Output summary", "Check table", "Warning/invalidity panel", "Expandable
 * trace", "Source references", "Previous-run comparison", "Stale banner").
 * Renders entirely from `loadModuleResultView`'s already-described snapshot
 * data — no module compute code is imported here (this unit's exit
 * criterion) — and owns the "Run module" trigger both Unit 3.3 and Unit 3.4
 * deliberately deferred here (ui-context.md "Generic Module Workspace").
 *
 * Scope note: "Assigned manufacturer part and stale state" from
 * ui-context.md's broader Result-pane description is Unit 3.6's deliverable
 * ("An engineer can assign a manufacturer part and see its supporting run"),
 * not this unit's — nothing here reads `ComponentAssignment`. Likewise, the
 * application-shell status bar's tree-wide "stale count" placeholder
 * (Unit 3.1) stays a placeholder: this unit renders one module's stale
 * state, not an aggregate across every module instance in the
 * configuration, which implementation-map.md's Unit 3.5 deliverable list
 * does not name.
 */
export function ModuleResultPanel({ view }: ModuleResultPanelProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 pb-8">
      <header className="flex items-center gap-3 border-b border-border-default pb-3">
        <h1 className="text-[16px] font-semibold text-text-primary">Result</h1>
        <StatusBadge status={view.run?.status ?? "not_configured"} />
        {view.run !== null ? (
          <span className="text-[12px] text-text-muted">
            {view.run.createdAt.toLocaleString()}
          </span>
        ) : null}
        <div className="ml-auto">
          <RunButton moduleInstanceId={view.moduleInstance.id} />
        </div>
      </header>

      {view.run?.stale === true ? <StaleBanner reason={view.run.staleReason} /> : null}

      {view.run === null ? (
        <EmptyState
          compact
          icon={Play}
          title="Not run yet"
          description="Click Run to compute this module's result from its current inputs."
        />
      ) : (
        <>
          <ResultSection title="Output summary">
            <OutputSummary view={view} />
          </ResultSection>

          {view.comparison !== null ? (
            <ResultSection title="Previous-run comparison">
              <ComparisonSection view={view} />
            </ResultSection>
          ) : null}

          <ResultSection title="Checks">
            <CheckTable view={view} />
          </ResultSection>

          <WarningsPanel view={view} />

          <ResultSection title="Calculation trace">
            <div className="flex flex-col">
              {view.trace?.sections.map((section) => (
                <TraceNodeItem key={`${section.node}-${section.id}`} node={section} depth={0} />
              ))}
            </div>
          </ResultSection>

          <ResultSection title="Source references">
            <SourceReferencesList sources={view.sources} />
          </ResultSection>
        </>
      )}
    </div>
  );
}
