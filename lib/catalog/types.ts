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

/**
 * Lifecycle of a manufacturer part, when known (context/code-standards.md
 * "Catalog"). `undefined`/absent means unknown. Owned here (not
 * `lib/db`) because part-revision identity/lifecycle is a catalog validation
 * concern — `lib/db/repositories/catalog-types.ts` imports this rather than
 * redeclaring it, the same cross-package pattern
 * `lib/engine/parameters`' `LoadCaseCategory` already follows. The Prisma enum
 * of the same name (`prisma/schema.prisma`) is the persisted mirror.
 */
export type PartLifecycleStatus =
  "active" | "not_recommended_for_new_design" | "obsolete" | "discontinued";

/**
 * Data-quality state of an imported/entered manufacturer part revision
 * (project-overview.md "Manufacturer Part Data": "Data quality status and
 * validation errors"). See {@link PartLifecycleStatus} for why this is owned
 * here rather than in `lib/db`.
 */
export type DataQualityStatus = "valid" | "warning" | "error";

/**
 * A manual/custom part record for a `ComponentAssignment` with no catalog
 * backing (Unit 2.8; context/ui-context.md "Catalog and Assignment UI":
 * "Manual/custom part entry is supported"). Deliberately minimal — a full
 * manual-part entry form is a Unit 3.6 UI concern; this is the least
 * persistence shape the Unit 2.8 exit criterion ("assigned parts can
 * populate the BOM") needs. Owned here, not `lib/db`, mirroring
 * {@link PartLifecycleStatus}'s placement.
 */
export interface ManualPartDetails {
  readonly description: string;
  readonly manufacturerName?: string;
  readonly partNumber?: string;
  readonly notes?: string;
}
