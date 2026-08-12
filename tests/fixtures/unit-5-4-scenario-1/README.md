# Unit 5.4 Scenario 1 — Horizontal Linear Axis

Port-level input data for a real, live-database run of the complete
`linear-axis@1.0.0` guided workflow (all seven Milestone 4 modules),
exercised by
`lib/application/workflows/unit-5-4-scenario-1-horizontal-axis.test.ts`.
This is `context/implementation-map.md`'s Unit 5.4, Scenario 1 ("Horizontal
linear axis").

`representative-inputs.ts` combines two kinds of data, tagged per field in
its own comments:

- **Real historical evidence** for the axis-load-cases and motion-profile
  roles, from `tests/fixtures/axes/axis-horizontal-basic/fixture.ts`
  (sanitized source case ID39) — the same fixture Unit 4.1's own release
  regression already reproduces.
- **Representative catalog data** for every port ID39 does not cover
  (essentially all of ball-screw, linear-guide, coupling, support-bearing,
  and drive-train), reused from this project's own already-vetted
  manufacturer reference-example files wherever a fit exists, or a
  disclosed, hand-verified placeholder otherwise. None of this is presented
  as ID39's own historical evidence.

This is deliberately kept separate from `tests/fixtures/axes/axis-
horizontal-basic/` — that directory's own `evidence-integrity.test.ts`
hash-pins ID39 as immutable sanitized historical evidence, and mixing in
non-ID39 representative data there would blur that line.

Full evidence record, including the reference-vs-computed comparison and
the disclosed cross-source layout inconsistency this scenario's own
stitched-together part selection carries:
`validation/unit-5.4/scenario-1-horizontal-axis.md`.
