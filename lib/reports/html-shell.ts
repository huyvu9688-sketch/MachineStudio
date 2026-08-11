// Shared HTML document shell, escaping, and print styling for lib/reports'
// module and assembly renderers (Unit 5.2). Architecture.md "Reports | HTML
// + print CSS": every report is a single self-contained HTML document —
// styling is inlined, nothing loads from a network — opened directly in a
// browser tab (`app/(workspace)/workspace/report/route.ts`) rather than
// downloaded, so the browser's own Print function produces the physical
// copy. No script: every section renders fully expanded, since a print
// document has no interactive affordance to expand later.

/** Escapes text for safe interpolation into HTML (code-standards.md Security: "Escape user-provided report content"). Every dynamic string this package renders — labels, statements, notes — passes through this first. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const PRINT_CSS = `
  :root {
    color-scheme: light;
    --report-text: #1c1917;
    --report-text-muted: #57534e;
    --report-border: #d6d3d1;
    --report-surface: #fafaf9;
    --report-pass: #15803d;
    --report-fail: #b91c1c;
    --report-warning: #b45309;
    --report-neutral: #57534e;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px 32px 64px;
    background: #ffffff;
    color: var(--report-text);
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 13px;
    line-height: 1.5;
  }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 0 0 8px; }
  h3 { font-size: 13px; margin: 0 0 4px; }
  .report-cover { border-bottom: 2px solid var(--report-text); padding-bottom: 12px; margin-bottom: 20px; }
  .report-cover p { margin: 0; color: var(--report-text-muted); }
  .module-report { border: 1px solid var(--report-border); border-radius: 6px; padding: 16px 20px; margin-bottom: 20px; page-break-inside: avoid; }
  .module-report-header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 12px; border-bottom: 1px solid var(--report-border); padding-bottom: 8px; margin-bottom: 12px; }
  .module-report-subtitle { color: var(--report-text-muted); font-family: ui-monospace, monospace; font-size: 11px; }
  .assembly-block { margin-bottom: 12px; }
  .assembly-heading { border-bottom: 1px solid var(--report-border); padding-bottom: 4px; margin-bottom: 12px; }
  .report-section { margin-bottom: 14px; }
  .report-section:last-child { margin-bottom: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--report-border); vertical-align: top; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; color: var(--report-text-muted); font-weight: 600; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .muted { color: var(--report-text-muted); }
  .empty-notice { color: var(--report-text-muted); font-style: italic; }
  .status { font-weight: 600; }
  .status-pass { color: var(--report-pass); }
  .status-fail { color: var(--report-fail); }
  .status-warning, .status-stale { color: var(--report-warning); }
  .status-not_applicable, .status-invalid_input, .status-not_configured { color: var(--report-neutral); }
  .stale-banner { border: 1px solid var(--report-warning); color: var(--report-warning); border-radius: 4px; padding: 6px 10px; margin-bottom: 12px; font-size: 12px; }
  .trace-node { margin: 2px 0 2px 0; }
  .trace-section > .trace-title { font-weight: 600; }
  .trace-step .trace-title { font-weight: 500; }
  .trace-expression { font-family: ui-monospace, monospace; color: var(--report-text-muted); margin-left: 6px; }
  .trace-method { font-family: ui-monospace, monospace; font-size: 10px; color: var(--report-text-muted); }
  .trace-operands { font-size: 11px; color: var(--report-text-muted); }
  .trace-children, .trace-body { margin-left: 16px; border-left: 1px solid var(--report-border); padding-left: 10px; }
  .trace-notes { margin: 2px 0; padding-left: 16px; font-size: 11px; }
  ul.plain { list-style: none; margin: 0; padding: 0; }
  ul.plain li { padding: 3px 0; border-bottom: 1px solid var(--report-border); }
  ul.plain li:last-child { border-bottom: none; }
  .report-footer { margin-top: 12px; padding-top: 8px; border-top: 1px dashed var(--report-border); font-size: 10px; color: var(--report-text-muted); font-family: ui-monospace, monospace; }
  @media print {
    body { padding: 0; }
    .module-report { border: none; border-bottom: 1px solid var(--report-border); border-radius: 0; }
  }
`;

/** Wraps `bodyHtml` in a complete, self-contained HTML document with the shared print stylesheet inlined. */
export function wrapReportHtml(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${PRINT_CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`;
}
