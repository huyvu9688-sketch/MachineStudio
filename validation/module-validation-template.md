# Module Validation Record Template (Unit 0.5)

Copy this file to `validation/<module-id>/<version>.md` when a module
reaches **Stage 4 — Validation** of the New Module Workflow
(`context/ai-workflow-rules.md`). This is the record required by
`context/roadmap.md` "Module Definition of Done" #10 ("Validation record
documenting methods, sources, editions, deviations, reviewer, and
supported use limits") and #9 ("At least one independent benchmark
source or tool comparison"), and it is what a module's manifest
`validation: ValidationRecord` field ultimately points to
(`context/architecture.md` "Module Package Contract").

Do not fill this in with placeholder or invented numbers. Every value
below must come from an actual published worked example, an actual
independent method/tool run, or an actual recorded engineering judgment.
An incomplete section is left explicitly marked `TBD` with a reason, not
filled with a plausible-looking number — inventing evidence is a direct
violation of `context/ai-workflow-rules.md` "Handling Missing
Requirements" ("Do not invent product behavior").

---

## Module Identity

- Module ID: `<module-id>`
- Version validated: `<semver>`
- Package content hash: `<hash from the sealed ModulePackage manifest>`
- Parameter-registry version this module's ports were released against:
  `<registry version>`
- Validation date: `<YYYY-MM-DD>`

## Purpose and Supported Applications

State what engineering decision this module supports and the class of
machine/application it targets (mirror the module's Stage 1
specification). One or two paragraphs, not the full spec.

## Validity Envelope and Assumptions

- Explicit input ranges / configurations this module supports.
- Assumptions baked into the formulas (e.g. rigid body, steady-state
  friction coefficient, specific mounting arrangement).
- Conditions that are **out of scope** for this version (see "Unsupported
  Conditions" below for the user-facing statement).

## Sources and Methods Used

List every formula/method source actually used, with edition and the
exact clause/page. Reference the `lib/standards` source registry entry
(`SourceRevision` ID) rather than re-typing the citation freehand where
the source is already registered; add any project- or module-specific
source that is not yet registered.

| Source (SourceRevision ID or full citation) | Classification | Edition | Clause / page | What it supports in this module |
| --- | --- | --- | --- | --- |
| `<e.g. us.ansi.b11_0@2023>` or `<full citation if not yet registered>` | `<federal_regulation \| consensus_standard \| manufacturer_method \| engineering_handbook \| company_rule \| ...>` | `<edition>` | `<clause/page>` | `<formula/check it backs>` |

Distinguish regulatory requirement, consensus standard, manufacturer
method, handbook method, and company rule
(`context/ai-workflow-rules.md` "Market Standards and Source Workflow").
Never state or imply that passing this module's checks makes the whole
machine compliant with any of these sources.

## Reference Examples (Published Worked Examples)

At least three, per `context/roadmap.md` Module Definition of Done #6
("At least three published reference examples reproduced within stated
tolerances"). Each example must be traceable to a real published source
(textbook worked example, manufacturer catalog worked example, standard's
own example, or a sanitized historical project case from
`tests/fixtures/`).

### Example 1 — `<short name>`

- Source: `<citation / fixture path>`
- Inputs: `<table or list of exact input values with units>`
- Published/expected result: `<value(s) with units, as published>`
- MachineStudio result: `<value(s) with units, as computed>`
- Difference: `<absolute and/or relative difference>`
- Tolerance applied and why: `<e.g. ±2% — matches the source's own stated
  rounding, or an engineering-judgment tolerance with justification>`
- Pass / fail against tolerance: `<pass | fail>`

### Example 2 — `<short name>`

(same structure)

### Example 3 — `<short name>`

(same structure)

## Independent Method or Tool Comparison

Required: at least one comparison against a method or tool that is
**independent** of the primary formula source used above — for example a
different handbook method, a manufacturer's own sizing tool/calculator,
or a hand-calculation cross-check using a different derivation path.

- Independent method/tool: `<name, version/edition>`
- Case(s) compared: `<which of the reference examples above, or a
  separate case>`
- Result from independent method: `<value(s) with units>`
- MachineStudio result: `<value(s) with units>`
- Difference and explanation: `<state the numeric difference and why it
  exists — rounding, different assumption, different safety-factor
  convention, etc.; do not paper over an unexplained difference>`

## Tolerances and Deviations

Summarize, across all examples and the independent comparison, any
deviation that was accepted and why. If every case matched within
tolerance with no deviations, state that explicitly rather than leaving
the section empty.

## Unsupported Conditions

The user-facing statement of what this module does **not** cover in this
version (feeds the module's validity-envelope UI messaging and report
notes). Be specific — "not validated for X" is more useful than "may not
be accurate for extreme cases."

## Boundary and Invalid-Input Coverage

Confirm (with a pointer to the actual test file/path, not a restatement)
that the module's automated test suite covers:

- [ ] Boundary and invalid-input tests (`context/code-standards.md`
      "Module Testing")
- [ ] Dimensional / unit tests
- [ ] Serialization round-trip tests
- [ ] Property or monotonicity tests where physically valid
- [ ] Trace snapshot tests for stable step IDs
- [ ] Module conformance suite (`runModuleConformance`)
- [ ] Cross-module link compatibility tests
- [ ] Guided-workflow integration tests, when the module participates in
      a guided workflow

Test file path(s): `<path>`

## Reviewer

- Reviewer: `<name>`, or see "Solo validation reviewer-substitute" below
- Review date: `<YYYY-MM-DD>`
- Review scope: what the reviewer actually checked (not merely "looks
  good") — e.g. re-derived Example 2 independently, spot-checked unit
  handling, confirmed source citations resolve to the cited clause.

### Solo validation reviewer-substitute rule

Per `context/ai-workflow-rules.md` "Stage 4 — Validation": *"When no
second engineer is available, the documented independent benchmark
comparison serves as the review substitute and is recorded as such in the
validation record."*

If this module was validated without a second engineer available, record
that explicitly here — do not leave the Reviewer field blank or imply a
human review occurred that did not:

> No second engineer was available for this validation. Per the
> documented solo-validation policy, the "Independent Method or Tool
> Comparison" above (comparison against `<method/tool>`, case(s)
> `<which>`) serves as the review substitute. This is recorded as a
> reviewer substitution, not a waiver of review.

## Supported Use Limits (Summary)

One short paragraph a downstream engineer can read without the rest of
this document: what this module is validated to do, within what ranges,
against what tolerance, and what it explicitly does not cover yet.

## Sign-off

- [ ] All reference examples pass within stated tolerance
- [ ] Independent comparison completed and recorded
- [ ] Unsupported conditions documented
- [ ] Reviewer (or solo reviewer-substitute) recorded
- [ ] Test coverage checklist above complete
- [ ] `validation/source-index.md` updated with every source revision
      used above
