# Japan Market Profile

## Profile Identity

- Profile ID: `JP-General-Industrial-Machinery`
- Version: `1.0.0-draft`
- Initial verification date: 2026-07-28
- Scope: general industrial automated machinery designed for use in
  Japan

## Purpose

This profile provides the initial regulatory and consensus-standard
reference structure for Japanese projects. It is not legal advice,
certification, or proof that a complete machine complies with all
applicable requirements.

Actual applicability depends on the machine type, process, installation
site, customer specifications, and the competent Labor Standards
Inspection Office. The project must allow additional requirements and
source editions to be entered.

Japanese titles and texts are legally authoritative. English titles in
this file are working translations; official English translations of
Japanese laws are provided for reference and are themselves unofficial.

## Source Classification

Every source is classified as one of:

- `federal_regulation` (in Japan: national statutes and ministerial
  ordinances)
- `administrative_guidance` (non-binding ministry guidelines and
  notifications; added for this profile — the shared classification
  enum must include it in Unit 1.4)
- `state_or_local_requirement`
- `consensus_standard`
- `certification_standard`
- `manufacturer_method`
- `engineering_handbook`
- `company_rule`
- `customer_requirement`

Reports must not represent these classifications as legally equivalent.

## Initial Statutory Requirements Register

### Industrial Safety and Health Act (労働安全衛生法), Act No. 57 of 1972

- Classification: federal regulation (national statute)
- Key provisions for machine builders: Article 28-2 risk assessment
  (investigation of danger or harm and measures based on the results;
  an effort obligation in force since April 2006), Article 42 and
  related provisions on structural standards for specified machines,
  and Chapter V regulations concerning machines
- Use in MachineStudio: risk-assessment obligation reference and future
  risk-reduction checklists
- Official translation (unofficial English):
  <https://www.japaneselawtranslation.go.jp/en/laws/view/3440/en>

### Ordinance on Industrial Safety and Health (労働安全衛生規則)

- Classification: federal regulation (MHLW ministerial ordinance)
- Use in MachineStudio: machine-specific guarding, equipment, and work
  provisions when applicable, including industrial-robot provisions
- Official translation (unofficial English):
  <https://www.japaneselawtranslation.go.jp/en/laws/view/3878/en>

### Guidelines for Comprehensive Safety Standards of Machinery
(機械の包括的な安全基準に関する指針)

- Classification: administrative guidance (MHLW Labour Standards Bureau
  notification; issued 2001, fully revised 2007-07-31 as 基発第0731001号)
- Content: comprehensive machinery safety and risk-assessment guidance
  aligned with ISO 12100 and ISO/IEC Guide 51, addressed to both
  machine manufacturers/importers/integrators and machine users; it is
  the detailed machine-safety guidance connected to Article 28-2
- Use in MachineStudio: primary Japanese risk-assessment methodology
  reference for later safety support
- Official source (MHLW):
  <https://www.mhlw.go.jp/content/11300000/001408310.pdf>

## Initial Consensus Standards Register (JIS)

JIS documents are licensed publications distributed by the Japanese
Standards Association. Store metadata and clause references only.

### JIS B 9700:2013 — Safety of machinery, general principles for
design, risk assessment and risk reduction

- Classification: consensus standard
- Relationship: identical (IDT) adoption of ISO 12100:2010
- Use: risk-assessment and risk-reduction methodology references
- Metadata source: <https://www.jisc.go.jp>

### JIS B 9705-1:2019 — Safety-related parts of control systems,
Part 1: general principles for design

- Classification: consensus standard
- Relationship: identical (IDT) adoption of ISO 13849-1:2015
- Use: future functional-safety (performance level) support; encode
  checks only after separate validation planning
- Metadata source: <https://www.jisc.go.jp>

### JIS B 9960-1:2019 — Electrical equipment of machines, Part 1:
general requirements

- Classification: consensus standard
- Relationship: modified (MOD) adoption of IEC 60204-1:2016
- Use: electrical-equipment reference metadata; detailed electrical
  design is outside the mechanical MVP
- Metadata source: <https://www.jisc.go.jp>

## Electrical Supply Note (engineering data, not compliance)

- East Japan supplies 50 Hz; West Japan supplies 60 Hz
- Common industrial supplies are 200 V class three-phase (200/220 V),
  with 400 V class in larger facilities
- Servo drive, motor, and transformer catalog records for Japanese
  projects must carry supply voltage and frequency attributes; a US
  480 V/60 Hz lineup is not automatically valid for Japan

## Application-Specific Standards

Application-specific standards are not loaded into every project. They
are added only when the machine type or process requires them. Examples
include industrial-robot provisions of the Ordinance and JIS B 8433
series, press machinery structural standards, JIS B 9961 (IEC 62061
functional safety), and access/safety-distance standards such as
JIS B 9707/9708 and JIS B 9713.

The profile must support additions without changing the database schema.

## MVP Behavior

The MVP must:

1. Attach this market profile to a project
2. Store source document, edition/revision, classification, Japanese
   title, English working title, and official metadata link
3. Allow project-specific source additions
4. Allow formula/check references to source records and clause/page
   metadata
5. Display that a check implements a limited method rather than complete
   machine compliance
6. Record source editions in immutable calculation runs and baselines
7. Warn when a project uses a superseded source record after the source
   registry is updated

The MVP does not:

- Store full copyrighted standards or JIS text
- Determine all legally applicable requirements automatically
- Replace a qualified engineer or the competent Labor Standards
  Inspection Office
- Produce CE or other non-US, non-Japan market documentation
- Claim that a machine complies with the Act, ordinances, guidelines,
  or JIS as a whole

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
- Do not reproduce protected JIS tables, figures, equations, or
  substantial text unless the product has the necessary license.
- Treat official law translations as unofficial references; cite the
  Japanese original as authoritative.
- Manufacturer catalog content must follow manufacturer terms and the
  project's data-use policy.
- Uploaded customer documents remain private to the project owner in the
  MVP.
