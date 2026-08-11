// Renders an assembly's printable calculation report (Unit 5.2: "Module and
// assembly report renderer") from `loadAssemblyReportView`'s
// already-assembled `AssemblyReportView` — the requested assembly and every
// nested child assembly, each with its own module instances' reports.
// Nests `module-report-html.ts`'s own per-module fragment rather than
// re-rendering module data, so an assembly report and a standalone module
// report always agree (one rendering of `ModuleReportView`, not two).

import type { AssemblyReportNode, AssemblyReportView } from "@/lib/application";
import { escapeHtml, wrapReportHtml } from "./html-shell";
import { renderModuleReportSection } from "./module-report-html";

/** Exported for `machine-report-html.ts` (Unit 5.3) to render each root assembly's own detailed-calculations section without a second rendering of the same tree. */
export function renderAssemblyNode(node: AssemblyReportNode, depth: number): string {
  const heading = `<h2 class="assembly-heading" style="margin-left:${depth * 16}px">${escapeHtml(node.assemblyName)}</h2>`;
  const isEmpty = node.modules.length === 0 && node.children.length === 0;
  const modulesHtml = node.modules.map(renderModuleReportSection).join("");
  const childrenHtml = node.children
    .map((child) => renderAssemblyNode(child, depth + 1))
    .join("");
  const emptyNotice = isEmpty
    ? `<p class="empty-notice" style="margin-left:${depth * 16}px">No module instances in this assembly.</p>`
    : "";
  return `<div class="assembly-block">${heading}${emptyNotice}${modulesHtml}${childrenHtml}</div>`;
}

/** Renders an assembly and its descendants as a complete, self-contained HTML document. */
export function buildAssemblyReportHtml(view: AssemblyReportView): string {
  const title = `${view.root.assemblyName} — Assembly Calculation Report`;
  const cover = `<header class="report-cover">
    <h1>${escapeHtml(view.root.assemblyName)}</h1>
    <p>${escapeHtml(view.configurationName)}</p>
  </header>`;
  return wrapReportHtml(title, cover + renderAssemblyNode(view.root, 0));
}
