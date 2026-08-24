// Pure BOM CSV rendering (Unit 5.1). lib/reports renders stored domain
// records; it never touches the database or reimplements a formula
// (context/architecture.md Invariant "Trace-driven reporting") — this file
// only serializes an already-assembled `BomView`
// (lib/application/reports/load-bom-view.ts) into CSV text.

import type { BomItem, BomNode, BomView } from "@/lib/application";

/** One flattened BOM row, ready to serialize — the assembly hierarchy collapsed into a single path column. */
export interface BomCsvRow {
  readonly assemblyPath: string;
  readonly target: string;
  readonly description: string;
  readonly manufacturerName: string;
  readonly partNumber: string;
  readonly sourceRevisionOrNotes: string;
  readonly quantity: number;
  readonly partSource: BomItem["partSource"];
  readonly stale: boolean;
  readonly calculationRunId: string;
}

const MACHINE_LEVEL_PATH = "(Machine)";

function rowFor(item: BomItem, assemblyPath: string): BomCsvRow {
  return {
    assemblyPath,
    target: item.targetLabel ?? "(assembly)",
    description: item.description,
    manufacturerName: item.manufacturerName ?? "",
    partNumber: item.partNumber ?? "",
    sourceRevisionOrNotes: item.sourceRevision ?? item.notes ?? "",
    quantity: item.quantity,
    partSource: item.partSource,
    stale: item.stale,
    calculationRunId: item.calculationRunId ?? "",
  };
}

function flattenNode(
  node: BomNode,
  parentPath: readonly string[],
  rows: BomCsvRow[],
): void {
  const path = [...parentPath, node.assemblyName];
  const pathLabel = path.join(" / ");
  for (const item of node.items) {
    rows.push(rowFor(item, pathLabel));
  }
  for (const child of node.children) {
    flattenNode(child, path, rows);
  }
}

/** Flattens a `BomView`'s tree into one row per line item, machine-level items first. */
export function flattenBomView(view: BomView): readonly BomCsvRow[] {
  const rows: BomCsvRow[] = [];
  for (const item of view.machineLevelItems) {
    rows.push(rowFor(item, MACHINE_LEVEL_PATH));
  }
  for (const node of view.assemblies) {
    flattenNode(node, [], rows);
  }
  return rows;
}

/**
 * Neutralizes spreadsheet formula injection (OWASP CSV Injection): a field
 * beginning with `=`, `+`, `-`, `@`, tab, or CR is prefixed with a leading
 * `'` so Excel/Sheets/LibreOffice render it as literal text instead of
 * evaluating it as a formula when the CSV is opened. Manual BOM fields
 * (manufacturer name, part number, revision/notes) are free text an
 * engineer or a catalog import can set to anything — a release audit found
 * none of them were neutralized before this fix.
 */
function neutralizeFormulaPrefix(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** RFC 4180 field escaping: quote a field containing a comma, quote, or newline, doubling embedded quotes. */
function escapeCsvField(value: string): string {
  const neutralized = neutralizeFormulaPrefix(value);
  if (/[",\n\r]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
}

const CSV_HEADER = [
  "Assembly",
  "Target",
  "Description",
  "Manufacturer",
  "Part number",
  "Revision / notes",
  "Quantity",
  "Source",
  "Stale",
  "Supporting run",
];

function rowToCsvLine(row: BomCsvRow): string {
  return [
    row.assemblyPath,
    row.target,
    row.description,
    row.manufacturerName,
    row.partNumber,
    row.sourceRevisionOrNotes,
    String(row.quantity),
    row.partSource,
    row.stale ? "yes" : "no",
    row.calculationRunId,
  ]
    .map(escapeCsvField)
    .join(",");
}

/**
 * Renders a `BomView` as CSV text (CRLF line endings per RFC 4180), one row
 * per flattened line item. The route handler that serves this
 * (`app/(workspace)/workspace/bom/route.ts`) is the only caller today; kept
 * as a pure function here so a future HTML print report can flatten the
 * same `BomView` without duplicating this logic.
 */
export function buildBomCsv(view: BomView): string {
  const rows = flattenBomView(view);
  const lines = [
    CSV_HEADER.map(escapeCsvField).join(","),
    ...rows.map(rowToCsvLine),
  ];
  return lines.join("\r\n") + "\r\n";
}
