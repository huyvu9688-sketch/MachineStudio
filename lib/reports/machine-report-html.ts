// Renders the whole-machine printable calculation package (Unit 5.3:
// "Machine calculation package") from `loadMachineReportView`'s
// already-assembled `MachineReportView` — cover/project details, the
// selected market profile and every source cited across the package, the
// requirements verification matrix, assembly/module summaries, detailed
// calculations, the BOM, open warnings/assumptions, and the latest
// baseline's ID and module-package hashes.
//
// Nests `module-report-html.ts`'s own per-module fragment (via
// `assembly-report-html.ts`'s `renderAssemblyNode`) for "detailed
// calculations" rather than re-rendering module data, so a standalone
// module report, an assembly report, and this package's own copy of the
// same module always agree — one rendering of `ModuleReportView`, not
// three. Takes only the already-shaped view; no `lib/modules` import, no
// registry lookup of its own (every reference is already resolved by
// `loadMachineReportView`).

import type {
  AssemblyReportNode,
  BomItem,
  BomNode,
  BomView,
  MachineReportView,
  ModuleReportView,
  OpenAssumptionView,
  OpenWarningView,
} from "@/lib/application";
import { escapeHtml, wrapReportHtml } from "./html-shell";
import {
  renderEmpty,
  renderSection,
  renderSources,
  renderStatusBadge,
} from "./module-report-html";
import { renderAssemblyNode } from "./assembly-report-html";

const MACHINE_LEVEL_PATH = "(Machine)";

function renderModuleStatus(module: ModuleReportView): string {
  if (module.run === null) {
    return `<span class="status status-not_configured">Not run</span>`;
  }
  return renderStatusBadge(module.run.status);
}

interface SummaryRow {
  readonly assemblyPath: string;
  readonly moduleLabel: string;
  readonly module: ModuleReportView;
}

function flattenSummaryRows(
  nodes: readonly AssemblyReportNode[],
  parentPath: readonly string[],
): SummaryRow[] {
  const rows: SummaryRow[] = [];
  for (const node of nodes) {
    const path = [...parentPath, node.assemblyName];
    for (const moduleReport of node.modules) {
      rows.push({
        assemblyPath: path.join(" / "),
        moduleLabel: moduleReport.moduleInstance.label,
        module: moduleReport,
      });
    }
    rows.push(...flattenSummaryRows(node.children, path));
  }
  return rows;
}

function renderAssemblySummary(assemblies: readonly AssemblyReportNode[]): string {
  const rows = flattenSummaryRows(assemblies, []);
  if (rows.length === 0) {
    return renderEmpty("This configuration has no module instances yet.");
  }
  const body = rows
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.assemblyPath)}</td>
        <td>${escapeHtml(row.moduleLabel)}</td>
        <td>${renderModuleStatus(row.module)}</td>
        <td class="num">${row.module.run?.criticalMargin ?? "—"}</td>
        <td>${row.module.run?.stale === true ? renderStatusBadge("warning") : ""}</td>
      </tr>`,
    )
    .join("");
  return `<table><thead><tr><th>Assembly</th><th>Module</th><th>Status</th><th class="num">Critical margin</th><th>Stale</th></tr></thead><tbody>${body}</tbody></table>`;
}

function renderDetailedCalculations(
  assemblies: readonly AssemblyReportNode[],
): string {
  if (assemblies.length === 0) {
    return renderEmpty("This configuration has no assemblies yet.");
  }
  return assemblies.map((node) => renderAssemblyNode(node, 0)).join("");
}

function renderMarketProfileSection(
  view: MachineReportView,
): string {
  const profile = view.marketProfile;
  if (profile === null) {
    return renderSection(
      "Market profile and references",
      renderEmpty(
        "The project's own selected market profile no longer resolves against the released registry.",
      ),
    );
  }
  const entriesRows = profile.entries
    .map(
      (entry) => `<tr>
        <td>${escapeHtml(entry.documentTitle)}${entry.edition.length > 0 ? ` <span class="muted">(${escapeHtml(entry.edition)})</span>` : ""}</td>
        <td>${escapeHtml(entry.applicability)}</td>
        <td>${escapeHtml(entry.use)}</td>
      </tr>`,
    )
    .join("");
  const entriesTable =
    profile.entries.length > 0
      ? `<table><thead><tr><th>Source</th><th>Applicability</th><th>Use</th></tr></thead><tbody>${entriesRows}</tbody></table>`
      : renderEmpty("This market profile references no baseline sources.");
  return renderSection(
    "Market profile and references",
    `<p><strong>${escapeHtml(profile.displayName)}</strong> — ${escapeHtml(profile.scope)}</p>
     <p class="muted">${escapeHtml(profile.disclaimer)}</p>
     ${entriesTable}
     <h3>Sources cited across this package's own calculations</h3>
     ${renderSources(view.sources)}`,
  );
}

const REQUIREMENT_STATUS_LABEL: Record<string, string> = {
  criteria_defined: "Acceptance criteria defined",
  no_criteria_yet: "No acceptance criteria yet",
};

function renderRequirementsMatrix(view: MachineReportView): string {
  const { requirements, designAssumptions, loadCases } = view.requirements;

  const requirementRows =
    requirements.length > 0
      ? requirements
          .map(
            (req) => `<tr>
              <td>${escapeHtml(req.code)}</td>
              <td>${escapeHtml(req.statement)}</td>
              <td>${req.assemblyId === null ? "Machine" : "Assembly"}</td>
              <td class="${req.verificationStatus === "criteria_defined" ? "status-pass" : "status-warning"}">${escapeHtml(REQUIREMENT_STATUS_LABEL[req.verificationStatus])}</td>
              <td>${
                req.acceptanceCriteria.length > 0
                  ? `<ul class="plain">${req.acceptanceCriteria.map((ac) => `<li>${escapeHtml(ac.statement)}</li>`).join("")}</ul>`
                  : "—"
              }</td>
            </tr>`,
          )
          .join("")
      : "";
  const requirementsTable =
    requirements.length > 0
      ? `<table><thead><tr><th>Code</th><th>Statement</th><th>Scope</th><th>Status</th><th>Acceptance criteria</th></tr></thead><tbody>${requirementRows}</tbody></table>`
      : renderEmpty("No requirements recorded for this configuration.");

  const assumptionsList =
    designAssumptions.length > 0
      ? `<ul class="plain">${designAssumptions.map((a) => `<li>${escapeHtml(a.statement)}${a.rationale !== null ? ` <span class="muted">— ${escapeHtml(a.rationale)}</span>` : ""}</li>`).join("")}</ul>`
      : renderEmpty("No design assumptions recorded.");

  const loadCaseRows =
    loadCases.length > 0
      ? loadCases
          .map(
            (lc) => `<tr>
              <td>${escapeHtml(lc.label)}</td>
              <td>${escapeHtml(lc.category)}</td>
              <td>${lc.description !== null ? escapeHtml(lc.description) : "—"}</td>
            </tr>`,
          )
          .join("")
      : "";
  const loadCasesTable =
    loadCases.length > 0
      ? `<table><thead><tr><th>Label</th><th>Category</th><th>Description</th></tr></thead><tbody>${loadCaseRows}</tbody></table>`
      : renderEmpty("No load cases recorded.");

  return renderSection(
    "Requirements verification matrix",
    `${requirementsTable}
     <p class="muted">Status reflects whether a requirement has at least one recorded acceptance criterion, not that a calculation has verified it against a run — no requirement-to-run link is implemented yet.</p>
     <h3>Design assumptions</h3>
     ${assumptionsList}
     <h3>Load cases</h3>
     ${loadCasesTable}`,
  );
}

function renderBomItemRow(assemblyPath: string, item: BomItem): string {
  return `<tr>
    <td>${escapeHtml(assemblyPath)}</td>
    <td>${escapeHtml(item.targetLabel ?? "(assembly)")}</td>
    <td>${escapeHtml(item.description)}${item.partSource === "manual" ? ' <span class="muted">(manual / custom)</span>' : ""}</td>
    <td class="num">${item.quantity}</td>
    <td>${item.stale ? renderStatusBadge("warning") : ""}</td>
  </tr>`;
}

function flattenBomRows(
  view: BomView,
): string {
  const rows: string[] = [];
  for (const item of view.machineLevelItems) {
    rows.push(renderBomItemRow(MACHINE_LEVEL_PATH, item));
  }
  function visit(node: BomNode, parentPath: readonly string[]): void {
    const path = [...parentPath, node.assemblyName];
    for (const item of node.items) {
      rows.push(renderBomItemRow(path.join(" / "), item));
    }
    for (const child of node.children) {
      visit(child, path);
    }
  }
  for (const node of view.assemblies) {
    visit(node, []);
  }
  return rows.join("");
}

function renderBomSection(view: BomView): string {
  if (view.totalLineCount === 0) {
    return renderSection(
      "Bill of materials",
      renderEmpty("No components assigned yet."),
    );
  }
  const rows = flattenBomRows(view);
  return renderSection(
    "Bill of materials",
    `<table><thead><tr><th>Assembly</th><th>Target</th><th>Part</th><th class="num">Qty</th><th>Stale</th></tr></thead><tbody>${rows}</tbody></table>
     <p class="muted">${view.totalLineCount} line${view.totalLineCount === 1 ? "" : "s"}${view.staleLineCount > 0 ? `, ${view.staleLineCount} stale` : ""}.</p>`,
  );
}

function renderOpenItems(view: MachineReportView): string {
  if (view.openWarnings.length === 0 && view.openAssumptions.length === 0) {
    return renderSection(
      "Open warnings and assumptions",
      renderEmpty("No open warnings or recorded assumptions across this package's own calculations."),
    );
  }
  const warningsList =
    view.openWarnings.length > 0
      ? `<ul class="plain">${view.openWarnings
          .map(
            (w: OpenWarningView) =>
              `<li class="status-warning">${escapeHtml(w.moduleInstanceLabel)}: ${escapeHtml(w.warning.message)}${w.warning.detail !== undefined ? ` — ${escapeHtml(w.warning.detail)}` : ""}</li>`,
          )
          .join("")}</ul>`
      : renderEmpty("No open warnings.");
  const assumptionsList =
    view.openAssumptions.length > 0
      ? `<ul class="plain">${view.openAssumptions
          .map(
            (a: OpenAssumptionView) =>
              `<li>${escapeHtml(a.moduleInstanceLabel)}: ${escapeHtml(a.assumption.statement)}</li>`,
          )
          .join("")}</ul>`
      : renderEmpty("No recorded assumptions.");
  return renderSection(
    "Open warnings and assumptions",
    `<h3>Warnings</h3>${warningsList}<h3>Assumptions</h3>${assumptionsList}`,
  );
}

function renderBaselineSection(view: MachineReportView): string {
  const baseline = view.latestBaseline;
  if (baseline === null) {
    return renderSection(
      "Baseline",
      renderEmpty("This configuration has no baseline yet."),
    );
  }
  const rows = baseline.moduleRefs
    .map(
      (ref) => `<tr>
        <td>${escapeHtml(ref.moduleInstanceLabel)}</td>
        <td>${escapeHtml(ref.modulePackageId)}@${escapeHtml(ref.moduleVersion)}</td>
        <td class="trace-method">${escapeHtml(ref.modulePackageHash)}</td>
        <td>${renderStatusBadge(ref.status)}</td>
        <td>${ref.stale ? renderStatusBadge("warning") : ""}</td>
      </tr>`,
    )
    .join("");
  return renderSection(
    "Baseline",
    `<p><strong>${escapeHtml(baseline.label)}</strong> <span class="muted">(${escapeHtml(baseline.id)}, ${escapeHtml(baseline.createdAt.toLocaleString())})</span></p>
     <table><thead><tr><th>Module</th><th>Package</th><th>Hash</th><th>Status at freeze</th><th>Stale at freeze</th></tr></thead><tbody>${rows}</tbody></table>`,
  );
}

/** Renders the whole-machine calculation package as a complete, self-contained HTML document. */
export function buildMachineReportHtml(view: MachineReportView): string {
  const title = `${view.configuration.name} — Machine Calculation Package`;
  const cover = `<header class="report-cover">
    <h1>${escapeHtml(view.configuration.name)}</h1>
    <p>${escapeHtml(view.project.name)}</p>
    <p class="muted">Generated ${escapeHtml(view.generatedAt.toLocaleString())}</p>
  </header>`;

  const body = [
    cover,
    renderMarketProfileSection(view),
    renderRequirementsMatrix(view),
    renderSection("Assembly and module summary", renderAssemblySummary(view.assemblies)),
    renderSection("Detailed calculations", renderDetailedCalculations(view.assemblies)),
    renderBomSection(view.bom),
    renderOpenItems(view),
    renderBaselineSection(view),
  ].join("");

  return wrapReportHtml(title, body);
}
