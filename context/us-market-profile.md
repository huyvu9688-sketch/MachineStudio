# US Market Profile

## Profile Identity

- Profile ID: `US-General-Industrial-Machinery`
- Version: `1.0.0-draft`
- Initial verification date: 2026-07-28
- Scope: general industrial automated machinery designed for use in the
  United States

## Purpose

This profile provides the initial regulatory and consensus-standard
reference structure for MachineStudio. It is not legal advice, product
certification, an NRTL listing, or proof that a complete machine complies
with all applicable requirements.

Actual applicability depends on the machine type, process, installation,
state and local adoption, customer specifications, and the Authority
Having Jurisdiction. The project must allow additional requirements and
source editions to be entered.

## Source Classification

Every source is classified as one of:

- `federal_regulation`
- `state_or_local_requirement`
- `consensus_standard`
- `certification_standard`
- `manufacturer_method`
- `engineering_handbook`
- `company_rule`
- `customer_requirement`

Reports must not represent these classifications as legally equivalent.

## Initial Federal Requirements Register

### OSHA 29 CFR 1910.212 — General requirements for all machines

- Classification: federal regulation
- Use in MachineStudio: machine guarding requirement references and
  future risk-reduction checklists
- Official source:
  <https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.212>

### OSHA 29 CFR 1910 Subpart O — Machinery and Machine Guarding

- Classification: federal regulation
- Use in MachineStudio: identify additional machine-specific guarding
  provisions when applicable
- Official source:
  <https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910SubpartO>

### OSHA 29 CFR 1910.147 — Control of Hazardous Energy

- Classification: federal regulation
- Use in MachineStudio: energy-source inventory and future lockout/tagout
  design documentation support
- Official source:
  <https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147>

### OSHA 29 CFR 1910 Subpart S — Electrical

- Classification: federal regulation
- Use in MachineStudio: electrical equipment and installation reference
  metadata; detailed electrical design is outside the mechanical MVP
- Official source:
  <https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910SubpartS>

## Initial Consensus and Certification Standards Register

### ANSI B11.0-2023 — Safety of Machinery

- Classification: consensus standard
- Use: risk-assessment and risk-reduction methodology for later safety
  support
- Metadata source:
  <https://webstore.ansi.org/standards/amt/ansib112023>

### ANSI B11.19-2019 (R2024) — Performance Requirements for Risk
Reduction Measures

- Classification: consensus standard
- Use: safeguarding and risk-reduction measure references for later
  safety support
- Metadata source:
  <https://webstore.ansi.org/standards/amt/ansib11192019r2024>

### NFPA 79-2024 — Electrical Standard for Industrial Machinery

- Classification: consensus standard
- Use: electrical-equipment-of-machinery reference profile
- Official metadata source:
  <https://www.nfpa.org/product/nfpa-79-standard/p0079code>

### NFPA 70 — National Electrical Code

- Classification: consensus code commonly adopted by jurisdictions
- Use: project/AHJ edition metadata only; do not assume one edition is
  adopted everywhere
- Official source:
  <https://www.nfpa.org/codes-and-standards/nfpa-70-standard-development/70>

### UL 508A — Industrial Control Panels

- Classification: certification standard
- Use: panel-design source metadata and future control-panel checks;
  MachineStudio does not issue a UL mark
- Official metadata source:
  <https://www.ul.com/resources/ul-508a-third-edition-summary-requirements>

## Application-Specific Standards

Application-specific standards are not loaded into every project. They
are added only when the machine type or process requires them. Examples
may include industrial robots, packaging machinery, machine tools,
conveyors, presses, or process-specific requirements.

The profile must support additions without changing database schema.

## MVP Behavior

The MVP must:

1. Attach this market profile to a project
2. Store source document, edition/revision, classification, title, and
   official metadata link
3. Allow project-specific source additions
4. Allow formula/check references to source records and clause/page
   metadata
5. Display that a check implements a limited method rather than complete
   machine compliance
6. Record source editions in immutable calculation runs and baselines
7. Warn when a project uses a superseded source record after the source
   registry is updated

The MVP does not:

- Store full copyrighted standards text
- Determine all legally applicable requirements automatically
- Replace a qualified engineer, NRTL, or Authority Having Jurisdiction
- Produce CE documentation or other non-US market documentation
- Claim that a machine is OSHA, ANSI, NFPA, or UL compliant as a whole

## Source Update Policy

- Source metadata is reviewed at least before each production release
  that introduces or changes a standards-based check.
- A new source edition creates a new immutable `SourceRevision`.
- Released modules continue to reference their original source revision.
- A supersession link may trigger an impact warning, but never silently
  changes old calculation results.
- Implementing a new edition requires a new module version and validation
  record when engineering behavior changes.

## Licensing Policy

- Store titles, identifiers, editions, clause references, internal method
  notes, and permitted links.
- Do not reproduce protected tables, figures, equations, or substantial
  text unless the product has the necessary license.
- Manufacturer catalog content must follow manufacturer terms and the
  project's data-use policy.
- Uploaded customer documents remain private to the project owner in the
  MVP.
