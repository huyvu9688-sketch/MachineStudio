import type { ModuleUiCallout } from "@/lib/engine";
import type { ResolvedInputSource } from "@/lib/db";

export interface ModuleWorkspaceCalloutCaseSelectorView {
  readonly portKey: string;
  readonly selectedValue: string | undefined;
  readonly cases: readonly { readonly value: string; readonly text: string }[];
}

export interface ModuleWorkspaceCalloutView {
  readonly title: string;
  readonly imagePath: string;
  readonly alt: string;
  readonly text: string | null;
  /**
   * Present only when the callout declares `caseText` — lets the workspace
   * render the illustration's per-case regions as clickable hotspots that
   * set `portKey` directly, instead of requiring the paired dropdown.
   */
  readonly caseSelector?: ModuleWorkspaceCalloutCaseSelectorView;
}

/** Resolves declarative callout copy without allowing a module to render UI itself. */
export function resolveModuleUiCallouts(
  callouts: readonly ModuleUiCallout[] | undefined,
  resolvedByPortKey: ReadonlyMap<string, ResolvedInputSource>,
): readonly ModuleWorkspaceCalloutView[] {
  return (callouts ?? []).map((callout) => {
    const resolved =
      callout.caseText === undefined
        ? undefined
        : resolvedByPortKey.get(callout.caseText.portKey);
    const selectedValue =
      resolved?.source !== "default" && resolved?.value?.kind === "enum"
        ? resolved.value.value
        : undefined;
    const text =
      callout.caseText?.cases.find((entry) => entry.value === selectedValue)
        ?.text ?? null;

    return {
      title: callout.title,
      imagePath: callout.imagePath,
      alt: callout.alt,
      text,
      caseSelector:
        callout.caseText === undefined
          ? undefined
          : {
              portKey: callout.caseText.portKey,
              selectedValue,
              cases: callout.caseText.cases,
            },
    };
  });
}