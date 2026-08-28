// app/(workspace)/workspace/parse-submitted-field.ts
//
// Namespaced-field FormData parsing for the module workspace's single-form
// Save/Run model (module workspace save/run redesign, 2026-08-27). Duplicated
// from `setModuleInputValueAction`'s per-kind branches in `actions.ts` — a
// later task in this plan wires `saveModuleInputsAction` and
// `previewModuleComputationAction` to this shared parser and deletes
// `setModuleInputValueAction` once nothing references it, so the two copies
// stay in sync only until that task lands. Same never-trust-the-client-alone
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

/** Parses a load-case field, ignoring anything outside the declared set. Shared with `actions.ts` (`confirmSuggestedLinkAction`, `createLoadCaseAction`). */
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
 * as `setModuleInputValueAction` did before this extraction.
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
    // discipline the quantity/enum branches already apply (ui-context.md
    // "Server Actions"). A tampered request could otherwise write an
    // axis-framed vector onto a parameter whose real frame differs — exactly
    // what axis.v1 says must be rejected, not silently reinterpreted
    // (context/modules/axis-load-cases/stage-1-spec.md).
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
    // Never trust a client-supplied valueKind alone (the same discipline
    // the vector_quantity branch above already applies): a tampered
    // request could otherwise submit a boolean value for a parameter the
    // registry declares as a quantity/vector/enum, bypassing every kind
    // and unit check those branches perform.
    if (definition.valueType !== "boolean") {
      return { ok: false, message: "This parameter is not a boolean." };
    }
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
 * Whether a namespaced field group represents a genuinely optional field
 * left entirely untouched — safe to skip rather than parse/reject. True
 * only when `fields.<portKey>.required` is not "true" AND every one of the
 * field's own value sub-fields is blank (a quantity's magnitude; ALL THREE
 * of a vector's components — a PARTIALLY filled optional vector is a real
 * mistake, not "left alone", and must still fail validation normally). A
 * `boolean` field is never blank (a checkbox is always definitively true or
 * false) and never skippable. An `enum` field is blank when no option is
 * selected.
 *
 * Exists because `ModuleInputWorkspace` now submits every rendered
 * editable field in one form (module workspace save/run redesign,
 * 2026-08-27) — including fields the user never touched, left at their
 * default blank state. Without this check, `saveModuleInputsAction` and
 * `previewModuleComputationAction` would reject the whole submission on
 * the first untouched optional field, even when every required field was
 * filled in correctly.
 */
export function isSkippableBlankField(
  formData: FormData,
  portKey: string,
): boolean {
  if (fieldValue(formData, portKey, "required") === "true") {
    return false;
  }

  const valueKind = fieldValue(formData, portKey, "valueKind");
  if (valueKind === "quantity") {
    return fieldValue(formData, portKey, "magnitude").trim().length === 0;
  }
  if (valueKind === "vector_quantity") {
    return (
      fieldValue(formData, portKey, "component-0").trim().length === 0 &&
      fieldValue(formData, portKey, "component-1").trim().length === 0 &&
      fieldValue(formData, portKey, "component-2").trim().length === 0
    );
  }
  if (valueKind === "enum") {
    return fieldValue(formData, portKey, "option").trim().length === 0;
  }
  // "boolean" (never blank) and any unrecognized kind (let
  // `parseSubmittedField` report the real error) are never skippable.
  return false;
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
