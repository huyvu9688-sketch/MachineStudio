"use client";

import type { ReactNode } from "react";
import { Boxes, Download, Layers, PackageOpen } from "lucide-react";
import { EmptyState } from "./empty-state";
import type { BomItem, BomNode, BomView } from "@/lib/application";

export interface BomWorkspaceProps {
  readonly view: BomView;
}

function PanelSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border-default bg-bg-surface p-4">
      <h2 className="text-[14px] font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

/** A BOM line's part-identity cell: manufacturer + part number for a catalog part, description + notes for a manual one. */
function PartIdentityCell({ item }: { readonly item: BomItem }) {
  if (item.partSource === "catalog") {
    return (
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-text-primary">{item.description}</span>
        {item.sourceRevision !== null ? (
          <span className="font-mono text-[11px] text-text-muted">
            rev {item.sourceRevision}
          </span>
        ) : null}
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-text-primary">{item.description}</span>
      <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-text-muted">
        <span>manual / custom part</span>
        {item.notes !== null ? <span>{item.notes}</span> : null}
      </span>
    </div>
  );
}

function StaleTag() {
  return (
    <span
      className="inline-flex w-fit shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
      style={{ borderColor: "var(--state-stale)", color: "var(--state-stale)" }}
    >
      Stale
    </span>
  );
}

function ItemTable({ items }: { readonly items: readonly BomItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-150 border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border-default text-left text-[11px] font-medium tracking-wide text-text-muted uppercase">
            <th className="py-1.5 pr-3">Target</th>
            <th className="py-1.5 pr-3">Part</th>
            <th className="py-1.5 pr-3 text-right">Qty</th>
            <th className="py-1.5 pr-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-border-default last:border-b-0"
            >
              <td className="py-1.5 pr-3 text-text-primary">
                {item.targetLabel ?? "(assembly)"}
              </td>
              <td className="py-1.5 pr-3">
                <PartIdentityCell item={item} />
              </td>
              <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-text-primary">
                {item.quantity}
              </td>
              <td className="py-1.5 pr-3">
                {item.stale ? <StaleTag /> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One assembly's own BOM lines, recursing into its children with increasing indentation. */
function AssemblyBlock({
  node,
  depth,
}: {
  readonly node: BomNode;
  readonly depth: number;
}) {
  const hasContent = node.items.length > 0 || node.children.length > 0;
  if (!hasContent) return null;
  return (
    <div className="flex flex-col gap-2" style={{ paddingLeft: depth * 16 }}>
      <div className="flex items-center gap-1.5">
        <Boxes
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-text-muted"
        />
        <span className="text-[13px] font-medium text-text-primary">
          {node.assemblyName}
        </span>
      </div>
      <ItemTable items={node.items} />
      {node.children.map((child) => (
        <AssemblyBlock key={child.assemblyId} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function hasAnyContent(view: BomView): boolean {
  return view.totalLineCount > 0;
}

/**
 * The generic BOM workspace (Unit 5.1, `implementation-map.md`: "Multi-level
 * BOM tree", "Calculated component items", "Manual/custom items", "Quantity
 * and parent assembly", "CSV export"). Renders entirely from
 * `loadBomView`'s already-assembled tree — no `ComponentAssignment`
 * resolution logic here, mirroring `ModuleResultPanel`'s own "render the
 * already-shaped view, don't recompute it" discipline one level up.
 *
 * The "Download CSV" link points at the Route Handler
 * (`app/(workspace)/workspace/bom/route.ts`) that renders the exact same
 * `BomView` through `lib/reports`' `buildBomCsv` — the tree here and the CSV
 * there are two renderings of one generated view, never two separate
 * computations (ADR-0008).
 */
export function BomWorkspace({ view }: BomWorkspaceProps) {
  const downloadHref = `/workspace/bom?configuration=${encodeURIComponent(view.configurationId)}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 pb-8">
      <header className="flex items-center gap-3 border-b border-border-default pb-3">
        <Layers
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-text-muted"
        />
        <h1 className="text-[16px] font-semibold text-text-primary">
          Bill of Materials
        </h1>
        <span className="text-[12px] text-text-muted">
          {view.totalLineCount} line{view.totalLineCount === 1 ? "" : "s"}
          {view.staleLineCount > 0 ? `, ${view.staleLineCount} stale` : ""}
        </span>
        <a
          href={downloadHref}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border-default px-2.5 py-1.5 text-[13px] font-medium text-text-primary hover:bg-surface-hover"
        >
          <Download aria-hidden="true" className="h-3.5 w-3.5" />
          Download CSV
        </a>
      </header>

      {!hasAnyContent(view) ? (
        <EmptyState
          icon={PackageOpen}
          title="No components assigned yet"
          description="Assign a manufacturer or manual part to a module or assembly to see it here."
        />
      ) : (
        <>
          {view.machineLevelItems.length > 0 ? (
            <PanelSection title="Machine-level items">
              <ItemTable items={view.machineLevelItems} />
            </PanelSection>
          ) : null}
          {view.assemblies.length > 0 ? (
            <PanelSection title="Assemblies">
              <div className="flex flex-col gap-4">
                {view.assemblies.map((node) => (
                  <AssemblyBlock key={node.assemblyId} node={node} depth={0} />
                ))}
              </div>
            </PanelSection>
          ) : null}
        </>
      )}
    </div>
  );
}
