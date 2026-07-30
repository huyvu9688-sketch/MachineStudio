// lib/catalog owns manufacturer part specifications and deterministic
// matching: component-type schemas, manufacturer part revision
// validation, CSV import mapping, hard filters and transparent ranking,
// compatibility rules, and required-spec output. There is no
// company-approved-part layer in the MVP. See context/architecture.md.
//
// Unit 2.6 delivers the component-type attribute schema contracts;
// persistence lives in lib/db/repositories/catalog-repository.ts, the only
// boundary allowed to import Prisma. CSV import mapping and matching
// adapters (Units 2.7/2.8) extend this package without a Prisma schema
// change.

export type { ComponentAttributeFieldDefinition, ComponentAttributes } from "./types";
export {
  ComponentAttributeFieldDefinitionSchema,
  ComponentAttributeFieldListSchema,
  ComponentAttributesSchema,
} from "./schemas";
