# Linear Guide 0.1.0 — Draft Kernel (Stage 1)

`math.ts` is a pure SI-number kernel for the fourth production engineering
module (Unit 4.4), covering the `0.1.0` proposed scope from
`context/modules/linear-guide/stage-1-spec.md`: a two-rail, two-block-per-
rail arrangement (four total load-bearing points), horizontal or vertical
installation, uniform motion or a single axial inertia phase, ball-type
rolling elements only.

- `resolveHorizontalUniformBlockLoads` / `resolveVerticalUniformBlockLoads`
  / `resolveHorizontalInertiaBlockLoads` / `resolveVerticalInertiaBlockLoads`
  — one function per PMI installation diagram (Linear Guideway catalog,
  Section 6), each keeping that diagram's own `l1`/`l2`/`l3`/`l4` parameter
  names rather than a shared "physical" naming, since the spec found these
  letters are locally scoped per diagram, not consistent across them.
- `resolveEquivalentLoad` — PMI's simpler `PE = |PR| + |PT|` form (Section
  7's "two or more guideways" case), matching this module's fixed
  four-block scope where the moment is already captured by differential
  per-block loading.
- `resolveStaticSafetyFactor`, `resolveNominalLife` (ball-type only,
  distance-basis), `resolveServiceLifeHours`, `resolveMeanLoad` — PMI
  Sections 4 and 8, corroborated by IKO's structurally identical formulas
  (see the Stage 1 spec's "Candidate Sources" item 4).

## Stage 1 kernel, not yet a package

`math.test.ts` (29 tests) tests every function against internal consistency
(force conservation across all four blocks, symmetry, monotonicity,
boundary/invalid input) rather than PMI's own full worked numerical example
(catalog Chapter 9): that example uses a bespoke two-mass, two-height
geometry with its own "No.1"-"No.4" carriage numbering, and this session
could not confirm with confidence that its numbering/sign convention maps
onto the generic Section 6 diagrams' `P1`-`P4` convention these functions
implement. Reproducing it needs either re-reading both diagrams side by
side to pin the mapping, or a confirmed superposition argument — reserved
for Stage 4, not guessed here (see `math.test.ts`'s own header comment).
This is the same "internal consistency first, published example once
confirmed" treatment `motion-profile`'s Stage 1 kernel received before its
own reference examples were found.

Twice-re-verified against the source images this session (see
`context/modules/linear-guide/stage-1-spec.md` "Evidence Gaps and
Verification Confidence"): the second read caught a real error in the
spec's own first draft — acceleration and deceleration use distinct rates
(`a1`/`a3`), not one shared rate, and the inertia-phase lateral load is
equal across all four blocks with no differential sign. Both are correct in
this kernel from the start (written after the correction).

No manifest, ports, input schema, compute, trace, checks, or package exists
yet — this is a Stage 1 kernel only, the same "build a pure kernel ahead of
the full package" pattern `axis-load-cases`, `motion-profile`, and
`ball-screw` all used at their own Stage 1/2. Production release stays
sequentially gated behind Unit 4.1's Definition of Done regardless
(`context/implementation-map.md` Milestone 4 header).

## Stage 2 (2026-08-09): a real wiring question found, not resolved by guessing

`context/modules/linear-guide/stage-2-contract.md` registers the new
`guide.*` catalog/geometry parameters and confirms this module reuses
`axis-load-cases`' new `motion.axis.resultant_force`/`resultant_moment`
ports (registry `1.4.0`) as its applied-load input, per case — not a
re-derivation from mass/gravity/acceleration. Drafting that contract
surfaced a real problem, not assumed in advance: `resolveHorizontalInertiaBlockLoads`
and `resolveVerticalInertiaBlockLoads` above are very likely redundant once
`axis-load-cases` has already resolved a case's gravity+inertia+external
combination into one snapshot, and the two "uniform" functions take a
**force at a geometric offset**, not `axis-load-cases`' actual **(force,
moment)** shape — related by `moment = force * offset`, but that
substitution is unconfirmed for `resolveVerticalUniformBlockLoads`'s own
diagram and breaks down entirely for a pure external moment with no
accompanying force. See the Stage 2 document's "A Finding From Trying To
Wire This Contract" and "Open Question, Not Resolved Here" for the full
account. This is why no package exists yet: Stage 3 (`compute.ts`) cannot
be written responsibly until that question has a source-checked answer.
