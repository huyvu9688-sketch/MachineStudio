// The released source and market-profile registry singleton (Unit 1.4).
// Building it runs every registry invariant over the US/JP seeds, so an invalid
// seed fails fast at import time. Convenience lookups bind to this singleton;
// tests that exercise invariants with fixtures use `buildSourceRegistry`
// directly.

import { jpDocuments, jpProfile, jpRevisions } from "./profiles/jp";
import { usDocuments, usProfile, usRevisions } from "./profiles/us";
import { buildSourceRegistry, type SourceRegistry } from "./registry";
import type { MarketProfile, SourceDocument, SourceRevision } from "./types";

/** All released source documents (US + JP), in seed order. */
export const SOURCE_DOCUMENTS: readonly SourceDocument[] = [
  ...usDocuments,
  ...jpDocuments,
];

/** All released source revisions (US + JP), in seed order. */
export const SOURCE_REVISIONS: readonly SourceRevision[] = [
  ...usRevisions,
  ...jpRevisions,
];

/** All released market profiles. */
export const MARKET_PROFILES: readonly MarketProfile[] = [usProfile, jpProfile];

/** The released source and market-profile registry. */
export const SOURCE_REGISTRY: SourceRegistry = buildSourceRegistry(
  SOURCE_DOCUMENTS,
  SOURCE_REVISIONS,
  MARKET_PROFILES,
);
