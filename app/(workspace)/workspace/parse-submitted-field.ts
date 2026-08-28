// app/(workspace)/workspace/parse-submitted-field.ts
//
// Namespaced-field FormData parsing for the module workspace's single-form
// Save/Run model (module workspace save/run redesign, 2026-08-27). Extracted
// from `setModuleInputValueAction`'s per-kind branches (still present in
// `actions.ts` as of this extraction) so `saveModuleInputsAction` and
// `previewModuleComputationAction` (a later task) can share one parser
// instead of duplicating validation — same never-trust-the-client-alone
// re-derivation of canonical unit/enum options/frame from the released
// registry.

import {
  SERIALIZATION_FORMAT_VERSION,
  getParameter,
  type EngineeringValue,
  type LoadCaseCategory,
} from "@/lib/engine";
import { parseSubmittedQuantity } from "./parse-submitted-quantity";
import { parseSubmittedVector } from "./parse-submitted-vector";

const LOAD_CASE_CATEGORIES = [
  "normal",
  "peak",
  "holding",
  "emergency_stop",
] as const;

/** Parses a load-case field, ignoring anything outside the declared set. Mirrors `actions.ts`'s `parseLoadCase`. */
export function parseLoadCase(raw: string): LoadCaseCategory | undefined {
  return (LOAD_CASE_CATEGORIES as readonly string[]).includes(raw)
    ? (raw as LoadCaseCategory)
    : undefined;
}

export type SubmittedFieldParseResult =
  | {
      readonly ok: true;
      readonly parameterId: string;
      readonly loadCase: LoadCaseCategory | undefined;
      readonly value: EngineeringValue;
    }
  | { readonly ok: false; readonly message: string };

function fieldValue(formData: FormData, portKey: string, name: string): string {
  const value = formData.get(`fields.${portKey}.${name}`);
  return typeof value === "string" ? value : "";
}

/**
 * Parses one namespaced field group (`fields.<portKey>.*`) into a validated
 * `EngineeringValue` in the parameter's canonical unit. `portKey` identifies
 * which group to read; `fields.<portKey>.parameterId` names the canonical
 * parameter, re-derived here (never trusted from the client alone) exactly
 * as `setModuleInputValueAction` does today. Byte-for-byte same error
 * messages and branch behavior as that action's quantity/vector_quantity/
 * enum/boolean branches, including the boolean branch's lack of a
 * `valueType` guard (any submission with `valueKind=boolean` is accepted).
 */
export function parseSubmittedField(
  formData: FormData,
  portKey: string,
): SubmittedFieldParseResult {
  const parameterId = fieldValue(formData, portKey, "parameterId");
  const definition = getParameter(parameterId);
  if (definition === undefined) {
    return { ok: false, message: `Unknown parameter "${parameterId}".` };
  }

  const valueKind = fieldValue(formData, portKey, "valueKind");
  let value: EngineeringValue;
  if (valueKind === "quantity") {
    if (definition.canonicalUnit === undefined) {
      return { ok: false, message: "This parameter has no canonical unit." };
    }
    const parsed = parseSubmittedQuantity(
      fieldValue(formData, portKey, "magnitude"),
      fieldValue(formData, portKey, "unit"),
      definition.canonicalUnit,
    );
    if (!parsed.ok) {
      return { ok: false, message: parsed.message };
    }
    value = parsed.value;
  } else if (valueKind === "vector_quantity") {
    // Never trust a client-supplied valueKind alone: re-derive the frame
    // from the registry, the same "never trust a client-supplied unit/enumId"
    // discipline the quantity/enum branches already apply
    // (ui-context.md "Server Actions").
    if (definition.frame !== "axis") {
      return {
        ok: false,
        message: "This parameter does not use the axis vector frame.",
      };
    }
    if (definition.canonicalUnit === undefined) {
      return { ok: false, message: "This parameter has no canonical unit." };
    }
    const parsed = parseSubmittedVector(
      [
        fieldValue(formData, portKey, "component-0"),
        fieldValue(formData, portKey, "component-1"),
        fieldValue(formData, portKey, "component-2"),
      ],
      fieldValue(formData, portKey, "unit"),
      definition.canonicalUnit,
      "axis",
    );
    if (!parsed.ok) {
      return { ok: false, message: parsed.message };
    }
    value = parsed.value;
  } else if (valueKind === "enum") {
    if (definition.enumId === undefined) {
      return { ok: false, message: "This parameter is not an enumeration." };
    }
    const option = fieldValue(formData, portKey, "option");
    if (!(definition.enumOptions ?? []).includes(option)) {
      return { ok: false, message: "Select a valid option." };
    }
    value = {
      v: SERIALIZATION_FORMAT_VERSION,
      kind: "enum",
      enumId: definition.enumId,
      value: option,
    };
  } else if (valueKind === "boolean") {
    value = {
      v: SERIALIZATION_FORMAT_VERSION,
      kind: "boolean",
      value: fieldValue(formData, portKey, "checked") === "true",
    };
  } else {
    return { ok: false, message: `Unsupported value kind "${valueKind}".` };
  }

  return {
    ok: true,
    parameterId,
    loadCase: parseLoadCase(fieldValue(formData, portKey, "loadCase")),
    value,
  };
}

/**
 * Every port key with a submitted `fields.<portKey>.valueKind` group. The
 * client only ever renders that group for a manual/workflow/default,
 * non-disabled, editable field (`ModuleInputWorkspace`'s `FieldControl`
 * branch) — a `linked`, `disabled`, or `unsupported` port never has one, so
 * this list doubles as "which ports the client is allowed to edit" without a
 * second server-side derivation.
 */
export function submittedPortKeys(formData: FormData): readonly string[] {
  const keys = new Set<string>();
  for (const key of formData.keys()) {
    const match = /^fields\.(.+)\.valueKind$/.exec(key);
    if (match) {
      keys.add(match[1]);
    }
  }
  return [...keys];
}
