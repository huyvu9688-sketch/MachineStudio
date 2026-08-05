import { describe, expect, it } from "vitest";
import {
  ClauseReferenceSchema,
  SourceDocumentSchema,
  SourceRevisionSchema,
  parseClauseReference,
} from "./schemas";

const validDocument = {
  id: "us.osha.1910_212",
  classification: "federal_regulation",
  title: "General requirements for all machines",
  authority: "OSHA",
  market: "US",
  access: "public",
} as const;

const validRevision = {
  id: "us.osha.1910_212@current",
  documentId: "us.osha.1910_212",
  edition: "current",
} as const;

describe("SourceDocumentSchema", () => {
  it("accepts a well-formed document", () => {
    expect(SourceDocumentSchema.safeParse(validDocument).success).toBe(true);
  });

  it("accepts bilingual title fields", () => {
    const result = SourceDocumentSchema.safeParse({
      ...validDocument,
      id: "jp.isha",
      market: "JP",
      originalTitle: "労働安全衛生法",
      originalLanguage: "ja",
    });
    expect(result.success).toBe(true);
  });

  it("accepts the administrative_guidance classification", () => {
    const result = SourceDocumentSchema.safeParse({
      ...validDocument,
      classification: "administrative_guidance",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown keys (strict)", () => {
    expect(
      SourceDocumentSchema.safeParse({ ...validDocument, extra: 1 }).success,
    ).toBe(false);
  });

  it("rejects an unknown classification", () => {
    expect(
      SourceDocumentSchema.safeParse({
        ...validDocument,
        classification: "guess",
      }).success,
    ).toBe(false);
  });

  it("rejects a market outside US/JP", () => {
    expect(
      SourceDocumentSchema.safeParse({ ...validDocument, market: "EU" })
        .success,
    ).toBe(false);
  });
});

describe("SourceRevisionSchema", () => {
  it("accepts a well-formed revision", () => {
    expect(SourceRevisionSchema.safeParse(validRevision).success).toBe(true);
  });

  it("rejects an empty edition (missing edition)", () => {
    expect(
      SourceRevisionSchema.safeParse({ ...validRevision, edition: "" }).success,
    ).toBe(false);
  });

  it("rejects a missing edition field", () => {
    const withoutEdition: Record<string, unknown> = { ...validRevision };
    delete withoutEdition.edition;
    expect(SourceRevisionSchema.safeParse(withoutEdition).success).toBe(false);
  });
});

describe("ClauseReferenceSchema", () => {
  it("accepts a clause reference with a clause", () => {
    const result = ClauseReferenceSchema.safeParse({
      sourceRevisionId: "us.osha.1910_212@current",
      clause: "1910.212(a)(1)",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-positive page", () => {
    const result = ClauseReferenceSchema.safeParse({
      sourceRevisionId: "us.osha.1910_212@current",
      page: 0,
    });
    expect(result.success).toBe(false);
  });

  it("parseClauseReference throws on malformed input", () => {
    expect(() => parseClauseReference({})).toThrow();
  });
});
