// The source and market-profile registry loader (Unit 1.4). `buildSourceRegistry`
// validates a set of source documents, revisions, and market profiles against
// the registry invariants and returns an immutable, queryable registry. The
// released singleton and lookups are built from the US/JP seeds in ./profiles.
//
// Invariants enforced here (beyond the structural checks in ./schemas):
//  - unique document, revision, and profile IDs
//  - every revision belongs to an existing document; edition is non-empty
//  - a licensed document's revisions carry no reproduced excerpt
//  - supersession targets exist, are not self-referential, and are acyclic
//  - every profile entry references an existing revision
//  - a clause reference resolves to an exact revision and location

import { SourceRegistryError } from "./errors";
import {
  MarketProfileSchema,
  SourceDocumentSchema,
  SourceRevisionSchema,
} from "./schemas";
import type {
  ClauseReference,
  MarketProfile,
  SourceDocument,
  SourceRevision,
  SourceRevisionId,
} from "./types";

/** A clause reference resolved to its document, revision, and location. */
export interface ResolvedReference {
  readonly document: SourceDocument;
  readonly revision: SourceRevision;
  readonly clause?: string;
  readonly page?: number;
  readonly label?: string;
}

/** A validated, immutable source and market-profile registry. */
export interface SourceRegistry {
  getDocument(id: string): SourceDocument | undefined;
  getRevision(id: string): SourceRevision | undefined;
  getProfile(id: string): MarketProfile | undefined;
  listDocuments(): readonly SourceDocument[];
  listRevisions(): readonly SourceRevision[];
  listProfiles(): readonly MarketProfile[];
  /** All revisions of a document, in registration order. */
  revisionsOf(documentId: string): readonly SourceRevision[];
  /**
   * Resolves a clause reference to its exact revision, document, and location.
   *
   * @throws {@link SourceRegistryError} (`invalid_clause_reference`) when the
   *   reference has neither clause nor page, or (`unknown_revision`) when the
   *   cited revision is not registered.
   */
  resolveReference(ref: ClauseReference): ResolvedReference;
}

function fail(
  code: SourceRegistryError["code"],
  message: string,
  subjectId?: string,
): never {
  throw new SourceRegistryError(code, message, subjectId);
}

/**
 * The profile key in `id@major` form (e.g. `"US-General-Industrial-Machinery@1"`),
 * derived from the profile's semantic version. This is the identifier used in
 * the domain model and on baselines.
 */
export function marketProfileKey(profile: MarketProfile): string {
  const major = profile.version.split(".")[0] ?? "0";
  return `${profile.id}@${major}`;
}

function validateDocuments(
  documents: readonly SourceDocument[],
): Map<string, SourceDocument> {
  const byId = new Map<string, SourceDocument>();
  for (const raw of documents) {
    const result = SourceDocumentSchema.safeParse(raw);
    if (!result.success) {
      fail(
        "invalid_shape",
        `Malformed source document: ${result.error.message}`,
        raw.id,
      );
    }
    const doc = result.data;
    if (byId.has(doc.id)) {
      fail(
        "duplicate_document_id",
        `Duplicate source document ID "${doc.id}".`,
        doc.id,
      );
    }
    byId.set(doc.id, doc);
  }
  return byId;
}

function validateRevisions(
  revisions: readonly SourceRevision[],
  documents: ReadonlyMap<string, SourceDocument>,
): Map<string, SourceRevision> {
  const byId = new Map<string, SourceRevision>();
  for (const raw of revisions) {
    const result = SourceRevisionSchema.safeParse(raw);
    if (!result.success) {
      fail(
        "invalid_shape",
        `Malformed source revision: ${result.error.message}`,
        raw.id,
      );
    }
    const rev = result.data;
    if (byId.has(rev.id)) {
      fail(
        "duplicate_revision_id",
        `Duplicate source revision ID "${rev.id}".`,
        rev.id,
      );
    }
    const doc = documents.get(rev.documentId);
    if (doc === undefined) {
      fail(
        "unknown_document",
        `Revision "${rev.id}" refers to unknown document "${rev.documentId}".`,
        rev.id,
      );
    }
    if (rev.edition.trim() === "") {
      fail(
        "missing_edition",
        `Revision "${rev.id}" has an empty edition.`,
        rev.id,
      );
    }
    if (rev.excerpt !== undefined && doc.access === "licensed") {
      fail(
        "licensed_excerpt",
        `Revision "${rev.id}" of licensed document "${doc.id}" must not reproduce an excerpt.`,
        rev.id,
      );
    }
    byId.set(rev.id, rev);
  }
  validateSupersession(byId);
  return byId;
}

function validateSupersession(byId: ReadonlyMap<string, SourceRevision>): void {
  for (const rev of byId.values()) {
    if (rev.supersedes === undefined) continue;
    if (rev.supersedes === rev.id) {
      fail(
        "self_supersession",
        `Revision "${rev.id}" cannot supersede itself.`,
        rev.id,
      );
    }
    const seen = new Set<string>([rev.id]);
    let current: SourceRevision = rev;
    while (current.supersedes !== undefined) {
      const nextId: SourceRevisionId = current.supersedes;
      const next = byId.get(nextId);
      if (next === undefined) {
        fail(
          "unknown_supersession",
          `Revision "${current.id}" supersedes unknown "${nextId}".`,
          current.id,
        );
      }
      if (seen.has(next.id)) {
        fail(
          "supersession_cycle",
          `Supersession cycle involving "${rev.id}".`,
          rev.id,
        );
      }
      seen.add(next.id);
      current = next;
    }
  }
}

function validateProfiles(
  profiles: readonly MarketProfile[],
  revisions: ReadonlyMap<string, SourceRevision>,
): Map<string, MarketProfile> {
  const byId = new Map<string, MarketProfile>();
  for (const raw of profiles) {
    const result = MarketProfileSchema.safeParse(raw);
    if (!result.success) {
      fail(
        "invalid_shape",
        `Malformed market profile: ${result.error.message}`,
        raw.id,
      );
    }
    const profile = result.data;
    if (byId.has(profile.id)) {
      fail(
        "duplicate_profile_id",
        `Duplicate market profile ID "${profile.id}".`,
        profile.id,
      );
    }
    for (const entry of profile.entries) {
      if (!revisions.has(entry.sourceRevisionId)) {
        fail(
          "unknown_profile_source",
          `Profile "${profile.id}" references unknown revision "${entry.sourceRevisionId}".`,
          profile.id,
        );
      }
    }
    byId.set(profile.id, profile);
  }
  return byId;
}

/**
 * Validates the given documents, revisions, and profiles and returns an
 * immutable {@link SourceRegistry}.
 *
 * @throws {@link SourceRegistryError} on any invariant violation.
 */
export function buildSourceRegistry(
  documents: readonly SourceDocument[],
  revisions: readonly SourceRevision[],
  profiles: readonly MarketProfile[],
): SourceRegistry {
  const documentsById = validateDocuments(documents);
  const revisionsById = validateRevisions(revisions, documentsById);
  const profilesById = validateProfiles(profiles, revisionsById);

  const revisionsByDocument = new Map<string, SourceRevision[]>();
  for (const rev of revisionsById.values()) {
    const list = revisionsByDocument.get(rev.documentId) ?? [];
    list.push(rev);
    revisionsByDocument.set(rev.documentId, list);
  }

  return {
    getDocument: (id) => documentsById.get(id),
    getRevision: (id) => revisionsById.get(id),
    getProfile: (id) => profilesById.get(id),
    listDocuments: () => [...documentsById.values()],
    listRevisions: () => [...revisionsById.values()],
    listProfiles: () => [...profilesById.values()],
    revisionsOf: (documentId) => revisionsByDocument.get(documentId) ?? [],
    resolveReference: (ref) => {
      if (ref.clause === undefined && ref.page === undefined) {
        fail(
          "invalid_clause_reference",
          `Clause reference to "${ref.sourceRevisionId}" has neither clause nor page.`,
          ref.sourceRevisionId,
        );
      }
      const revision = revisionsById.get(ref.sourceRevisionId);
      if (revision === undefined) {
        fail(
          "unknown_revision",
          `Clause reference cites unknown revision "${ref.sourceRevisionId}".`,
          ref.sourceRevisionId,
        );
      }
      // documentId is guaranteed present by validateRevisions.
      const document = documentsById.get(revision.documentId) as SourceDocument;
      return {
        document,
        revision,
        ...(ref.clause !== undefined && { clause: ref.clause }),
        ...(ref.page !== undefined && { page: ref.page }),
        ...(ref.label !== undefined && { label: ref.label }),
      };
    },
  };
}
