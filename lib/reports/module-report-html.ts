// Renders one module instance's printable calculation report (Unit 5.2:
// "Module and assembly report renderer") from `loadModuleReportView`'s
// already-assembled `ModuleReportView` — inputs, active load case,
// assumptions, outputs, checks/margins, warnings, validity limits, the
// calculation trace, source references, assigned parts, and stale state.
//
// Takes only the already-shaped view; it never imports `lib/modules` or
// re-derives a value (context/implementation-map.md Unit 5.2 rule: "The
// renderer receives stored trace data; it does not import module
// formulas"). `renderModuleReportSection` is exported separately from
// `buildModuleReportHtml` so `assembly-report-html.ts` can nest the same
// per-module fragment inside a multi-module document without a second
// rendering of this data.

import type {
  AssumptionView,
  ModuleReportView,
  PortValueView,
  ReportAssignedPartView,
  ReportLoadCaseView,
  SourceReferenceView,
} from "@/lib/application";
import type {
  CheckResult,
  CheckStatus,
  TraceNode,
  TraceOperand,
  ValidityResult,
  Warning,
} from "@/lib/engine";
import { escapeHtml, wrapReportHtml } from "./html-shell";
import { formatReportValue } from "./format-value";

const CHECK_STATUS_LABEL: Record<CheckStatus, string> = {
  pass: "Pass",
  fail: "Fail",
  warning: "Warning",
  not_applicable: "N/A",
  invalid_input: "Invalid input",
};

/** Exported for `machine-report-html.ts` (Unit 5.3) to render the same status styling in its own summary/baseline tables. */
export function renderStatusBadge(status: CheckStatus): string {
  return `<span class="status status-${status}">${CHECK_STATUS_LABEL[status]}</span>`;
}

/** Exported for `machine-report-html.ts` (Unit 5.3) — the same titled-block shape used at the machine-package level. */
export function renderSection(title: string, innerHtml: string): string {
  return `<div class="report-section"><h3>${escapeHtml(title)}</h3>${innerHtml}</div>`;
}

/** Exported for `machine-report-html.ts` (Unit 5.3). */
export function renderEmpty(message: string): string {
  return `<p class="empty-notice">${escapeHtml(message)}</p>`;
}

function renderPortTable(
  ports: readonly PortValueView[],
  emptyMessage: string,
): string {
  if (ports.length === 0) return renderEmpty(emptyMessage);
  const rows = ports
    .map(
      (port) => `<tr>
        <td>${escapeHtml(port.label)}${port.loadCase !== null ? ` <span class="muted">(${escapeHtml(port.loadCase)})</span>` : ""}</td>
        <td class="num">${escapeHtml(formatReportValue(port.value))}</td>
      </tr>`,
    )
    .join("");
  return `<table><thead><tr><th>Parameter</th><th class="num">Value</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderChecksTable(checks: readonly CheckResult[]): string {
  if (checks.length === 0) return renderEmpty("This run declares no checks.");
  const rows = checks
    .map(
      (check) => `<tr>
        <td>${renderStatusBadge(check.status)}</td>
        <td>${escapeHtml(check.criterion ?? check.message)}</td>
        <td class="num">${check.observed !== undefined ? escapeHtml(formatReportValue(check.observed)) : "—"}</td>
        <td class="num">${check.allowable !== undefined ? escapeHtml(formatReportValue(check.allowable)) : "—"}</td>
        <td class="num">${check.margin !== undefined ? escapeHtml(formatReportValue(check.margin)) : "—"}</td>
      </tr>`,
    )
    .join("");
  return `<table><thead><tr><th>Status</th><th>Criterion</th><th class="num">Observed</th><th class="num">Allowable</th><th class="num">Margin</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderWarningsAndValidity(
  warnings: readonly Warning[],
  validity: readonly ValidityResult[],
): string {
  const outOfEnvelope = validity.filter((v) => v.status !== "within_limits");
  if (warnings.length === 0 && outOfEnvelope.length === 0) return "";
  const items = [
    ...warnings.map(
      (warning) =>
        `<li class="status-warning">${escapeHtml(warning.message)}${warning.detail !== undefined ? ` — ${escapeHtml(warning.detail)}` : ""}</li>`,
    ),
    ...outOfEnvelope.map(
      (v) =>
        `<li class="${v.status === "out_of_range" ? "status-fail" : "status-not_applicable"}">${escapeHtml(v.limit)}${v.message !== undefined ? ` — ${escapeHtml(v.message)}` : ""}${v.status === "not_evaluated" ? " (not evaluated for these inputs)" : ""}</li>`,
    ),
  ].join("");
  return renderSection("Warnings", `<ul class="plain">${items}</ul>`);
}

function renderAssumptions(assumptions: readonly AssumptionView[]): string {
  if (assumptions.length === 0) {
    return renderEmpty("This run relies on no recorded assumptions.");
  }
  const items = assumptions
    .map((assumption) => {
      const value =
        assumption.value !== null
          ? ` <span class="muted">(${escapeHtml(formatReportValue(assumption.value))})</span>`
          : "";
      const sources =
        assumption.sources.length > 0
          ? `<div class="muted">${assumption.sources.map(renderInlineSource).join("; ")}</div>`
          : "";
      return `<li>${escapeHtml(assumption.statement)}${value}${sources}</li>`;
    })
    .join("");
  return `<ul class="plain">${items}</ul>`;
}

/** Exported for `machine-report-html.ts` (Unit 5.3)'s own package-wide bibliography section. */
export function renderInlineSource(source: SourceReferenceView): string {
  return escapeHtml(
    `${source.documentTitle} (${source.edition})${source.clause !== null ? ` — ${source.clause}` : ""}${source.page !== null ? `, p. ${source.page}` : ""}`,
  );
}

/** Exported for `machine-report-html.ts` (Unit 5.3)'s own package-wide bibliography section. */
export function renderSources(sources: readonly SourceReferenceView[]): string {
  if (sources.length === 0) {
    return renderEmpty("No source references cited.");
  }
  const items = sources
    .map(
      (source) =>
        `<li>${renderInlineSource(source)}${source.label !== null ? ` (${escapeHtml(source.label)})` : ""}</li>`,
    )
    .join("");
  return `<ul class="plain">${items}</ul>`;
}

function renderLoadCase(loadCase: ReportLoadCaseView | null): string {
  if (loadCase === null) return "";
  return renderSection(
    "Load case",
    `<p>${escapeHtml(loadCase.label)} <span class="muted">(${escapeHtml(loadCase.category)})</span>${loadCase.description !== null ? ` — ${escapeHtml(loadCase.description)}` : ""}</p>`,
  );
}

function renderAssignedParts(parts: readonly ReportAssignedPartView[]): string {
  if (parts.length === 0) return "";
  const rows = parts
    .map(
      (part) => `<tr>
        <td>${escapeHtml(part.description)}${part.manufacturerName !== null && part.partSource === "catalog" ? `<div class="muted">${escapeHtml(part.manufacturerName)} ${escapeHtml(part.partNumber ?? "")}</div>` : ""}${part.notes !== null ? `<div class="muted">${escapeHtml(part.notes)}</div>` : ""}</td>
        <td>${part.partSource === "catalog" ? escapeHtml(part.sourceRevision ?? "") : "manual / custom"}</td>
        <td class="num">${part.quantity}</td>
        <td>${part.stale ? renderStatusBadge("warning") : ""}</td>
      </tr>`,
    )
    .join("");
  return renderSection(
    "Assigned parts",
    `<table><thead><tr><th>Part</th><th>Revision</th><th class="num">Qty</th><th>Stale</th></tr></thead><tbody>${rows}</tbody></table>`,
  );
}

function renderTraceOperands(
  label: string,
  operands: readonly TraceOperand[],
): string {
  if (operands.length === 0) return "";
  const parts = operands
    .map(
      (operand) =>
        `${escapeHtml(operand.label)} = ${escapeHtml(formatReportValue(operand.value))}`,
    )
    .join(", ");
  return `<div class="trace-operands">${escapeHtml(label)}: ${parts}</div>`;
}

function renderTraceNode(node: TraceNode): string {
  if (node.node === "section") {
    const children = node.children.map(renderTraceNode).join("");
    return `<div class="trace-node trace-section">
      <div class="trace-title">${escapeHtml(node.title)}</div>
      <div class="trace-children">${children}</div>
    </div>`;
  }
  const notes =
    node.notes !== undefined && node.notes.length > 0
      ? `<ul class="trace-notes">${node.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>`
      : "";
  return `<div class="trace-node trace-step">
    <div class="trace-title">${escapeHtml(node.title ?? node.methodId)}${node.expression !== undefined ? `<span class="trace-expression">${escapeHtml(node.expression)}</span>` : ""}</div>
    <div class="trace-body">
      <div class="trace-method">${escapeHtml(node.methodId)}</div>
      ${renderTraceOperands("Inputs", node.inputs)}
      ${renderTraceOperands("Outputs", node.outputs)}
      ${notes}
    </div>
  </div>`;
}

/**
 * Renders one module instance's report as an HTML fragment (no `<html>`
 * wrapper) — reused by `assembly-report-html.ts` to nest several modules'
 * reports inside one assembly document.
 */
export function renderModuleReportSection(view: ModuleReportView): string {
  const header = `<div class="module-report-header">
    <h2>${escapeHtml(view.moduleInstance.label)}</h2>
    <span class="trace-method">${escapeHtml(view.moduleInstance.modulePackageId)}@${escapeHtml(view.moduleInstance.moduleVersion)}</span>
    ${view.run !== null ? renderStatusBadge(view.run.status) : ""}
    ${view.run !== null ? `<span class="muted">${escapeHtml(view.run.createdAt.toLocaleString())}</span>` : ""}
  </div>`;

  if (view.run === null) {
    return `<section class="module-report">${header}${renderEmpty("This module has not been run yet — no calculation to report.")}</section>`;
  }

  const staleBanner = view.run.stale
    ? `<div class="stale-banner">${escapeHtml(view.run.staleReason ?? "This result is stale — an upstream input changed since it was computed.")}</div>`
    : "";

  return `<section class="module-report">
    ${header}
    ${staleBanner}
    ${renderSection("Inputs", renderPortTable(view.inputs, "This run has no described inputs."))}
    ${renderLoadCase(view.activeLoadCase)}
    ${renderSection("Assumptions", renderAssumptions(view.assumptions))}
    ${renderSection("Outputs", renderPortTable(view.outputs, "This run produced no output values."))}
    ${renderSection("Checks", renderChecksTable(view.checks))}
    ${renderWarningsAndValidity(view.warnings, view.validity)}
    ${
      view.trace !== null
        ? renderSection(
            "Calculation trace",
            view.trace.sections.map(renderTraceNode).join(""),
          )
        : ""
    }
    ${renderAssignedParts(view.assignedParts)}
    ${renderSection("Source references", renderSources(view.sources))}
    <div class="report-footer">Run ${escapeHtml(view.run.id)} · Engine SDK ${escapeHtml(view.run.engineSdkVersion)} · Package hash ${escapeHtml(view.run.modulePackageHash)} · Parameter registry ${escapeHtml(view.run.parameterRegistryVersion)}</div>
  </section>`;
}

/** Renders one module instance's report as a complete, self-contained HTML document. */
export function buildModuleReportHtml(view: ModuleReportView): string {
  const title = `${view.moduleInstance.label} — Calculation Report`;
  return wrapReportHtml(title, renderModuleReportSection(view));
}
