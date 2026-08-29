"use client";

import { useActionState, useState } from "react";
import { EllipsisVertical, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  confirmSuggestedLinkAction,
  removeParameterLinkAction,
} from "@/app/(workspace)/workspace/actions";
import { IDLE_ACTION_STATE } from "@/app/(workspace)/workspace/action-state";
import { LOAD_CASE_LABELS } from "./load-case-labels";
import { formatEngineeringValue } from "./format-engineering-value";
import type { ResolvedInputSource } from "@/lib/db";
import type {
  LinkSuggestionSourceView,
  ModuleInputFieldView,
} from "@/lib/application";

/**
 * The link-suggestion banner and link-removal control (Unit 3.4,
 * `implementation-map.md`: "Suggestion banner", "Confirm and dismiss
 * actions", "Downstream stale-impact warning on removal/change"). Every
 * suggestion rendered here is a proposal only — {@link confirmSuggestedLinkAction}
 * re-validates everything through unchanged `confirmParameterLink` (Unit 2.5),
 * the sole authority for link safety (context/architecture.md "Semantic link
 * safety"); nothing here decides that a link is safe on its own.
 *
 * ui-context.md "Link Suggestions": "Never display only a value. Always show
 * parameter meaning, origin, assembly scope, and load case" — every row here
 * states all four before offering Confirm.
 */

/** A stable identity for one suggestion within a render, for dismiss tracking and React keys. */
function suggestionKey(s: LinkSuggestionSourceView): string {
  return [
    s.sourceKind,
    s.sourceModuleInstanceId ?? "",
    s.sourceAssemblyId ?? "",
    s.sourceParameterId,
    s.sourceLoadCase ?? "",
  ].join("|");
}

/** "Use payload mass 12 kg from Axis Requirements / Normal load case?" (ui-context.md example). */
function suggestionText(s: LinkSuggestionSourceView): string {
  const valuePart =
    s.value !== null ? ` ${formatEngineeringValue(s.value)}` : "";
  const originPart =
    s.moduleLabel !== null
      ? `${s.moduleLabel} (${s.scopeLabel})`
      : s.scopeLabel;
  const loadCasePart =
    s.sourceLoadCase !== null
      ? ` — ${LOAD_CASE_LABELS[s.sourceLoadCase]} load case`
      : "";
  return `Use ${s.parameterLabel}${valuePart} from ${originPart}${loadCasePart}?`;
}

function SuggestionDetail({
  suggestion,
}: {
  readonly suggestion: LinkSuggestionSourceView;
}) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px] text-text-muted">
      <dt>Parameter</dt>
      <dd className="font-mono">{suggestion.sourceParameterId}</dd>
      <dt>Scope</dt>
      <dd>
        {suggestion.moduleLabel !== null
          ? `${suggestion.moduleLabel} — ${suggestion.scopeLabel}`
          : suggestion.scopeLabel}
      </dd>
      {suggestion.sourceLoadCase !== null ? (
        <>
          <dt>Load case</dt>
          <dd>{LOAD_CASE_LABELS[suggestion.sourceLoadCase]}</dd>
        </>
      ) : null}
      <dt>Current value</dt>
      <dd>
        {suggestion.value !== null
          ? formatEngineeringValue(suggestion.value)
          : "Not yet available (comes from that module's calculation run)"}
      </dd>
    </dl>
  );
}

function LinkSuggestionRow({
  suggestion,
  configurationId,
  targetModuleInstanceId,
  targetParameterId,
  targetLoadCase,
  onDismiss,
}: {
  readonly suggestion: LinkSuggestionSourceView;
  readonly configurationId: string;
  readonly targetModuleInstanceId: string;
  readonly targetParameterId: string;
  readonly targetLoadCase: string | null;
  readonly onDismiss: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    confirmSuggestedLinkAction,
    IDLE_ACTION_STATE,
  );
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 border-t border-border-default pt-2 first:border-t-0 first:pt-0">
      <p className="text-[12px] text-text-primary">
        {suggestionText(suggestion)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <form action={formAction} className="contents">
          <input type="hidden" name="configurationId" value={configurationId} />
          <input
            type="hidden"
            name="targetModuleInstanceId"
            value={targetModuleInstanceId}
          />
          <input
            type="hidden"
            name="targetParameterId"
            value={targetParameterId}
          />
          {targetLoadCase !== null ? (
            <input type="hidden" name="targetLoadCase" value={targetLoadCase} />
          ) : null}
          <input
            type="hidden"
            name="sourceKind"
            value={suggestion.sourceKind}
          />
          {suggestion.sourceModuleInstanceId !== null ? (
            <input
              type="hidden"
              name="sourceModuleInstanceId"
              value={suggestion.sourceModuleInstanceId}
            />
          ) : null}
          {suggestion.sourceAssemblyId !== null ? (
            <input
              type="hidden"
              name="sourceAssemblyId"
              value={suggestion.sourceAssemblyId}
            />
          ) : null}
          <input
            type="hidden"
            name="sourceParameterId"
            value={suggestion.sourceParameterId}
          />
          {suggestion.sourceLoadCase !== null ? (
            <input
              type="hidden"
              name="sourceLoadCase"
              value={suggestion.sourceLoadCase}
            />
          ) : null}
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={isPending}
          >
            {isPending ? "Confirming…" : "Confirm"}
          </Button>
        </form>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Hide details" : "View source"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
      {expanded ? <SuggestionDetail suggestion={suggestion} /> : null}
      {state.status === "error" ? (
        <p
          role="alert"
          className="text-[12px]"
          style={{ color: "var(--state-error)" }}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

export interface LinkSuggestionPanelProps {
  readonly field: ModuleInputFieldView;
  readonly configurationId: string;
  readonly targetModuleInstanceId: string;
}

/**
 * The ⋮ suggestion-menu trigger (module workspace save/run redesign,
 * 2026-08-27) — replaces the old always-visible "Suggested sources" box,
 * which read as unexplained clutter (founder feedback). Renders nothing
 * when `field.suggestions` is empty, same as the box it replaces. No
 * suggestion-count badge on the trigger — a plain icon, per founder
 * preference. Every row inside keeps identical underlying behavior to the
 * old panel: Confirm still calls the unchanged `confirmSuggestedLinkAction`;
 * View source still expands inline detail; Dismiss is still
 * client-side-only, recomputed every render, nothing persisted.
 */
export function LinkSuggestionMenu({
  field,
  configurationId,
  targetModuleInstanceId,
}: LinkSuggestionPanelProps) {
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const [open, setOpen] = useState(false);

  // Nothing was ever offered for this field -- no trigger to render at all,
  // same as the box this menu replaces. Once a first suggestion exists, the
  // trigger stays mounted even after every suggestion is dismissed (see
  // `onDismiss` below) rather than being force-unmounted mid-interaction:
  // this is a `Popover`, not a `DropdownMenu` (`role="menu"`) — hosting
  // `LinkSuggestionRow`'s own `<form>` and stateful buttons inside a real
  // menu's roving-tabindex/ARIA contract is a semantic mismatch a plain
  // anchored panel doesn't have, and unmounting an *open* popover's trigger
  // out from under a keyboard user (rather than closing it through Radix's
  // own `onOpenChange`) drops focus to `<body>` instead of restoring it.
  if (field.suggestions.length === 0) return null;

  const visible = field.suggestions.filter(
    (s) => !dismissed.has(suggestionKey(s)),
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        // Refuses to (re)open once every suggestion is dismissed, whatever
        // triggered the attempt (click, keyboard). Guarding here rather
        // than on the trigger's own onClick avoids depending on Radix's
        // internal event-handler composition order, and — critically —
        // leaves the trigger's native `disabled` attribute unset, so it
        // stays focusable: Radix's onCloseAutoFocus calls
        // `triggerRef.current?.focus()` after the close animation, and
        // `.focus()` on a disabled element is a silent no-op, which would
        // reintroduce the exact focus-loss bug this Popover switch exists
        // to avoid.
        if (next && visible.length === 0) return;
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className={visible.length === 0 ? "opacity-50" : undefined}
          aria-disabled={visible.length === 0}
          aria-label={
            visible.length === 0
              ? `No remaining suggestions for ${field.label}`
              : `Suggested source${visible.length > 1 ? "s" : ""} for ${field.label}`
          }
        >
          <EllipsisVertical aria-hidden="true" className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2.5">
        <p className="mb-2 text-[11px] font-medium tracking-wide text-text-muted uppercase">
          Suggested source{visible.length > 1 ? "s" : ""}
        </p>
        <div className="flex flex-col gap-2">
          {visible.map((suggestion) => (
            <LinkSuggestionRow
              key={suggestionKey(suggestion)}
              suggestion={suggestion}
              configurationId={configurationId}
              targetModuleInstanceId={targetModuleInstanceId}
              targetParameterId={field.parameterId}
              targetLoadCase={field.loadCase}
              onDismiss={() => {
                const next = new Set(dismissed);
                next.add(suggestionKey(suggestion));
                setDismissed(next);
                // Dismissing the last one closes the popover through
                // Radix's own onOpenChange path (restoring focus to the
                // still-mounted trigger) instead of unmounting anything.
                if (next.size === field.suggestions.length) {
                  setOpen(false);
                }
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export interface LinkedFieldControlProps {
  readonly resolved: Extract<ResolvedInputSource, { source: "linked" }>;
  /** Module instances that would be marked stale if this link were removed (`ModuleInputFieldView.linkRemovalImpact`). */
  readonly linkRemovalImpact: number;
  /**
   * Whether Run will actually be able to resolve this field from its linked
   * module-output source right now (`ModuleInputFieldView.linkedSourceStatus`).
   * `undefined` for a link to a requirement/assembly value, which always has
   * a real value already and needs no such preview.
   */
  readonly linkedSourceStatus?: "ready" | "stale" | "not_run";
}

const LINKED_SOURCE_WARNING: Readonly<Record<"stale" | "not_run", string>> = {
  not_run:
    "Source module has not been run yet — run it, then run this module again.",
  stale:
    "Source module's latest run is stale — re-run it, then run this module again.",
};

/**
 * Replaces the plain read-only "Linked from …" notice with the same notice
 * plus a remove-link control that states its downstream stale impact before
 * the user confirms (ui-context.md "Modals and Errors": "Confirmation
 * required for destructive actions and link removal with downstream
 * impact").
 */
export function LinkedFieldControl({
  resolved,
  linkRemovalImpact,
  linkedSourceStatus,
}: LinkedFieldControlProps) {
  const [state, formAction, isPending] = useActionState(
    removeParameterLinkAction,
    IDLE_ACTION_STATE,
  );
  const [confirming, setConfirming] = useState(false);

  const origin =
    resolved.link.sourceModuleInstanceId !== null
      ? `a module output (${resolved.link.sourceParameterId})`
      : `${resolved.link.sourceKind.replace("_", " ")} ${resolved.link.sourceParameterId}`;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[12px] text-text-muted">
        Linked from {origin}
        {resolved.value === null
          ? " — its value comes from that module's calculation run"
          : ""}
        .
      </p>
      {linkedSourceStatus === "stale" || linkedSourceStatus === "not_run" ? (
        <p
          role="alert"
          className="text-[12px]"
          style={{ color: "var(--state-error)" }}
        >
          {LINKED_SOURCE_WARNING[linkedSourceStatus]}
        </p>
      ) : null}
      {!confirming ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="w-fit"
          onClick={() => setConfirming(true)}
        >
          <Link2Off aria-hidden="true" className="h-3.5 w-3.5" />
          Remove link
        </Button>
      ) : (
        <div className="flex flex-col gap-1.5 rounded-md border border-border-default p-2">
          <p className="text-[12px]" style={{ color: "var(--state-stale)" }}>
            {linkRemovalImpact > 0
              ? `Removing this link will mark ${linkRemovalImpact} other module${linkRemovalImpact === 1 ? "" : "s"} stale.`
              : "Removing this link will not affect any other module."}
          </p>
          <div className="flex items-center gap-2">
            <form action={formAction}>
              <input type="hidden" name="linkId" value={resolved.link.id} />
              <Button
                type="submit"
                size="sm"
                variant="destructive"
                disabled={isPending}
              >
                {isPending ? "Removing…" : "Confirm removal"}
              </Button>
            </form>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {state.status === "error" ? (
        <p
          role="alert"
          className="text-[12px]"
          style={{ color: "var(--state-error)" }}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
