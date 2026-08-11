// lib/reports renders stored calculation traces and domain records.
// Reports must not reimplement formulas. See context/architecture.md.

export { buildBomCsv, flattenBomView, type BomCsvRow } from "./bom-csv";

export {
  renderModuleReportSection,
  buildModuleReportHtml,
} from "./module-report-html";

export { buildAssemblyReportHtml } from "./assembly-report-html";

export { buildMachineReportHtml } from "./machine-report-html";
