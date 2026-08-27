# Guided Cylinder Sizing — Simplified MGP Selection Design

## Decision

Revise the proposed guided-cylinder selection workflow around SMC's MGP
Series model-selection graphs. The standard workflow is MGP-first, not
MGQ-first: the MGP catalogue directly selects from the same practical inputs
an engineer normally has for a pusher, lifter, or stopper — load mass,
required stroke, piston speed, mounting orientation, and the plate-to-load
centre-of-gravity distance.

This design supersedes the standard-input and catalog-selection portions of
`2026-08-26-guided-cylinder-sizing-design.md`. The existing released
`guided-cylinder-sizing@0.1.0` package remains immutable; this is the design
for its next simplified version, not a silent edit to released behavior.

## Source Basis

`reference/source-material/guided cylinder/MGP.md` documents MGP's own
selection process:

- MGP has three bearing types: MGPM slide bearing, MGPL ball bushing, and
  MGPA high-precision ball bushing. The catalogue identifies MGPM as suited
  to stopper/lateral-shock use and MGPL/MGPA as suited to pushers and
  lifters.
- Vertical selection graphs are keyed by bearing family, pressure band,
  stroke band, piston-speed band, load mass, and eccentric distance `L`.
- Horizontal selection graphs are keyed by bearing family, pressure band,
  speed band, load mass, stroke, and either `L = 50 mm` or `L = 100 mm`.
- Stopper graphs are keyed by transferred-object mass and transfer speed.
  They apply to MGPM slide-bearing candidates only, with a maximum stroke of
  30 mm for bores 12–25 and 50 mm for bores 32–100.
- The source directs users to SMC's Guide Cylinder Selection Software for
  eccentric distances at or above 200 mm; this module must not extrapolate
  beyond the published graph envelope.

## Standard User Workflow

### 1. Select the application case

The first input is a required `application_case` enum:

- `vertical_lifter`
- `horizontal_pusher`
- `stopper`

The UI displays the applicable MGP catalogue load diagram beside the selected
case. It does not ask users to translate their load into independent
roll/pitch/yaw values.

### 2. Enter only primary application values

For vertical lifter and horizontal pusher, the required inputs are:

- payload mass;
- required stroke;
- maximum piston speed;
- operating pressure;
- eccentric distance `L`, defined by the catalogue diagram as the distance
  between the plate and the load's centre of gravity; and
- guided-load safety factor.

For stopper, the required inputs are:

- transferred-object mass;
- transfer (impact) speed; and
- guided-load safety factor.

Required stroke remains an input for all cases, because it identifies the
configuration and selection band. Piston speed is relevant to lifter/pusher
selection; transfer speed is used instead for a stopper.

Bearing type is selected by the matcher, not forced as a routine user input.
Candidate evaluation considers all bearing types allowed by the selected
case, then reports the selected bearing type and model. Stopper candidates
are MGPM only.

### 3. Apply the safety factor visibly

The module multiplies the entered mass by the engineer-selected guided-load
safety factor before querying the catalogue graph. This reserves the safety
factor for secondary uncertainty — guide friction variation, small external
resistance, installation variance, and unmodelled transient effects — while
the published MGP selection graph remains the governing primary calculation.

The report displays entered mass, safety factor, factored mass, selected graph
band, and the reason for every candidate decision. It must never present a
safety-factor assumption as an SMC catalogue rating.

## Selection Logic

### Vertical lifter

For each allowed MGP bearing family, select the graph from mounting
orientation, pressure band (`0.4 MPa` or `>= 0.5 MPa`), stroke band, and
piston-speed band. Compare the factored payload mass at the entered eccentric
distance against the candidate-bore curve. No extrapolation occurs outside
the seeded curve domain; `L >= 200 mm` is reported as outside this module's
catalogue envelope.

### Horizontal pusher

For each allowed MGP bearing family, select the graph from pressure and speed
bands. Use the `L = 50 mm` graph for `L <= 50 mm` and the `L = 100 mm` graph
for `50 mm < L <= 100 mm`. Report `L > 100 mm` as outside the supported
selection envelope instead of interpolating an unprovided catalogue curve.

### Stopper

Restrict candidates to MGPM. Select the stopper graph from transferred-object
mass and transfer speed, enforce the catalogue's bore-group stroke limits,
and report any condition outside the seeded graph or stroke envelope without
extrapolation.

## Force and Rating Checks

The module continues to calculate theoretical extend/retract cylinder force
from the candidate bore, rod size, operating pressure, and existing force
sizing margin. This remains a transparent secondary confirmation; it does
not replace the MGP application graph.

The catalogue's ordinary-lateral-load and allowable-rotational-torque tables
remain useful reportable candidate ratings. They are not used to invent three
separate roll/pitch/yaw checks: SMC publishes one lateral-force limit and one
combined plate-torque limit, not per-axis limits. The standard workflow no
longer collects separate roll, pitch, and yaw offsets.

The inherited `pneumatic.mounting_style` input and copied Euler buckling check
are removed from the simplified guided-cylinder workflow. They describe
rod-end boundary conditions that do not match MGP's guide-plate mounting or
its catalogue selection method.

## Catalog Data and Matching

Replace the present one-rating-stroke-per-model seed with digitized MGP
selection-curve data. Each seeded curve records its application case,
bearing family, pressure band, speed band, stroke band or `L` band, bore, and
anchor points. Interpolation is only permitted where the selected source graph
supports it; no value is extrapolated past its endpoints.

Matching evaluates every valid MGP candidate against the selected case's
curve and exact configuration envelope. Passing candidates are ranked by the
smallest suitable bore and then available load margin. The result explicitly
names the MGP graph/band used, selected bearing type, model, catalogue margin,
and any scope warning.

## Validation

- Reproduce one published MGP vertical-lifter selection example and one
  horizontal-pusher example through the real module and catalog matcher.
- Reproduce a stopper selection and verify the MGPM-only and bore-group
  stroke restrictions.
- Test pressure, stroke, speed, eccentric-distance, and graph-end boundary
  selection.
- Test that out-of-envelope conditions warn or reject without extrapolation.
- Test that a safety factor increases the graph demand and never changes the
  selected source band.
- Validate digitized anchor points against the supplied catalogue graphs,
  with the source precision and founder-review status disclosed.

## Out of Scope

- MGQ selection in the simplified standard workflow.
- Requiring users to enter roll, pitch, and yaw offsets.
- Inventing MGP lateral-load limits from its displacement charts.
- Replacing SMC's selection graphs with an unsourced universal force or
  moment formula.
- Eccentric distances at or above 200 mm and horizontal-pusher distances
  above 100 mm.
