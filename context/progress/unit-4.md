# Unit 4 Progress Context

Milestone 4 - First Production Module. Read this file with
`context/progress-tracker.md` and the Unit 4.1 Stage 1/Stage 2 records before
continuing work on the axis application and load-case module.

## Current Phase

- **2026-07-31: Unit 4.1 Stage 1 is complete; the first Stage 2 increment is
  complete but the production module has not started.** The project now has a
  documented `axis.v1` convention, recovered/sanitized draft ID39 horizontal
  and ID42 vertical fixtures, registered method-source metadata, parameter
  registry v1.1's three moving-case additions, an SDK guard for port/parameter
  load-case mismatch, and an unregistered pure regression kernel. A review
  caught and corrected a generic registry-version gap before acceptance:
  registered development fixtures now pin their literal v1.0.0 targets, and
  v1.1 explicitly declares its supported historic registry targets rather than
  rewriting those fixture manifests. Verification: Prettier, `git diff --check`,
  typecheck, and 529 runnable tests (200 database-gated skips) pass. Sandbox
  build attempts could not fetch IBM Plex Sans and IBM Plex Mono from
  `fonts.googleapis.com`, but the complete `npm run verify` pipeline passed
  once its production build was allowed its normal network access; no app/font
  code was changed in this unit.
- **2026-08-01: two of the Stage 2 contract's five deferred decisions —
  the two that needed no new evidence — are now closed.** The other three
  (per-case external force/moment vectors and resolved outputs; the
  per-case-vectors-vs-generic-container choice; emergency-stop/holding
  evidence) remain genuinely evidence-gated and untouched. Closed this
  session, both as pure generic-platform units (no module registered, no
  schema/evidence dependency):
  - Generic parameter-graph compatibility (`evaluateLinkCompatibility`) now
    rejects an unpinned source port silently linking into a load-case-pinned
    target.
  - The generic result panel now labels an output's load case (the
    result-label half of vector-input-authoring-and-result-labels); the
    vector-input-authoring half is still open.
  Full detail and verification for both live in `context/progress-tracker.md`
  Current Phase (2026-08-01 entries); the module-contract-level record lives
  in `context/axis-load-cases-stage-1-spec.md` and
  `context/axis-load-cases-stage-2-contract.md` (deferred items 4 and 5).
- **2026-08-05: the vector-input-authoring half is now closed too.** After a
  brainstorm/user check (the same process the 2026-08-01 entry above flagged
  as likely needed), the generic module-input renderer now edits any
  `frame: "axis"` vector — exactly the case `motion.axis.
  center_of_mass_offset`, `motion.axis.external_force`, and `motion.axis.
  external_moment` all need. Deferred item 4 is now fully closed (both
  halves). Design and verification detail:
  `docs/superpowers/specs/2026-08-05-vector-quantity-input-editor-design.md`
  and `context/progress-tracker.md` Current Phase.

## Next Safe Work Unit

Finish the remaining Stage 2 parameter decisions before scaffolding a
`ModulePackage`: resolve per-case external force/moment and resolved output
semantics against sources (items 1-3 of the Stage 2 contract's deferred-
decision list — genuinely evidence-gated, not actionable without sanitized
historical fixtures and published methods this project does not yet have).
No non-evidence-gated generic-platform item remains open on this list —
items 4 and 5 are both closed as of 2026-08-05 (see Current Phase above).
Do not register a module, claim a historical phase category, or create a
validation record while the Stage 2 items above and the Stage 1 evidence gate
remain open.
