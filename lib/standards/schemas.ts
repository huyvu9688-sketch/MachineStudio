// Structural (Zod) validation for the source/market metadata in ./types. Shape
// only — presence, types, enum membership, non-empty edition. Cross-record
// invariants (unique IDs, resolvable references, supersession acyclicity,
// licensed-excerpt restriction) are enforced in ./registry. Schemas are strict:
// unknown keys are rejected. See context/code-standards.md "Validation".

import { z } from "zod";
import type {
  ClauseReference,
  MarketProfile,
  MarketProfileEntry,
  SourceDocument,
  SourceDocumentId,
  SourceRevision,
  SourceRevisionId,
} from "./types";

const nonEmptyString = z.string().min(1);

const sourceDocumentId = nonEmptyString.transform(
  (value): SourceDocumentId => value as SourceDocumentId,
);
const sourceRevisionId = nonEmptyString.transform(
  (value): SourceRevisionId => value as SourceRevisionId,
);

const classification = z.enum([
  "federal_regulation",
  "administrative_guidance",
  "state_or_local_requirement",
  "consensus_standard",
  "certification_standard",
  "manufacturer_method",
  "engineering_handbook",
  "company_rule",
  "customer_requirement",
]);

const market = z.enum(["US", "JP"]);
const access = z.enum(["public", "licensed"]);
const applicability = z.enum(["baseline", "application_specific"]);

export const SourceDocumentSchema = z.strictObject({
  id: sourceDocumentId,
  classification,
  title: nonEmptyString,
  originalTitle: nonEmptyString.optional(),
  originalLanguage: nonEmptyString.optional(),
  authority: nonEmptyString,
  market,
  access,
  officialUrl: nonEmptyString.optional(),
  note: nonEmptyString.optional(),
});

export const SourceRevisionSchema = z.strictObject({
  id: sourceRevisionId,
  documentId: sourceDocumentId,
  edition: nonEmptyString,
  effectiveDate: nonEmptyString.optional(),
  supersedes: sourceRevisionId.optional(),
  officialUrl: nonEmptyString.optional(),
  excerpt: nonEmptyString.optional(),
  note: nonEmptyString.optional(),
});

export const ClauseReferenceSchema = z.strictObject({
  sourceRevisionId,
  clause: nonEmptyString.optional(),
  page: z.number().int().positive().optional(),
  label: nonEmptyString.optional(),
});

export const MarketProfileEntrySchema = z.strictObject({
  sourceRevisionId,
  applicability,
  use: nonEmptyString,
});

export const MarketProfileSchema = z.strictObject({
  id: nonEmptyString.transform((v) => v as MarketProfile["id"]),
  version: nonEmptyString,
  market,
  displayName: nonEmptyString,
  scope: nonEmptyString,
  verificationDate: nonEmptyString,
  disclaimer: nonEmptyString,
  entries: z.array(MarketProfileEntrySchema).readonly(),
});

/** Validates an unknown value as a well-formed {@link SourceDocument}. */
export function parseSourceDocument(input: unknown): SourceDocument {
  return SourceDocumentSchema.parse(input);
}

/** Validates an unknown value as a well-formed {@link SourceRevision}. */
export function parseSourceRevision(input: unknown): SourceRevision {
  return SourceRevisionSchema.parse(input);
}

/** Validates an unknown value as a well-formed {@link ClauseReference}. */
export function parseClauseReference(input: unknown): ClauseReference {
  return ClauseReferenceSchema.parse(input);
}

// --- Compile-time schema/interface parity guard -----------------------------

type MutuallyAssignable<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;

type Assert<T extends true> = T;

export type _SourceSchemaParity = [
  Assert<MutuallyAssignable<SourceDocument, z.infer<typeof SourceDocumentSchema>>>,
  Assert<MutuallyAssignable<SourceRevision, z.infer<typeof SourceRevisionSchema>>>,
  Assert<MutuallyAssignable<ClauseReference, z.infer<typeof ClauseReferenceSchema>>>,
  Assert<
    MutuallyAssignable<MarketProfileEntry, z.infer<typeof MarketProfileEntrySchema>>
  >,
  Assert<MutuallyAssignable<MarketProfile, z.infer<typeof MarketProfileSchema>>>,
];
