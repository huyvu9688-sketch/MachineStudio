# Axis Load Cases 0.1.0 — Draft Kernel

`math.ts` is a pure SI-number kernel for the first production engineering
module's source-phase regression work. It freezes the proposed `axis.v1`
gravity, resistance, moment, and signed-drive-force arithmetic while keeping
the historical ID39/ID42 phase categories explicitly unclassified.

This directory intentionally has **no `index.ts`**. The module-registry
generator registers every package directory containing that file, so adding one
would make this incomplete evidence package appear in the user-facing module
registry. A future registered package will add the SDK manifest, typed ports,
trace, checks, UI schema, report schema, validation record, and an `index.ts`
only after the load-case contract and release-grade validation evidence are
complete.

The regression test imports the sanitized fixtures in `tests/fixtures/axes/`
and compares force magnitudes only. It does not infer `normal`, `peak`,
`holding`, or `emergency_stop` from a source acceleration/steady/deceleration
phase.
