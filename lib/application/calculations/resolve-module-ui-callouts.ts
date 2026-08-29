import type { ModuleUiCallout } from "@/lib/engine";
import type { ResolvedInputSource } from "@/lib/db";

export interface ModuleWorkspaceCalloutView {
  readonly title: string;
  readonly imagePath: string;
  readonly alt: string;
  readonly text: string | null;
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
    };
  });
}