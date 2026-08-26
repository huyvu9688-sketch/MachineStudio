# guided-cylinder-sizing 0.1.0

Load-in, catalog-match-out guided pneumatic cylinder sizing. Given a load
(mass, incline angle, friction coefficient, optional extend-stroke process
force), a required stroke, three load-offset lever arms (roll/pitch/yaw),
and the engineer's own operating pressure, force-sizing load factor,
cushion type, mounting style, and buckling safety factor, computes the
required extend/retract force and required resultant moment, then (via
`lib/application/catalogs/guided-cylinder-matching.ts`) ranks real SMC
MGQ/MGP catalog candidates against that requirement.

Sibling of `pneumatic-cylinder-sizing@0.1.0` (round-body cylinders; never
touched by this module) — the first of four planned new pneumatic actuator
families (Dual Rod, Guided Cylinder, Table Cylinder, Rodless). See
`context/modules/guided-cylinder-sizing/stage-1-spec.md` and
`stage-2-contract.md` for the full engineering record, and
`docs/superpowers/specs/2026-08-26-guided-cylinder-sizing-design.md` for
the founder-directed design brief.

## Stage 1/2 (2026-08-26)

Source research fetched and read both SMC MGQ and MGP series catalogs
directly, finding six real corrections to the design doc — most
significantly that MGP's own catalog has no equivalent "Allowable Lateral
Load" table to MGQ's own (a plate-displacement stiffness graph instead),
and that neither catalog publishes a discrete allowable-kinetic-energy
figure (both give a load-mass-vs-speed graph). See `stage-1-spec.md`
"Corrections" for the full account. Registry `1.18.0` releases eight new
`pneumatic_guided_sizing.*` parameters (`stage-2-contract.md`).

## Stage 3 package (2026-08-26)

`manifest.ts`, `math.ts`, `compute.ts`, `checks.ts`, `trace.ts`,
`values.ts`, `ui.ts`, `report.ts`, `validation.ts`, assembled in
`index.ts`. `math.ts` reproduces (independently, not imported)
`pneumatic-cylinder-sizing@0.1.0`'s own required-force, piston-area,
theoretical-force, cushion-kinetic-energy, and buckling formulas, and adds
a new `resolveRequiredMoment` combining three roll/pitch/yaw moment
components as a Euclidean sum — this module's own engineering assumption,
not a value either fetched SMC catalog documents.

## Stage 4 (validation, 2026-08-26)

One real MGQM40 (40 mm bore, slide bearing, 50 mm stroke) scenario
reproduced through this module's own compute path
(`smc-reference-example.ts`/`.test.ts`), directly read from the fetched
MGQ catalog. The independent-benchmark item is satisfied by reference for
the reused force/buckling formula areas (citing
`pneumatic-cylinder-sizing@0.1.0`'s own chain back to
`pneumatic-cylinder@0.1.0`'s Norgren M/1000 benchmark); the new
required-moment resolution is verified by property tests instead (no
manufacturer method exists to benchmark it against). Full validation
record: `validation/guided-cylinder-sizing/0.1.0.md`.

## Stage 5 (catalog integration, 2026-08-26)

`lib/application/catalogs/guided-cylinder-matching.ts` — a hybrid matcher
mirroring `pneumatic-cylinder-matching.ts`'s own shape, with two new
per-candidate checks (allowable lateral load, checked only when a
candidate has a seeded value — MGQ candidates only; allowable rotational
torque, checked for every candidate). Catalog schema (`pneumatic_cylinder_
guided` component type) and seed data: `reference/catalog-seed/
smc-mgq-mgp.csv` (40 rows — 20 MGQ + 20 MGP), imported via
`scripts/seed-guided-cylinder-catalog.mts`. `lib/application/catalogs/
load-component-assignment-view.ts` now dispatches between
`pneumatic_cylinder` and `pneumatic_cylinder_guided`, the second component
type with real catalog matching wired end to end.

## Stage 6 (release, 2026-08-26)

Source-immutability hash: `f3b829c92ae603a7`. Registered via `npm run
registry:generate` (`guided-cylinder-sizing@0.1.0` in
`lib/modules/registry.generated.ts`). Sealed package content hash:
`8b720093cc2639d5`.

**What still needs the founder's own action:** running
`scripts/seed-guided-cylinder-catalog.mts` against the live database
(one-time, manual), then reviewing/trimming the seeded 40-row MGQ/MGP
catalog set to the founder's own real working models. The DB-gated
catalog-matching fixture test (`lib/application/catalogs/
load-component-assignment-view.test.ts`) was written and typechecks
cleanly but has not been executed against a live database in this
authoring session — see `validation/guided-cylinder-sizing/0.1.0.md`
"Boundary and Invalid-Input Coverage" for the disclosed gap.
