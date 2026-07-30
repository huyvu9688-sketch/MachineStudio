// Component-type attribute schema contracts (Unit 2.6; context/architecture.md
// "lib/catalog/": "Component-type schemas"). A `ComponentSchemaVersion` row
// declares which attribute keys a manufacturer part revision of its component
// type carries; each field's value is validated generically as an
// `EngineeringValue` (Unit 1.1) — the same value contract module ports use —
// so adding a new component type is a new schema-version row, never a Prisma
// schema change (Unit 2.6 exit criterion: "Two component types with different
// attributes coexist without a Prisma schema change").
//
// Stronger validation — that a specific part revision's `attributes` actually
// satisfies its declared field list (required keys present, kind/unit match)
// — is deferred to the catalog CSV import (Unit 2.7) and matching (Unit 2.8)
// services, mirroring the Unit 2.2 architecture decision to defer semantic
// parameter-link compatibility to the confirm/suggestion flow rather than the
// schema unit.

import type { EngineeringValue, EngineeringValueKind } from "../engine/values";

/**
 * One attribute a component type's schema version declares. `key` indexes
 * into a {@link ComponentAttributes} payload; `valueKind` names which
 * `EngineeringValue` member the attribute must be.
 */
export interface ComponentAttributeFieldDefinition {
  /** Attribute key within `ManufacturerPartRevision.attributes`. Non-empty. */
  readonly key: string;
  readonly label: string;
  readonly valueKind: EngineeringValueKind;
  readonly required: boolean;
  /** Meaningful for `quantity`/`vector_quantity` fields: canonical unit symbol. */
  readonly unit?: string;
  /** Meaningful for `enum` fields: the enumeration identifier. */
  readonly enumId?: string;
}

/**
 * A component-specific attribute payload: an attribute key mapped to its
 * `EngineeringValue`. Stored as the `attributes` JSONB on a
 * `ManufacturerPartRevision`, validated generically — every value must be a
 * well-formed `EngineeringValue` — on write and read.
 */
export type ComponentAttributes = Readonly<Record<string, EngineeringValue>>;
