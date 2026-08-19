# Rack-and-Pinion Motor Sizing Module (`rack-pinion-motor-sizing`)

Milestone 6, Unit 6.4 — the third module in the Motor Sizing Tool family
(`context/adr/0011-motor-sizing-tool-architecture.md`), after
`ball-screw-motor-sizing@0.1.0` and
`direct-drive-conveyor-motor-sizing@0.1.0`. Given a rack-and-pinion linear
axis's own pinion geometry and mass, total moving mass, friction,
orientation (horizontal, vertical, or inclined), and a commanded single
accelerate-to-speed motion event, computes the required motor
specifications a motor for that axis must meet: load torque, acceleration
torque, momentary (starting) torque, required torque with an
engineer-supplied safety factor, operating speed, required power, total
reflected system inertia, and inertia ratio.

Full specification: `context/modules/rack-pinion-motor-sizing/
stage-1-spec.md` (Stage 1) and `stage-2-contract.md` (Stage 2).

## Status

- Stage 1 (engineering specification): **done**, 2026-08-13.
- Stage 2 (parameter contract): **done**, 2026-08-13 — registry `1.11.0`
  releases the `motor_sizing.rack_pinion.*` group.
- Stage 3 (compute and trace): **done**, 2026-08-13.
- Stage 4 (validation): **done**, 2026-08-13 — see "Stage 4" below.
- Stage 5 (generic surfaces, workflow role/link integration, catalog
  adapter, conformance): **done**, 2026-08-13.
- Stage 6 (release): **done**, 2026-08-13 — registered as
  `rack-pinion-motor-sizing@0.1.0` (`lib/modules/registry.generated.ts`).

## Architecturally closer to `ball-screw-motor-sizing@0.1.0` than to the conveyor module

A rack-and-pinion axis is the same "one rigid carriage on a guide"
mechanism class as a ball screw — not the conveyor's "loose load on a
moving surface" class. The primary source
(`jp.oriental_motor.general_catalog_motor_fan_sizing`, p. F-3) prints the
ball-screw and rack-and-pinion force formulas identically:
`F = FA + m(sina + mu*cosa)`. This module therefore reuses
`motion.axis.orientation`/`incline_angle`/`gravity`/`friction_coefficient`/
`total_moving_mass` directly — the same interface
`ball-screw-motor-sizing@0.1.0` already reuses — the opposite reuse
conclusion from `direct-drive-conveyor-motor-sizing@0.1.0`'s own
deliberate non-reuse of `friction_coefficient`, reached for the opposite,
equally source-backed reason (see `stage-1-spec.md` "Relationship to
Existing and Planned Modules" for the full table of what genuinely
differs). Unlike the conveyor module, this one supports vertical/inclined
orientation — both Atlanta's and Andantex's own sources give a dedicated
vertical-lifting formula variant.

Self-contained per ADR-0011 "Reuse policy": no calculation-level
dependency on any other module. The one genuine import is
`lib/engine/mechanics` (Unit 6.1).

## Two independent public sources, plus a licensed internal benchmark

- **Oriental Motor Co., Ltd.** (`jp.oriental_motor.
  general_catalog_motor_fan_sizing`, p. F-3) — primary formula source,
  already registered.
- **Andantex USA, Inc. (Redex)** (`us.andantex.
  modular_rack_pinion_system`, newly registered this session) — a full,
  publicly citable horizontal/vertical selection procedure, independently
  corroborating the identical force/torque shape (hand-verified this
  session).
- **Atlanta Drive Systems** (`us.atlanta_drive_systems.
  rack_pinion_calculations`) — two full worked numerical examples, but
  `access: "licensed"` with an unresolved redistribution status. Per the
  precedent `axis-load-cases@0.1.0` already established for this exact
  document: used only as an **internal-only numerical benchmark**, never
  cited in `manifest.ts` or a customer-facing trace/report.

A genuine, disclosed evidence gap: **no publicly citable worked numerical
example exists for rack-and-pinion motor sizing specifically.** Both
public sources give the formula only. See `stage-1-spec.md` "Reference
Examples and Independent Benchmark" for the full search record (several
other web sources returned HTTP 403 or covered a different mechanism).

## Stage 4 (validation, done 2026-08-13)

`atlanta-benchmark.test.ts` reproduces both of Atlanta Drive Systems' own
worked numerical examples ("travelling operation," `m=820 kg`, and
"lifting operation," `m=300 kg`) through the real `executeModule` compute
path, reusing `axis-load-cases@0.1.0`'s own already-tested
`resolveAtlantaHorizontalForce`/`resolveAtlantaVerticalForce` directly (a
cross-module test-only import, the same pattern
`ball-screw-motor-sizing@0.1.0`'s own `independent-benchmark.test.ts`
already establishes). Atlanta's own tangential force `Fu` is converted to
a pinion torque via `Fu*D/2` — independently justified by Andantex's own
separately published `Tp=Fr*d/2` relationship, not invented for this
benchmark. `momentary_torque` matches `Fu*D/2` within `0.01%` for both
scenarios. This single test file serves as both the independent-benchmark
AND reference-example evidence, since no public source has a worked
numerical example for this mechanism. The solo-validation
reviewer-substitute policy is invoked.

Full validation record: `validation/rack-pinion-motor-sizing/0.1.0.md`.

## Stage 5/6

Cross-module link sweep (`cross-module-links.test.ts`) against all seven
Milestone-4 modules plus both prior Motor Sizing Tool modules finds
exactly one real, incidental compatible pair — `axis-load-cases@0.1.0`'s
own resolved `total_moving_mass` output, the same exception
`ball-screw-motor-sizing@0.1.0`'s own sweep already found and documented
(both modules reuse the identical parameter ID). `manifest.workflowRoles`
stays `[]`. `index.ts` (renamed from `package.ts`) assembles and seals the
package; `npm run module:source-hash -- rack-pinion-motor-sizing 0.1.0` →
`86bb223f9834865d`, pinned in `package.test.ts`. Sealed package content
hash: `95e30556b36aa304`. 50 tests total, all passing.

## Not in scope for `0.1.0`

- The rack's own mass or inertia — treated as infinitely rigid/massless;
  no source found gives it a term.
- A repeating duty cycle or effective (RMS) torque check — no source
  found for this mechanism computes or needs either.
- Rack/pinion gear-tooth mechanical-strength checks (root bending
  fatigue, Hertzian pitting fatigue, permissible catalog load inertia) —
  a hardware-selection question, symmetric with `ball-screw@0.1.0`'s own
  separate responsibility for the screw shaft itself.
- Motor catalog matching or part selection (ADR-0011 "Output scope").
