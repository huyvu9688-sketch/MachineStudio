// Seed data for the JP-General-Industrial-Machinery market profile (Unit 1.4).
// Metadata only, from context/jp-market-profile.md. Japanese titles are the
// authoritative identifiers; English titles are working translations. Statutes
// and the MHLW guideline record their Japanese `originalTitle`; JIS documents
// are language-neutral by number and are licensed (no excerpt). Official law
// translations are unofficial references.

import {
  asSourceDocumentId,
  asSourceRevisionId,
  type MarketProfile,
  type SourceDocument,
  type SourceRevision,
} from "../types";

export const jpDocuments: readonly SourceDocument[] = [
  {
    id: asSourceDocumentId("jp.isha"),
    classification: "federal_regulation",
    title: "Industrial Safety and Health Act",
    originalTitle: "労働安全衛生法",
    originalLanguage: "ja",
    authority: "Government of Japan (MHLW)",
    market: "JP",
    access: "public",
    officialUrl: "https://www.japaneselawtranslation.go.jp/en/laws/view/3440/en",
    note: "Act No. 57 of 1972. Article 28-2 risk assessment (effort obligation since April 2006), Article 42 structural standards for specified machines, and Chapter V machine regulations. The Japanese text is authoritative; the English translation is unofficial.",
  },
  {
    id: asSourceDocumentId("jp.oshr"),
    classification: "federal_regulation",
    title: "Ordinance on Industrial Safety and Health",
    originalTitle: "労働安全衛生規則",
    originalLanguage: "ja",
    authority: "MHLW",
    market: "JP",
    access: "public",
    officialUrl: "https://www.japaneselawtranslation.go.jp/en/laws/view/3878/en",
    note: "MHLW ministerial ordinance. Machine-specific guarding, equipment, and work provisions when applicable, including industrial-robot provisions.",
  },
  {
    id: asSourceDocumentId("jp.mhlw.machinery_safety_guideline"),
    classification: "administrative_guidance",
    title: "Guidelines for Comprehensive Safety Standards of Machinery",
    originalTitle: "機械の包括的な安全基準に関する指針",
    originalLanguage: "ja",
    authority: "MHLW Labour Standards Bureau",
    market: "JP",
    access: "public",
    officialUrl: "https://www.mhlw.go.jp/content/11300000/001408310.pdf",
    note: "MHLW Labour Standards Bureau notification; issued 2001, fully revised 2007-07-31 as 基発第0731001号. Comprehensive machinery safety and risk-assessment guidance aligned with ISO 12100 and ISO/IEC Guide 51; the detailed machine-safety guidance connected to Article 28-2.",
  },
  {
    id: asSourceDocumentId("jp.jis.b9700"),
    classification: "consensus_standard",
    title:
      "JIS B 9700:2013 — Safety of machinery — General principles for design, risk assessment and risk reduction",
    authority: "JSA / JISC",
    market: "JP",
    access: "licensed",
    officialUrl: "https://www.jisc.go.jp",
    note: "Identical (IDT) adoption of ISO 12100:2010. Licensed publication — metadata and clause references only.",
  },
  {
    id: asSourceDocumentId("jp.jis.b9705_1"),
    classification: "consensus_standard",
    title:
      "JIS B 9705-1:2019 — Safety of machinery — Safety-related parts of control systems — Part 1: General principles for design",
    authority: "JSA / JISC",
    market: "JP",
    access: "licensed",
    officialUrl: "https://www.jisc.go.jp",
    note: "Identical (IDT) adoption of ISO 13849-1:2015. Encode performance-level checks only after separate validation planning.",
  },
  {
    id: asSourceDocumentId("jp.jis.b9960_1"),
    classification: "consensus_standard",
    title:
      "JIS B 9960-1:2019 — Safety of machinery — Electrical equipment of machines — Part 1: General requirements",
    authority: "JSA / JISC",
    market: "JP",
    access: "licensed",
    officialUrl: "https://www.jisc.go.jp",
    note: "Modified (MOD) adoption of IEC 60204-1:2016. Detailed electrical design is outside the mechanical MVP.",
  },
];

export const jpRevisions: readonly SourceRevision[] = [
  {
    id: asSourceRevisionId("jp.isha@1972"),
    documentId: asSourceDocumentId("jp.isha"),
    edition: "Act No. 57 of 1972",
    effectiveDate: "1972",
  },
  {
    id: asSourceRevisionId("jp.oshr@current"),
    documentId: asSourceDocumentId("jp.oshr"),
    edition: "current",
    note: "MHLW ordinance in force; confirm the operative amendment for the project.",
  },
  {
    id: asSourceRevisionId("jp.mhlw.machinery_safety_guideline@2007-07-31"),
    documentId: asSourceDocumentId("jp.mhlw.machinery_safety_guideline"),
    edition: "2007-07-31 (基発第0731001号)",
    effectiveDate: "2007-07-31",
  },
  {
    id: asSourceRevisionId("jp.jis.b9700@2013"),
    documentId: asSourceDocumentId("jp.jis.b9700"),
    edition: "2013",
    effectiveDate: "2013",
  },
  {
    id: asSourceRevisionId("jp.jis.b9705_1@2019"),
    documentId: asSourceDocumentId("jp.jis.b9705_1"),
    edition: "2019",
    effectiveDate: "2019",
  },
  {
    id: asSourceRevisionId("jp.jis.b9960_1@2019"),
    documentId: asSourceDocumentId("jp.jis.b9960_1"),
    edition: "2019",
    effectiveDate: "2019",
  },
];

export const jpProfile: MarketProfile = {
  id: "JP-General-Industrial-Machinery" as MarketProfile["id"],
  version: "1.0.0-draft",
  market: "JP",
  displayName: "Japan General Industrial Machinery",
  scope: "General industrial automated machinery designed for use in Japan.",
  verificationDate: "2026-07-28",
  disclaimer:
    "Initial regulatory and consensus-standard reference structure. Not legal advice, certification, or proof that a complete machine complies with all applicable requirements. Applicability depends on machine type, process, installation site, customer specifications, and the competent Labor Standards Inspection Office. Japanese titles and texts are legally authoritative; English titles are working translations.",
  entries: [
    {
      sourceRevisionId: asSourceRevisionId("jp.isha@1972"),
      applicability: "baseline",
      use: "Risk-assessment obligation reference and future risk-reduction checklists.",
    },
    {
      sourceRevisionId: asSourceRevisionId("jp.oshr@current"),
      applicability: "baseline",
      use: "Machine-specific guarding, equipment, and work provisions when applicable, including industrial-robot provisions.",
    },
    {
      sourceRevisionId: asSourceRevisionId(
        "jp.mhlw.machinery_safety_guideline@2007-07-31",
      ),
      applicability: "baseline",
      use: "Primary Japanese risk-assessment methodology reference for later safety support.",
    },
    {
      sourceRevisionId: asSourceRevisionId("jp.jis.b9700@2013"),
      applicability: "baseline",
      use: "Risk-assessment and risk-reduction methodology references.",
    },
    {
      sourceRevisionId: asSourceRevisionId("jp.jis.b9705_1@2019"),
      applicability: "baseline",
      use: "Future functional-safety (performance level) support.",
    },
    {
      sourceRevisionId: asSourceRevisionId("jp.jis.b9960_1@2019"),
      applicability: "baseline",
      use: "Electrical-equipment reference metadata; detailed electrical design is outside the mechanical MVP.",
    },
  ],
};
