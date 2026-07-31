# Axis Application and Load-Case Module — Stage 1 Engineering Specification

## Status

- Work unit: Unit 4.1, Stage 1 - engineering specification and source intake
- Proposed module ID: `axis-load-cases`
- Proposed first released version: `0.1.0`
- Status: **Stage 1 complete.** The follow-on Stage 2 record is
  `context/axis-load-cases-stage-2-contract.md`; the module is still not
  registered or released.
- Date: 2026-07-31

This document turns the Unit 4.1 brief in `implementation-map.md` into a
source-backed implementation contract. It deliberately does not claim that the
module has passed validation: draft sanitized historical horizontal and
vertical fixtures now exist under `tests/fixtures/axes/`, but their raw source
packets are screenshots without an original document revision, confirmed final
installation data, or an independent vendor result.

No released parameter, source revision, module version, calculation run, or
validation record was changed by the Stage 1 work. The separate Stage 2
increment releases only additive parameter and source metadata changes, which
the Stage 2 record identifies explicitly.

## Purpose

The module will establish the applied loads at a linear axis's carriage/guide
reference point so later modules can size the motion system, screw, guide,
support bearings, coupling, and drive train from the same load-case evidence.

It will report, for each named load case:

- total moving mass;
- gravity resolved into the axis coordinate frame;
- applied force and moment vectors at the carriage reference point;
- the sign convention and source/method used for every resolved value; and
- the inputs, assumptions, warnings, and validity limits needed to interpret
  the result.

It will not claim machine compliance, select a component, distribute loads
among guide blocks, or calculate a complete servo/ball-screw selection. Those
remain downstream responsibilities.

## Proposed Coordinate and Sign Convention

This is the proposed `axis.v1` convention to be frozen before Stage 2. It is
needed because the existing `EngineeringValue` vector only carries ordered
components plus the generic `"axis"` frame tag.

1. Vectors tagged `frame: "axis"` use the ordered components `[X, Y, Z]`.
2. `+X` is the engineer-declared positive travel direction. For an inclined or
   vertical axis, `+X` is defined as uphill/upward. The existing
   `motion.axis.incline_angle` range is therefore interpreted as
   `0 <= beta <= pi/2`; reverse travel is represented by the sign of the load
   case, not by a negative incline angle.
3. `+Y` is the horizontal transverse direction, perpendicular to the vertical
   plane containing `+X`; it is selected by the engineer for a vertical axis.
   `+Z = +X x +Y`, making the frame right-handed. When `beta = 0`, `+Z` is
   upward in the plane of incline.
4. Gravity is represented in this frame as
   `[ -g sin(beta), 0, -g cos(beta) ]`. Thus a horizontal axis has no axial
   gravity component, while a vertical axis with `+X` upward has a negative
   axial gravity component.
5. Force vectors describe forces **applied to the moving assembly**. A positive
   drive-thrust result is the force the actuator must apply in `+X`; it is not
   an unsigned capacity. The trace must show both applied force and resulting
   drive demand so a later component module never has to guess a sign.
6. The center-of-mass offset is `[rx, ry, rz]` from the guide/carriage reference
   point. The gravity-induced moment is `M_g = r_cm x F_g`; an external moment
   is then added in the same frame. The module reports the resulting moment but
   does not distribute it to guide blocks.

Every calculation trace and report must display `axis.v1`, the component order,
the selected positive travel direction, `beta`, and the signs of force and
moment results. A vector with a different frame, a component count other than
three, or an orientation/incline combination inconsistent with this convention
must be rejected by the later module input schema rather than silently
reinterpreted.

## Candidate Method and Supported Envelope

The initial method is a rigid-body, quasi-static load resolution with optional
constant acceleration. It uses SI canonical values only:

```text
m_total = m_payload + m_carriage + m_additional
F_g      = m_total * g_vector
M_g      = r_cm x F_g
```

For a sliding/travel case, Coulomb friction is direction-opposed and uses the
normal load explicitly. Separate guide/seal resistance must remain distinct
from the coefficient-of-friction term; THK's worked axis-load examples include
both terms. A later drive-thrust step can combine the signed applied loads with
the motion module's signed acceleration:

```text
F_drive,x = m_total * a_x - (F_g,x + F_friction,x + F_external,x)
```

The exact treatment of static friction, guide resistance, motion direction,
and emergency-stop deceleration is intentionally not frozen by this document.
They require an explicit parameter contract and source-backed validation; they
must not become implicit zeroes or inferred directions in code.

The proposed first validity envelope is limited to:

- one rigid moving assembly on a straight axis;
- horizontal, vertical, and inclines with `0 <= beta <= 90 degrees`;
- gravity at the existing standard default `g = 9.80665 m/s^2`, unless an
  explicit canonical input is supplied;
- scalar Coulomb-friction assumptions within the released `[0, 1]` range;
- explicitly supplied external loads, moments, and center-of-mass offsets;
- no structural compliance, backlash, guide-block load distribution, collision
  impact, regenerative braking, brake sizing, or safety-function claim.

Ambient temperature is an input relevant to downstream component derating. It
is traceable context in this module, not a universal load derating formula:
manufacturer-specific derating must be implemented by the module that owns its
source method.

## Load-Case Semantics Still Requiring Stage 2 Resolution

The four names in Unit 4.1 are not interchangeable. The module contract must
define their inputs and output meaning before a package is registered.

| Case | Intended use | Required unresolved decision |
| --- | --- | --- |
| `normal` | Expected steady operating load in a declared travel direction. | Whether a separate guide/seal resistance is required and how travel direction is represented. |
| `peak` | Maximum expected dynamic operating load. | The signed acceleration source and whether it is supplied manually or linked from `motion.profile.peak_acceleration`. |
| `holding` | Stationary force/moment that a brake, screw, or support must resist. | Conservative friction policy; holding must not receive an untraced friction credit. |
| `emergency_stop` | Demand during the defined stopping event. | A source-backed emergency-stop deceleration and process-force policy; it cannot be invented from normal motion timing. |

`ModuleInput.loadCaseId` is only an opaque run label and is not the load-case
model. The later package must use per-port `loadCase` declarations and stable,
distinct output keys. The generic result surface currently loses that metadata,
so a separate generic UI unit must add output load-case labels before four
same-parameter thrust outputs are exposed to users.

## Existing Parameter Review

Registry v1 already provides the following candidates:

- `motion.axis.orientation`, `motion.axis.incline_angle`;
- `motion.axis.payload_mass`, `motion.axis.carriage_mass`,
  `motion.axis.additional_moving_mass`, `motion.axis.center_of_mass_offset`;
- `motion.axis.friction_coefficient`, `motion.axis.gravity`, and
  `motion.axis.duty_cycle`;
- `motion.axis.external_force` and `motion.axis.external_moment` for `normal`
  and `peak` only;
- `motion.axis.total_moving_mass`, `motion.axis.gravitational_force`, and
  `motion.axis.thrust_force`; and
- `env.ambient_temperature` as downstream derating context.

The following gaps block a final port map. They require the registry proposal
checklist and a registry-version release; no released definition may be edited
in place.

1. A separate guide/seal resistance input if the THK method is adopted as
   written. `mu * normal_load` is not a substitute for a documented additional
   resistance term.
2. Semantically valid external force/moment inputs for `holding` and
   `emergency_stop`. The existing parameters only admit `normal` and `peak`.
3. A signed acceleration/direction contract for peak and emergency-stop drive
   demand. The released motion parameters hold non-negative magnitudes, not a
   signed per-case acceleration.
4. A canonical resolved-moment output if moments must be linked downstream.
   Trace-only moments are insufficient if the linear-guide module must consume
   a machine-readable result.
5. A documented way to carry any actual derating factor. Ambient temperature
   alone has no universal engineering conversion to a force derating.

The existing generic module workspace also cannot author `vector_quantity`
inputs, and its generic result panel does not label output load cases. Both are
cross-module UI capabilities and must be planned separately rather than solved
with a custom Unit 4.1 form.

## Trace and Report Contract

The later pure compute path should emit these stable trace sections and step
IDs (or a new module version if their engineering meaning changes):

1. `coordinate-convention`
   - `axis-frame-definition`
   - `gravity-vector-resolution`
2. `moving-mass`
   - `total-moving-mass`
3. `applied-loads`
   - `gravity-force`
   - `gravity-moment`
   - `external-load-<case>`
   - `resolved-moment-<case>`
4. `drive-demand`
   - `required-thrust-<case>`
5. `validity-and-assumptions`
   - explicit friction, direction, source, and omitted-load assumptions

Each formula step will cite a registered source revision and exact page or
section. The report will render this stored trace; it must not repeat the
formula in UI/report code.

## Candidate Sources and Published Examples

These sources are real candidate evidence for the eventual validation record.
Their identity and currently known revisions are now registered as Stage 2
method-source intake metadata in `lib/standards`; they are not yet cited by an
executable module or listed in `validation/source-index.md`.

| Source | Classification | Exact location / planned use |
| --- | --- | --- |
| [THK, *Ball Screw General Catalog*, 515-1E](https://tech.thk.com/en/products/pdf_download.php?file=E_15_BallScrew.pdf) | manufacturer method | Printed pages A15-46 onward: horizontal and vertical axial-load equations, including acceleration, guide resistance, friction coefficient, mass, and gravity. |
| [THK, *Example Ball Screw Selection*, 515-1E](https://tech.thk.com/en/products/pdf/en_b15_069.pdf) | manufacturer method | Printed pages B15-72 (horizontal) and B15-86 (vertical): published input/output examples for axial-load reproduction tests. |
| [THK, *Example of Calculating the Nominal Life*, 515-1E](https://tech.thk.com/en/products/pdf/en_b02_015.pdf) | manufacturer method | Printed page B2-22: published vertical-installation axial-load example and per-case results. |
| [Oriental Motor, *Method for Calculating Moment Loads on Linear Actuators*](https://www.orientalmotor.com/linear-actuators/technology/calculating-moment-load-linear-actuators.html) | manufacturer method | Sections 4–5: center-of-gravity, gravity, acceleration, and installation-direction moment treatment; candidate independent moment benchmark. |
| [NIST Guide to the SI, Appendix B.8](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8) | engineering reference | Standard acceleration of free fall `g_n = 9.80665 m/s^2`; supports the existing gravity default. |

Planned published reference tests, with their source values recorded before
implementation, are:

1. THK B15-72 horizontal case: `m = 80 kg`, `mu = 0.003`, `f = 15 N`,
   `Vmax = 1 m/s`, `t = 0.15 s`; published axial loads include `550 N`,
   `17 N`, and `-516 N` for the forward phases.
2. THK B15-86 vertical case: `m = 50 kg`, `f = 20 N`, `Vmax = 0.3 m/s`,
   `t = 0.2 s`; published axial loads include `585 N`, `510 N`, and `435 N`
   for upward phases.
3. THK B2-22 vertical case: `m = 30 kg`, `a = 2.4 m/s^2`, and documented
   guide resistance; published axial loads include `304 N`, `376 N`, and
   `232 N` for the upward phases.

These are source examples, not substitutes for the required project-history
fixtures. The independent comparison still needs a reproducible numerical case
from a method/tool other than the primary THK method.

## Validation Gate and Evidence Intake

Unit 4.1 cannot move to Stage 4 or release until all of the following exist:

- the draft ID39 horizontal and ID42 vertical fixtures are promoted to
  release-grade evidence with an original document revision, confirmed final
  components/corrections, and a clear holding/brake record for the vertical
  axis;
- the third long-stroke/high-speed fixture required by Unit 0.1, so the three
  fixtures cover the complete linear-axis MVP;
- three published-reference tests with stated tolerances and an independent
  numerical benchmark;
- a completed `validation/axis-load-cases/0.1.0.md`, reviewer or documented
  solo-review substitute, and corresponding `validation/source-index.md` rows;
- vector-input authoring and multi-case-result labeling planned as generic
  capabilities, or a documented, source-safe workflow that supplies those
  inputs without a custom UI; and
- module conformance, source-immutability hash, registry registration, and full
  project verification.

The currently available `Book1.xlsx` identifies only an exploratory horizontal
case (`400 kg` moving mass, `500 mm` stroke, horizontal orientation). It does
not provide the complete calculation result, a vertical case, or the required
sanitized historical evidence, so it is not treated as a validation fixture.

The progress tracker names ID39 (a horizontal ball-screw axis) and ID42 (a
vertical ball-screw/servo axis) as real validation references. Their raw
screenshots have now been transcribed into
`tests/fixtures/axes/axis-horizontal-basic/fixture.ts` and
`tests/fixtures/axes/axis-vertical/fixture.ts`, with source hashes, original
and normalized values, reported outputs, selected-part claims, and unknowns.
They are valid draft regression inputs, not release evidence: the original PDF
revisions, confirmed final installations/corrections, and independent vendor
results remain unavailable. In particular, ID42 has a documented 75 N versus
45 N acceleration-force discrepancy and a conflicting motor-manufacturer
attribution; the fixture records both rather than silently choosing a claim.

## Stage 2 Entry Criteria

Stage 2 resolves the friction/resistance, per-case, signed-acceleration,
moment-output, and derating decisions above. It may build and test a pure,
unregistered module package against the draft fixtures. It must release any
necessary registry version before the package is registered, and must not claim
production validation until its published-reference and release-grade historical
evidence is complete.
