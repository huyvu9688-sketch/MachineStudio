# pneumatic-cylinder-sizing 0.1.0

Load-in, catalog-match-out pneumatic cylinder sizing. Given a load (mass,
incline angle, friction coefficient, optional extend-stroke process
force), a required stroke, and the engineer's own operating pressure,
force-sizing load factor, cushion type, mounting style, and buckling
safety factor, computes the required extend/retract force and required
cushion kinetic energy, then (via `lib/application/catalogs/
pneumatic-cylinder-matching.ts`) ranks real SMC CM2/CA2 catalog
candidates against that requirement.

Sibling of `pneumatic-cylinder@0.1.0` (which checks one already-selected
cylinder); this module never touches that release. See
`context/modules/pneumatic-cylinder-sizing/stage-1-spec.md` and
`stage-2-contract.md` for the full engineering record, and
`docs/superpowers/specs/2026-08-24-pneumatic-cylinder-sizing-design.md`
for the founder-directed design brief.

## Stage 3 package (2026-08-24)

`manifest.ts`, `math.ts`, `compute.ts`, `checks.ts`, `trace.ts`,
`values.ts`, `ui.ts`, `report.ts`, a draft `validation.ts`, assembled in
`index.ts`. `math.ts` reproduces (independently, not imported)
`pneumatic-cylinder@0.1.0`'s own theoretical-force, cushion-kinetic-
energy, and Euler buckling formulas, and adds a new `resolveRequiredForce`
reproducing `ball-screw-motor-sizing@0.2.0`'s own forward/return sign
convention.

## Stage 4 (validation) — see `validation.ts` and
`validation/pneumatic-cylinder-sizing/0.1.0.md` once a later task completes it.

## Stage 5 (catalog integration) — see `lib/application/catalogs/
pneumatic-cylinder-matching.ts` once a later task completes it.
