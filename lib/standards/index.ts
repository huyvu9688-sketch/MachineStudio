// lib/standards owns source and market-profile metadata (Unit 1.4): source
// documents and editions, clause references, source classification,
// applicability metadata, licensing/access notes, supersession relationships,
// and the US/JP market profiles. It stores references and implementation
// metadata only — never unlicensed standards text. See context/architecture.md
// and ./README.md.

export type {
  MarketCode,
  SourceClassification,
  SourceAccess,
  SourceDocumentId,
  SourceRevisionId,
  MarketProfileId,
  SourceDocument,
  SourceRevision,
  ClauseReference,
  SourceApplicability,
  MarketProfileEntry,
  MarketProfile,
} from "./types";
export {
  asSourceDocumentId,
  asSourceRevisionId,
  asMarketProfileId,
} from "./types";

export {
  SourceDocumentSchema,
  SourceRevisionSchema,
  ClauseReferenceSchema,
  MarketProfileEntrySchema,
  MarketProfileSchema,
  parseSourceDocument,
  parseSourceRevision,
  parseClauseReference,
} from "./schemas";

export {
  SourceRegistryError,
  type SourceRegistryErrorCode,
} from "./errors";

export type { ResolvedReference, SourceRegistry } from "./registry";
export { buildSourceRegistry, marketProfileKey } from "./registry";

export {
  SOURCE_DOCUMENTS,
  SOURCE_REVISIONS,
  MARKET_PROFILES,
  SOURCE_REGISTRY,
} from "./registered";
