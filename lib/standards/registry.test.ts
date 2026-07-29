import { describe, expect, it } from "vitest";
import { SourceRegistryError } from "./errors";
import {
  buildSourceRegistry,
  marketProfileKey,
  type SourceRegistry,
} from "./registry";
import {
  MARKET_PROFILES,
  SOURCE_DOCUMENTS,
  SOURCE_REGISTRY,
  SOURCE_REVISIONS,
} from "./registered";
import { usProfile } from "./profiles/us";
import {
  asSourceDocumentId,
  asSourceRevisionId,
  type MarketProfile,
  type SourceDocument,
  type SourceRevision,
} from "./types";

function doc(id: string, over: Partial<SourceDocument> = {}): SourceDocument {
  return {
    id: asSourceDocumentId(id),
    classification: "consensus_standard",
    title: `Document ${id}`,
    authority: "Test",
    market: "US",
    access: "public",
    ...over,
  };
}

function rev(id: string, documentId: string, over: Partial<SourceRevision> = {}): SourceRevision {
  return {
    id: asSourceRevisionId(id),
    documentId: asSourceDocumentId(documentId),
    edition: "2020",
    ...over,
  };
}

function build(
  documents: readonly SourceDocument[],
  revisions: readonly SourceRevision[],
  profiles: readonly MarketProfile[] = [],
): SourceRegistry {
  return buildSourceRegistry(documents, revisions, profiles);
}

function expectBuildError(
  fn: () => unknown,
  code: SourceRegistryError["code"],
): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(SourceRegistryError);
    expect((error as SourceRegistryError).code).toBe(code);
    return;
  }
  throw new Error(`expected SourceRegistryError(${code})`);
}

describe("released source registry", () => {
  it("loads all US and JP documents, revisions, and profiles", () => {
    expect(SOURCE_REGISTRY.listDocuments().length).toBe(SOURCE_DOCUMENTS.length);
    expect(SOURCE_REGISTRY.listRevisions().length).toBe(SOURCE_REVISIONS.length);
    expect(SOURCE_REGISTRY.listProfiles().length).toBe(MARKET_PROFILES.length);
  });

  it("exposes both market profiles", () => {
    expect(SOURCE_REGISTRY.getProfile("US-General-Industrial-Machinery")).toBeDefined();
    expect(SOURCE_REGISTRY.getProfile("JP-General-Industrial-Machinery")).toBeDefined();
  });

  it("includes the JP administrative_guidance source with a bilingual title", () => {
    const guideline = SOURCE_REGISTRY.getDocument("jp.mhlw.machinery_safety_guideline");
    expect(guideline?.classification).toBe("administrative_guidance");
    expect(guideline?.originalTitle).toBe("機械の包括的な安全基準に関する指針");
    expect(guideline?.originalLanguage).toBe("ja");
  });

  it("records the Japanese statute with its authoritative original title", () => {
    expect(SOURCE_REGISTRY.getDocument("jp.isha")?.originalTitle).toBe("労働安全衛生法");
  });

  it("registers NFPA 70 as a document with no baseline revision (project/AHJ edition)", () => {
    expect(SOURCE_REGISTRY.getDocument("us.nfpa.70")).toBeDefined();
    expect(SOURCE_REGISTRY.revisionsOf("us.nfpa.70")).toHaveLength(0);
  });

  it("stores no excerpt on any licensed source (licensing policy)", () => {
    for (const revision of SOURCE_REGISTRY.listRevisions()) {
      const document = SOURCE_REGISTRY.getDocument(revision.documentId);
      if (document?.access === "licensed") {
        expect(revision.excerpt).toBeUndefined();
      }
    }
  });

  it("derives the profile key in id@major form", () => {
    expect(marketProfileKey(usProfile)).toBe("US-General-Industrial-Machinery@1");
  });
});

describe("clause reference resolution (exit criterion)", () => {
  it("resolves a reference to an exact revision and location", () => {
    const resolved = SOURCE_REGISTRY.resolveReference({
      sourceRevisionId: asSourceRevisionId("jp.isha@1972"),
      clause: "Article 28-2",
    });
    expect(resolved.revision.id).toBe("jp.isha@1972");
    expect(resolved.document.id).toBe("jp.isha");
    expect(resolved.clause).toBe("Article 28-2");
  });

  it("rejects a reference with neither clause nor page", () => {
    expect(() =>
      SOURCE_REGISTRY.resolveReference({
        sourceRevisionId: asSourceRevisionId("jp.isha@1972"),
      }),
    ).toThrow(SourceRegistryError);
  });

  it("rejects a reference to an unknown revision", () => {
    expectBuildError(
      () =>
        SOURCE_REGISTRY.resolveReference({
          sourceRevisionId: asSourceRevisionId("does.not.exist@1"),
          page: 1,
        }),
      "unknown_revision",
    );
  });
});

describe("unique IDs", () => {
  it("rejects duplicate document IDs", () => {
    expectBuildError(() => build([doc("a"), doc("a")], []), "duplicate_document_id");
  });

  it("rejects duplicate revision IDs", () => {
    expectBuildError(
      () => build([doc("a")], [rev("a@1", "a"), rev("a@1", "a")]),
      "duplicate_revision_id",
    );
  });

  it("rejects duplicate profile IDs", () => {
    const profile: MarketProfile = {
      id: "P" as MarketProfile["id"],
      version: "1.0.0",
      market: "US",
      displayName: "P",
      scope: "s",
      verificationDate: "2026-07-28",
      disclaimer: "d",
      entries: [],
    };
    expectBuildError(() => build([], [], [profile, profile]), "duplicate_profile_id");
  });
});

describe("revision validity", () => {
  it("rejects a revision of an unknown document", () => {
    expectBuildError(() => build([], [rev("x@1", "missing")]), "unknown_document");
  });

  it("rejects a whitespace-only edition", () => {
    expectBuildError(
      () => build([doc("a")], [rev("a@1", "a", { edition: "   " })]),
      "missing_edition",
    );
  });

  it("rejects a reproduced excerpt on a licensed document", () => {
    expectBuildError(
      () =>
        build(
          [doc("a", { access: "licensed" })],
          [rev("a@1", "a", { excerpt: "protected text" })],
        ),
      "licensed_excerpt",
    );
  });

  it("allows an excerpt on a public document", () => {
    expect(() =>
      build([doc("a", { access: "public" })], [rev("a@1", "a", { excerpt: "ok" })]),
    ).not.toThrow();
  });
});

describe("supersession", () => {
  it("accepts a valid supersession chain", () => {
    const registry = build(
      [doc("a")],
      [rev("a@1", "a"), rev("a@2", "a", { supersedes: asSourceRevisionId("a@1") })],
    );
    expect(registry.getRevision("a@2")?.supersedes).toBe("a@1");
  });

  it("rejects a self-supersession", () => {
    expectBuildError(
      () => build([doc("a")], [rev("a@1", "a", { supersedes: asSourceRevisionId("a@1") })]),
      "self_supersession",
    );
  });

  it("rejects a supersession of an unknown revision", () => {
    expectBuildError(
      () => build([doc("a")], [rev("a@2", "a", { supersedes: asSourceRevisionId("a@1") })]),
      "unknown_supersession",
    );
  });

  it("rejects a supersession cycle", () => {
    expectBuildError(
      () =>
        build(
          [doc("a")],
          [
            rev("a@1", "a", { supersedes: asSourceRevisionId("a@2") }),
            rev("a@2", "a", { supersedes: asSourceRevisionId("a@1") }),
          ],
        ),
      "supersession_cycle",
    );
  });
});

describe("profile source references", () => {
  it("rejects a profile entry referencing an unknown revision", () => {
    const profile: MarketProfile = {
      id: "P" as MarketProfile["id"],
      version: "1.0.0",
      market: "US",
      displayName: "P",
      scope: "s",
      verificationDate: "2026-07-28",
      disclaimer: "d",
      entries: [
        {
          sourceRevisionId: asSourceRevisionId("missing@1"),
          applicability: "baseline",
          use: "u",
        },
      ],
    };
    expectBuildError(() => build([doc("a")], [rev("a@1", "a")], [profile]), "unknown_profile_source");
  });
});
