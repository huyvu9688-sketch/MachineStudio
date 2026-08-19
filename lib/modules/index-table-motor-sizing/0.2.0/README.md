# Index-Table Motor Sizing Module (`index-table-motor-sizing`)

## 0.2.0 — Consistency-Pass Addendum (Recommended Inertia-Ratio Default)

Follow-on to `0.1.0`, per
`docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`
and `docs/superpowers/plans/2026-08-19-index-table-motor-sizing-0.2.0.md`.
One change, not touching the underlying physics (every reference example
below still passes unchanged): `inertia_ratio_maximum` now resolves to a
founder-directed recommended default of 10:1 (`motor_sizing.index_table.
inertia_ratio_recommended_maximum`, parameter registry `1.15.0`), editable,
rather than `0.1.0`'s own required-no-default value. The inertia-ratio
check's own exceeded-case status changed from `fail` to `warning` to
match — exceeding a recommendation is advisory, never blocking.

Unlike its four sibling Motor Sizing modules, `index-table-motor-sizing`
has no `gravity` port to begin with — it is this project's only mechanism
module with zero `motion.axis.*` reuse — so the design doc's own "Gravity"
section does not apply here, and this is the only change in `0.2.0`.

`0.1.0` stays released, registered, and byte-for-byte untouched
(`lib/modules/index-table-motor-sizing/0.1.0/`) — an engineer who wants
`0.2.0`'s behavior on an existing instance archives it and adds a fresh
`0.2.0` instance, the same migration story every prior Motor Sizing
`0.2.0` release already established. Full record:
`validation/index-table-motor-sizing/0.2.0.md`.

Milestone 6, Unit 6.6 — the fifth and last mechanism module in the Motor
Sizing Tool family (`context/adr/0011-motor-sizing-tool-architecture.md`),
after `ball-screw-motor-sizing@0.1.0`,
`direct-drive-conveyor-motor-sizing@0.1.0`,
`rack-pinion-motor-sizing@0.1.0`, and
`belt-pulley-drive-motor-sizing@0.1.0`. Given a rotary index table's own
table geometry and mass, any additional mounted-load inertia, gear ratio,
and a commanded single index move (a fixed angle rotated in a fixed time
from standstill back to standstill), computes the required motor
specifications: acceleration torque, momentary (starting) torque, required
torque with an engineer-supplied safety factor, operating speed, required
power, total reflected system inertia, and inertia ratio.

Full specification: `context/modules/index-table-motor-sizing/
stage-1-spec.md` (Stage 1) and `stage-2-contract.md` (Stage 2).

## Status

- Stage 1 (engineering specification): **done**, 2026-08-13.
- Stage 2 (parameter contract): **done**, 2026-08-13 — registry `1.13.0`
  releases the `motor_sizing.index_table.*` group.
- Stage 3 (compute and trace): **done**, 2026-08-13.
- Stage 4 (validation): **done**, 2026-08-13 — see "Stage 4" below.
- Stage 5 (generic surfaces, workflow role/link integration, conformance):
  **done**, 2026-08-13.
- Stage 6 (release): **done**, 2026-08-13 — registered as
  `index-table-motor-sizing@0.1.0`
  (`lib/modules/registry.generated.ts`).

## Genuinely different in kind from every prior Motor Sizing Tool module

ADR-0011 "Phase scope" flagged this in advance, and both sources read this
session confirmed it: an index table's own motion is **rotary**, not a
carriage translating along a linear axis.

- **No `motion.axis.*` reuse at all** — the first Motor Sizing Tool
  module with an entirely self-contained parameter group, since an index
  table shares no physical interface with a linear carriage under gravity
  and Coulomb friction (the same reasoning
  `direct-drive-conveyor-motor-sizing@0.1.0` already applied to its own
  non-reuse of `friction_coefficient`).
- **No linear-to-rotary radius conversion anywhere** — this mechanism
  commands motion already in angular terms (`index_angle` over
  `index_time`), unlike every sibling's own linear `target_velocity`.
- **`load_torque` is a required, engineer-supplied INPUT with a `0 N*m`
  default, not a computed output** — the one shape difference from every
  sibling module's own port list. Both primary sources independently omit
  a load-torque formula for this mechanism entirely.

## The central finding: two independent manufacturers both treat index-table load torque as zero

**Oriental Motor Co., Ltd.**, General Catalog _Technical Reference_
(`jp.oriental_motor.general_catalog_motor_fan_sizing`, pp. F-8-F-9, "Index
Table — Using Stepping Motors" — already registered, re-read for its own
index-table subsection distinct from the "Belt and Pully"/"Conveyor"
subsections `direct-drive-conveyor-motor-sizing@0.1.0` already cites):

> "Frictional load is omitted because it is negligible. Load torque is
> considered 0."

**AutomationDirect**, _SureServo Selection Appendix_ (pp. B-14-B-16,
"Index Table - Example Calculations" — already registered, re-read for its
own index-table section distinct from the "Belt Drive" section
`belt-pulley-drive-motor-sizing@0.1.0` already cites): `Tmotor = Taccel +
Trun`, with `Trun = 0` and no formula given for it anywhere in the
document.

Neither source gives a load-torque formula for this mechanism at all —
this closes the "genuine evidence gap this module's own Stage 1 spec must
close against a second source before Stage 2" ADR-0011 itself predicted.
See `stage-1-spec.md` "The central finding" for the full account.

## Two worked examples, one fully reproduced, one partially

`automationdirect-reference-example.test.ts` reproduces AutomationDirect's
own worked example (a 12 in diameter steel table, 6:1 gear reducer,
indexing `45 deg` in `0.5 s`) through the real `executeModule` compute
path. Table inertia, reflected inertia, operating speed, and inertia ratio
all reproduce the source's own printed figures within `0.3%-1%`.
**Acceleration/momentary/required torque are deliberately not claimed to
reproduce the source's own printed figures at face value** — a genuine
finding from this session's own hand-verification: every worked example in
this source document computes acceleration torque with a rounded `0.1`
constant standing in for the exact `2*pi/60=0.10472` (confirmed against the
same document's own Example 7, which uses the unrounded form). This
module's own kernel uses exact physics throughout, so its own torque
outputs are systematically `~8%` higher — reapplying the source's own
rounded constant and its own further-rounded intermediate values at the
test level exactly reproduces its own printed figure, proving the
deviation is fully explained, not a defect.

`oriental-motor-reference-example.test.ts` reproduces Oriental Motor's own
richer worked example (a `300 mm` steel table plus 12 discrete workpieces
mounted at a `125 mm` radius, `7.2:1` gearhead) at the **kernel level**
(not `executeModule`, since `attached_load_inertia` takes one
pre-resolved figure — the fixture computes the 12-workpiece parallel-axis
sum via `lib/engine/mechanics`' own `pointMassInertia`/`offsetAxisInertia`,
exactly mirroring the source's own method). Its own inertia and
operating-speed figures — the two evidence items this module's own Stage 1
spec actually needed from a second source — reproduce within
`0.2%-1.5%`. Its own final torque figures are **not** reproduced or
asserted against: that example sizes a stepping motor using a
pulse-speed-based convention this module doesn't share, and the source
page's own printed formula for that step is OCR-degraded past reliable
hand-verification in this environment (a scanned/image PDF) — a disclosed,
out-of-scope gap, not an oversight.

## Stage 4 (validation, done 2026-08-13)

Full validation record: `validation/index-table-motor-sizing/0.1.0.md`.
The independent-benchmark item
(`independent-benchmark.test.ts`) cross-checks this module's own
six-function kernel against a single combined expression reimplementing
AutomationDirect's own general "Belt (or Gear) Reducer Equations" formula,
written independently — a 300-scenario deterministic property sweep
confirms algebraic identity to floating-point precision. The
solo-validation reviewer-substitute policy is invoked.

## Stage 5/6

Cross-module link sweep (`cross-module-links.test.ts`) against all seven
Milestone-4 modules plus all four prior Motor Sizing Tool modules finds
**zero** compatible pairs — the first Motor Sizing Tool module's own sweep
to find none at all, since this module reuses no `motion.axis.*` or
sibling `motor_sizing.*` parameter ID. `manifest.workflowRoles` stays
`[]`. `index.ts` assembles and seals the package; `npm run
module:source-hash -- index-table-motor-sizing 0.1.0` →
`0e6bd7b721780cd5`, pinned in `package.test.ts`. Sealed package content
hash: `bdb83dd90479f8c3`. 61 tests total, all passing.

## Not in scope for `0.1.0`

- Discrete point-load geometry (count, radius, individual mass) — the
  engineer supplies one combined `attached_load_inertia` figure instead.
- A repeating duty cycle or effective (RMS) torque check — one index move
  per calculation.
- Stepping-motor-specific pulse-speed/resolution modeling — this module
  works directly in angle/time, motor-type-agnostic like every sibling.
- Motor catalog matching or part selection (ADR-0011 "Output scope").
