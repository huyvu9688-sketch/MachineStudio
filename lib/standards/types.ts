// lib/standards owns source and market-profile metadata (Unit 1.4): source
// documents and editions, clause references, source classification,
// applicability metadata, licensing/access notes, supersession relationships,
// and the US/JP market profiles. It stores references and implementation
// metadata only — never unlicensed standards text (context/architecture.md
// "lib/standards"; context/*-market-profile.md licensing policy).
//
// Runtime validation lives in ./schemas (shape) and ./registry (cross-record
// invariants). This layer imports only its own types and `zod`.

/** Market this metadata applies to. Profiles beyond US/JP are deferred. */
export type MarketCode = "US" | "JP";

/**
 * How a source is classified. Reports must not represent these as legally
 * equivalent (context/us-market-profile.md, context/jp-market-profile.md).
 * `administrative_guidance` is required by the Japan profile (non-binding
 * ministry guidelines/notifications).
 */
export type SourceClassification =
  | "federal_regulation"
  | "administrative_guidance"
  | "state_or_local_requirement"
  | "consensus_standard"
  | "certification_standard"
  | "manufacturer_method"
  | "engineering_handbook"
  | "company_rule"
  | "customer_requirement";

/**
 * Reproduction access of a source. `public` sources (e.g. US federal
 * regulations) permit a short permitted excerpt; `licensed` sources (e.g. JIS,
 * ANSI, NFPA, UL) permit metadata and clause references only — no reproduced
 * tables, figures, equations, or substantial text.
 */
export type SourceAccess = "public" | "licensed";

/** Stable identifier of a {@link SourceDocument}, e.g. `"us.osha.1910_212"`. */
export type SourceDocumentId = string & {
  readonly __brand: "SourceDocumentId";
};

/** Stable identifier of a {@link SourceRevision}, e.g. `"us.ansi.b11_0@2023"`. */
export type SourceRevisionId = string & {
  readonly __brand: "SourceRevisionId";
};

/** Stable identifier of a {@link MarketProfile}. */
export type MarketProfileId = string & { readonly __brand: "MarketProfileId" };

/** Casts a raw string to a {@link SourceDocumentId}. Identity at runtime. */
export function asSourceDocumentId(id: string): SourceDocumentId {
  return id as SourceDocumentId;
}

/** Casts a raw string to a {@link SourceRevisionId}. Identity at runtime. */
export function asSourceRevisionId(id: string): SourceRevisionId {
  return id as SourceRevisionId;
}

/** Casts a raw string to a {@link MarketProfileId}. Identity at runtime. */
export function asMarketProfileId(id: string): MarketProfileId {
  return id as MarketProfileId;
}

/**
 * An edition-independent source document identity (a law, regulation, standard,
 * handbook, or company/customer rule).
 */
export interface SourceDocument {
  /** Stable document ID. */
  readonly id: SourceDocumentId;
  /** Source classification. */
  readonly classification: SourceClassification;
  /** English / working title. */
  readonly title: string;
  /**
   * Authoritative original-language title where it differs from `title`. For
   * Japanese statutes/guidelines this is the legally authoritative Japanese
   * title; `title` is then an unofficial working translation.
   */
  readonly originalTitle?: string;
  /** BCP-47-ish language tag of `originalTitle`, e.g. `"ja"`. */
  readonly originalLanguage?: string;
  /** Issuing/publishing body, e.g. `"OSHA"`, `"MHLW"`, `"JSA"`. */
  readonly authority: string;
  /** Market the document belongs to. */
  readonly market: MarketCode;
  /** Reproduction access class. */
  readonly access: SourceAccess;
  /** Official metadata link. */
  readonly officialUrl?: string;
  /** Our own summary/description (no reproduced licensed text). */
  readonly note?: string;
}

/**
 * A specific, immutable edition of a {@link SourceDocument}. Released source
 * revisions are immutable references: released modules keep citing their
 * original revision (context/code-standards.md "Standards and Sources").
 */
export interface SourceRevision {
  /** Stable revision ID. */
  readonly id: SourceRevisionId;
  /** The document this is an edition of. */
  readonly documentId: SourceDocumentId;
  /** Edition/version label, e.g. `"2023"`, `"Act No. 57 of 1972"`. Non-empty. */
  readonly edition: string;
  /** Effective date (ISO) where known. */
  readonly effectiveDate?: string;
  /** Revision this edition supersedes, where applicable. */
  readonly supersedes?: SourceRevisionId;
  /** Edition-specific official link, where it differs from the document's. */
  readonly officialUrl?: string;
  /**
   * A short permitted quotation. Allowed only for `public` documents; a
   * `licensed` document's revisions must not carry one.
   */
  readonly excerpt?: string;
  /** Our own edition note (no reproduced licensed text). */
  readonly note?: string;
}

/**
 * A pointer to an exact location within a source revision, used by calculation
 * traces and checks to cite their basis. A location requires at least a clause
 * or a page.
 */
export interface ClauseReference {
  /** The cited source revision. */
  readonly sourceRevisionId: SourceRevisionId;
  /** Clause/article/section identifier, e.g. `"1910.212(a)(1)"`, `"Article 28-2"`. */
  readonly clause?: string;
  /** Page number where applicable. */
  readonly page?: number;
  /** Optional human-readable label for the location. */
  readonly label?: string;
}

/** Whether a profile source is loaded for every project or only when applicable. */
export type SourceApplicability = "baseline" | "application_specific";

/** One source reference within a {@link MarketProfile}. */
export interface MarketProfileEntry {
  /** The referenced source revision. */
  readonly sourceRevisionId: SourceRevisionId;
  /** Whether the source is baseline or added only when the machine requires it. */
  readonly applicability: SourceApplicability;
  /** How the source is used in MachineStudio. */
  readonly use: string;
}

/**
 * A market's reference-and-applicability bundle. A project selects one primary
 * profile at creation and may add project-specific sources. A profile is a
 * reference layer, not an automatic compliance certificate.
 */
export interface MarketProfile {
  /** Stable profile ID, e.g. `"US-General-Industrial-Machinery"`. */
  readonly id: MarketProfileId;
  /** Semantic version, e.g. `"1.0.0-draft"`. */
  readonly version: string;
  /** Market the profile serves. */
  readonly market: MarketCode;
  /** Display name. */
  readonly displayName: string;
  /** Scope statement. */
  readonly scope: string;
  /** Initial verification date (ISO). */
  readonly verificationDate: string;
  /** No-compliance-overclaim disclaimer (our own words). */
  readonly disclaimer: string;
  /** Referenced sources. */
  readonly entries: readonly MarketProfileEntry[];
}
