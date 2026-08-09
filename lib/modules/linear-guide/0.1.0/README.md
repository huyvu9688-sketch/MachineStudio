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
- `resolveBlockLoadsFromResultant` — the general form of the same
  distribution, taking a resolved force and moment rather than a force at
  a geometric offset. **This is the integration path** (see "Stage 2"
  below); the four functions above are its source-faithful reference.
- `resolveEquivalentLoad` — PMI's simpler `PE = |PR| + |PT|` form (Section
  7's "two or more guideways" case), matching this module's fixed
  four-block scope where the moment is already captured by differential
  per-block loading.
- `resolveStaticSafetyFactor`, `resolveNominalLife` (ball-type only,
  distance-basis), `resolveServiceLifeHours`, `resolveMeanLoad` — PMI
  Sections 4 and 8, corroborated by IKO's structurally identical formulas
  (see the Stage 1 spec's "Candidate Sources" item 4).

## Stage 1 kernel, not yet a package

`math.test.ts` (34 tests) tests every function against internal consistency
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

## Stage 2 (2026-08-09): the integration path, and a question found then closed

`context/modules/linear-guide/stage-2-contract.md` registers the new
`guide.*` catalog/geometry parameters and confirms this module reuses
`axis-load-cases`' `motion.axis.resultant_force`/`resultant_moment` ports
(registry `1.4.0`) as its applied-load input, per case — not a
re-derivation from mass/gravity/acceleration.

Drafting that contract surfaced a real problem: the four
installation-specific functions above take a **force at a geometric
offset**, while `axis-load-cases` produces a **force and a moment**. They
are related by `moment = force * offset`, but `offset = moment / force` is
undefined for a pure moment with no accompanying force — a case
`axis-load-cases`' own `external_moment` input can produce. It was
initially unclear whether the substitution generalized past the one
diagram (B17) confirmed with highest confidence.

**Re-reading all four PMI diagrams together — rather than one at a time —
closed it.** Every load-position offset in every in-scope diagram appears
_only_ inside a force-times-offset product (`F*l3`, `F*l4`, `m*a1*l3`,
`m*(g+a1)*l3`), and that product is a moment; the spacings in the
denominators are guide geometry, never load position. So the substitution
is exact for the radial distribution everywhere, and it holds regardless
of what B19's `l2`/`l4` mean physically, since those enter only as
moments too.

`resolveBlockLoadsFromResultant` implements the general form, and
`math.test.ts` asserts it reproduces the B17 and B23 functions exactly
plus resolves the pure-moment case — the subsumption is machine-checked,
not asserted in prose. The four installation-specific functions stay as
the source-faithful reference those tests check against; they are not the
integration path.

One part did not reduce as cleanly and is recorded rather than papered
over: PMI prints an equal lateral magnitude on all four blocks with no
differential sign and always divides by rail spacing, which reads as a
per-block sizing magnitude rather than a signed equilibrium distribution.
Reproduced as printed; flagged for Stage 4. See the Stage 2 document.
