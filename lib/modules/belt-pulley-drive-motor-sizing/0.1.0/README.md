# Belt-Pulley Drive Motor Sizing Module (`belt-pulley-drive-motor-sizing`)

Milestone 6, Unit 6.5 — the fourth module in the Motor Sizing Tool family
(`context/adr/0011-motor-sizing-tool-architecture.md`), after
`ball-screw-motor-sizing@0.1.0`, `direct-drive-conveyor-motor-sizing@0.1.0`,
and `rack-pinion-motor-sizing@0.1.0`. Given a belt-and-pulley linear drive's
own pulley geometry and mass, total moving mass (a **rigid** carriage/table
attached to the belt), belt mass, friction, orientation, gear ratio, and a
commanded single accelerate-to-speed motion event, computes the required
motor specifications: load torque, acceleration torque, momentary
(starting) torque, required torque with an engineer-supplied safety factor,
operating speed, required power, total reflected system inertia, and
inertia ratio.

Full specification: `context/modules/belt-pulley-drive-motor-sizing/
stage-1-spec.md` (Stage 1) and `stage-2-contract.md` (Stage 2).

## Status

- Stage 1 (engineering specification): **done**, 2026-08-13.
- Stage 2 (parameter contract): **done**, 2026-08-13 — registry `1.12.0`
  releases the `motor_sizing.belt_pulley.*` group.
- Stage 3 (compute and trace): **done**, 2026-08-13.
- Stage 4 (validation): **done**, 2026-08-13 — see "Stage 4" below.
- Stage 5 (generic surfaces, workflow role/link integration, conformance):
  **done**, 2026-08-13.
- Stage 6 (release): **done**, 2026-08-13 — registered as
  `belt-pulley-drive-motor-sizing@0.1.0`
  (`lib/modules/registry.generated.ts`).

## Shares its load-torque formula with `rack-pinion-motor-sizing@0.1.0`, differs in inertia

Three independent sources (Oriental Motor, AutomationDirect, Andantex)
state the belt-drive and rack-and-pinion load-torque/force equations as
**one combined set**, not two — the primary source
(`jp.oriental_motor.general_catalog_motor_fan_sizing`, p. F-3) prints one
heading, "Wire Belt Mechanism, Rack and Pinion Mechanism," for both. This
module therefore reuses `motion.axis.orientation`/`incline_angle`/`gravity`/
`friction_coefficient`/`total_moving_mass` directly, and its own
`resolveDriveForce`/`resolveLoadTorque` are algebraically identical in
shape to `rack-pinion-motor-sizing@0.1.0`'s own.

What genuinely differs, and is why this is a separate module rather than a
parameter on the rack-pinion one (`stage-1-spec.md` "The central finding"):

1. **Two pulleys, not one pinion.** `pulley_inertia` sums a drive and an
   idler pulley (`(1/8)*(M_drive+M_idler)*D^2`) — added directly, not
   reduced by a speed ratio, since the belt connects them without slip and
   both share one diameter.
2. **The belt itself has mass.** `belt_inertia` (`M_belt*(D/2)^2`, defaults
   to 0) is a term a rack-and-pinion drive does not have at all.
3. **Different failure vocabulary downstream** (belt tension, tooth shear,
   wrap angle) — none in `0.1.0`'s scope, but why the mechanisms diverge as
   the family grows.

Self-contained per ADR-0011 "Reuse policy": no calculation-level dependency
on any other module. The one genuine import is `lib/engine/mechanics`
(Unit 6.1).

## Two independent public sources, one real disagreement between them

- **Oriental Motor Co., Ltd.** (`jp.oriental_motor.
general_catalog_motor_fan_sizing`, p. F-3) — primary formula source,
  already registered.
- **AutomationDirect** (`us.automationdirect.sureservo_selection_appendix`,
  newly registered this session) — Table 1 (p. B-6) independently states
  the identical combined belt-drive/rack-and-pinion equation set, and pp.
  B-11-B-13 carry a full, publicly citable belt-drive worked example — the
  first one found for this mechanism, closing the gap
  `rack-pinion-motor-sizing@0.1.0` had to fill with a licensed
  internal-only benchmark.

**A real, disclosed disagreement, not a rounding artifact:** the two
sources place mechanical efficiency on opposite sides of the calculation.
Oriental Motor divides load torque by `eta`; AutomationDirect divides the
carriage's own inertia by `e` and leaves running torque underated. This
module follows Oriental Motor's convention, matching every already-released
Motor Sizing Tool sibling — see `math.ts`'s own `resolveLoadTorque` doc
comment and `validation.ts` "deviations."

## Stage 4 (validation, done 2026-08-13)

`automationdirect-reference-example.test.ts` reproduces AutomationDirect's
own "Belt Drive - Example Calculations" worked example (a 90 lb
table+workpiece, 10:1-geared, 2.0 in aluminum pulley pair) through the real
`executeModule` compute path:

- `pulley_inertia` matches the source's own printed figure exactly (within
  0.2%) — this term carries no efficiency division in either source's own
  convention, so it is an unqualified reproduction.
- `load_inertia` and the reflected-to-motor inertia are **not** claimed to
  equal the source's own printed figures directly — those figures bake in
  AutomationDirect's own disclosed `1/e` convention on the carriage term.
  Reapplying that exact, already-disclosed factor at the test level (not
  inside this module's own kernel) reproduces both printed figures within
  0.1%, proving the underlying carriage-inertia physics is correct and the
  only source of difference is the already-quantified convention choice —
  not an unexplained residual.
- `load_torque`/`momentary_torque`/`required_torque` are **not**
  reproduced, for two independently disclosed reasons: the efficiency
  convention above, and a confirmed arithmetic slip in the source's own
  friction-force line (`0.05 x 100 = 5.0 lb` where the stated weight is
  `90 lb`; correct value `4.5 lb`) — the third such source-internal slip
  this project has found and recorded (after
  `direct-drive-conveyor-motor-sizing@0.1.0`'s p. F-9 figure and
  `rack-pinion-motor-sizing@0.1.0`'s Atlanta `Futab` inconsistency).
- `acceleration_torque` and `inertia_ratio` are exercised end to end but
  not asserted against the source's own printed `T_accel`/ratio figures: a
  genuine evidence gap found during this module's own Stage 3/4 work — the
  candidate motor's own rotor inertia is not printed as an independent
  figure, and back-solving it two different ways from the two printed
  downstream figures disagrees by roughly 15-20%, most plausibly
  compounding rounding across the source's own multiple low-precision
  intermediate results. Recorded in `validation.ts`
  `supportedUseLimits`, not silently absorbed.

**The independent-benchmark item** (`independent-benchmark.test.ts`)
cross-checks this module's own two-function force/load-torque kernel
against a single combined expression reimplementing the identical Oriental
Motor formula, written independently in `independent-benchmark.ts` — a
300-scenario deterministic property sweep confirms algebraic identity to
floating-point precision. The solo-validation reviewer-substitute policy is
invoked.

Full validation record: `validation/belt-pulley-drive-motor-sizing/0.1.0.md`.

## Stage 5/6

Cross-module link sweep (`cross-module-links.test.ts`) against all seven
Milestone-4 modules plus all three prior Motor Sizing Tool modules finds
exactly one real, incidental compatible pair — `axis-load-cases@0.1.0`'s
own resolved `total_moving_mass` output, the same exception every prior
Motor Sizing Tool module's own sweep already found. `manifest.workflowRoles`
stays `[]`. `index.ts` assembles and seals the package;
`npm run module:source-hash -- belt-pulley-drive-motor-sizing 0.1.0` →
`1f371cb2c7a12ab8`, pinned in `package.test.ts`. Sealed package content
hash: `4c920fac2f89e3f6`. 61 tests total, all passing.

## Not in scope for `0.1.0`

- Unequal drive/idler pulley diameters — no source found gives this
  formula; both pulleys share one `pulley_pitch_diameter`.
- A repeating duty cycle or effective (RMS) torque check — no source found
  for this mechanism computes or needs either.
- Belt tension, belt width/pitch, tooth-shear, or wrap-angle selection.
- Motor catalog matching or part selection (ADR-0011 "Output scope").
