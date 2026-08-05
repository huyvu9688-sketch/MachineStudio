// Seed data for the US-General-Industrial-Machinery market profile (Unit 1.4).
// Metadata only, from context/us-market-profile.md. No standards text is
// reproduced; licensed sources carry no excerpt. Editions are recorded as the
// profile states them; US federal regulations that are continuously in force
// use edition "current" with a note to confirm the operative CFR edition.

import {
  asSourceDocumentId,
  asSourceRevisionId,
  type MarketProfile,
  type SourceDocument,
  type SourceRevision,
} from "../types";

export const usDocuments: readonly SourceDocument[] = [
  {
    id: asSourceDocumentId("us.osha.1910_212"),
    classification: "federal_regulation",
    title: "OSHA 29 CFR 1910.212 — General requirements for all machines",
    authority: "OSHA",
    market: "US",
    access: "public",
    officialUrl:
      "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.212",
    note: "Machine guarding requirement references and future risk-reduction checklists.",
  },
  {
    id: asSourceDocumentId("us.osha.1910_subpart_o"),
    classification: "federal_regulation",
    title: "OSHA 29 CFR 1910 Subpart O — Machinery and Machine Guarding",
    authority: "OSHA",
    market: "US",
    access: "public",
    officialUrl:
      "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910SubpartO",
    note: "Additional machine-specific guarding provisions when applicable.",
  },
  {
    id: asSourceDocumentId("us.osha.1910_147"),
    classification: "federal_regulation",
    title: "OSHA 29 CFR 1910.147 — The Control of Hazardous Energy",
    authority: "OSHA",
    market: "US",
    access: "public",
    officialUrl:
      "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147",
    note: "Energy-source inventory and future lockout/tagout documentation support.",
  },
  {
    id: asSourceDocumentId("us.osha.1910_subpart_s"),
    classification: "federal_regulation",
    title: "OSHA 29 CFR 1910 Subpart S — Electrical",
    authority: "OSHA",
    market: "US",
    access: "public",
    officialUrl:
      "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910SubpartS",
    note: "Electrical equipment and installation reference metadata; detailed electrical design is outside the mechanical MVP.",
  },
  {
    id: asSourceDocumentId("us.ansi.b11_0"),
    classification: "consensus_standard",
    title: "ANSI B11.0-2023 — Safety of Machinery",
    authority: "ANSI",
    market: "US",
    access: "licensed",
    officialUrl: "https://webstore.ansi.org/standards/amt/ansib112023",
    note: "Risk-assessment and risk-reduction methodology for later safety support.",
  },
  {
    id: asSourceDocumentId("us.ansi.b11_19"),
    classification: "consensus_standard",
    title:
      "ANSI B11.19-2019 (R2024) — Performance Requirements for Risk Reduction Measures",
    authority: "ANSI",
    market: "US",
    access: "licensed",
    officialUrl: "https://webstore.ansi.org/standards/amt/ansib11192019r2024",
    note: "Safeguarding and risk-reduction measure references for later safety support.",
  },
  {
    id: asSourceDocumentId("us.nfpa.79"),
    classification: "consensus_standard",
    title: "NFPA 79-2024 — Electrical Standard for Industrial Machinery",
    authority: "NFPA",
    market: "US",
    access: "licensed",
    officialUrl: "https://www.nfpa.org/product/nfpa-79-standard/p0079code",
    note: "Electrical-equipment-of-machinery reference profile.",
  },
  {
    id: asSourceDocumentId("us.nfpa.70"),
    classification: "consensus_standard",
    title: "NFPA 70 — National Electrical Code",
    authority: "NFPA",
    market: "US",
    access: "licensed",
    officialUrl:
      "https://www.nfpa.org/codes-and-standards/nfpa-70-standard-development/70",
    note: "Commonly adopted by jurisdictions with varying editions. The operative edition is project/AHJ-specific, so no baseline revision is seeded; a project supplies the adopted edition.",
  },
  {
    id: asSourceDocumentId("us.ul.508a"),
    classification: "certification_standard",
    title: "UL 508A — Industrial Control Panels",
    authority: "UL",
    market: "US",
    access: "licensed",
    officialUrl:
      "https://www.ul.com/resources/ul-508a-third-edition-summary-requirements",
    note: "Panel-design source metadata and future control-panel checks; MachineStudio does not issue a UL mark.",
  },
];

const CFR_EDITION_NOTE =
  "US federal regulation continuously in force; confirm the operative CFR annual edition for the project.";

export const usRevisions: readonly SourceRevision[] = [
  {
    id: asSourceRevisionId("us.osha.1910_212@current"),
    documentId: asSourceDocumentId("us.osha.1910_212"),
    edition: "current",
    note: CFR_EDITION_NOTE,
  },
  {
    id: asSourceRevisionId("us.osha.1910_subpart_o@current"),
    documentId: asSourceDocumentId("us.osha.1910_subpart_o"),
    edition: "current",
    note: CFR_EDITION_NOTE,
  },
  {
    id: asSourceRevisionId("us.osha.1910_147@current"),
    documentId: asSourceDocumentId("us.osha.1910_147"),
    edition: "current",
    note: CFR_EDITION_NOTE,
  },
  {
    id: asSourceRevisionId("us.osha.1910_subpart_s@current"),
    documentId: asSourceDocumentId("us.osha.1910_subpart_s"),
    edition: "current",
    note: CFR_EDITION_NOTE,
  },
  {
    id: asSourceRevisionId("us.ansi.b11_0@2023"),
    documentId: asSourceDocumentId("us.ansi.b11_0"),
    edition: "2023",
    effectiveDate: "2023",
  },
  {
    id: asSourceRevisionId("us.ansi.b11_19@2019r2024"),
    documentId: asSourceDocumentId("us.ansi.b11_19"),
    edition: "2019 (R2024)",
    effectiveDate: "2024",
  },
  {
    id: asSourceRevisionId("us.nfpa.79@2024"),
    documentId: asSourceDocumentId("us.nfpa.79"),
    edition: "2024",
    effectiveDate: "2024",
  },
  {
    id: asSourceRevisionId("us.ul.508a@3"),
    documentId: asSourceDocumentId("us.ul.508a"),
    edition: "3rd edition",
  },
];

export const usProfile: MarketProfile = {
  id: "US-General-Industrial-Machinery" as MarketProfile["id"],
  version: "1.0.0-draft",
  market: "US",
  displayName: "US General Industrial Machinery",
  scope:
    "General industrial automated machinery designed for use in the United States.",
  verificationDate: "2026-07-28",
  disclaimer:
    "Initial regulatory and consensus-standard reference structure. Not legal advice, product certification, an NRTL listing, or proof that a complete machine complies with all applicable requirements. Applicability depends on machine type, process, installation, state and local adoption, customer specifications, and the Authority Having Jurisdiction.",
  entries: [
    {
      sourceRevisionId: asSourceRevisionId("us.osha.1910_212@current"),
      applicability: "baseline",
      use: "Machine guarding requirement references and future risk-reduction checklists.",
    },
    {
      sourceRevisionId: asSourceRevisionId("us.osha.1910_subpart_o@current"),
      applicability: "baseline",
      use: "Identify additional machine-specific guarding provisions when applicable.",
    },
    {
      sourceRevisionId: asSourceRevisionId("us.osha.1910_147@current"),
      applicability: "baseline",
      use: "Energy-source inventory and future lockout/tagout design documentation support.",
    },
    {
      sourceRevisionId: asSourceRevisionId("us.osha.1910_subpart_s@current"),
      applicability: "baseline",
      use: "Electrical equipment and installation reference metadata.",
    },
    {
      sourceRevisionId: asSourceRevisionId("us.ansi.b11_0@2023"),
      applicability: "baseline",
      use: "Risk-assessment and risk-reduction methodology for later safety support.",
    },
    {
      sourceRevisionId: asSourceRevisionId("us.ansi.b11_19@2019r2024"),
      applicability: "baseline",
      use: "Safeguarding and risk-reduction measure references for later safety support.",
    },
    {
      sourceRevisionId: asSourceRevisionId("us.nfpa.79@2024"),
      applicability: "baseline",
      use: "Electrical-equipment-of-machinery reference profile.",
    },
    {
      sourceRevisionId: asSourceRevisionId("us.ul.508a@3"),
      applicability: "baseline",
      use: "Panel-design source metadata and future control-panel checks; no UL mark is issued.",
    },
  ],
};
