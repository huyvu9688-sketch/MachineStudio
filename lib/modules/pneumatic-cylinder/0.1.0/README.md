# Pneumatic Cylinder 0.1.0 — Released

Released and registered 2026-08-24 as `pneumatic-cylinder@0.1.0`
(`lib/modules/registry.generated.ts`,
`validation/pneumatic-cylinder/0.1.0.md`). The package entry point is
`index.ts`; its conformance suite (`package.test.ts`) reports
`import-boundary` and `source-immutability` as real, passing checks — not
skipped.

`math.ts` is a pure mm/MPa/N-number kernel for the first module of
Milestone 7 (Phase 2, "Common Automation Modules"), covering the `0.1.0`
scope from `context/modules/pneumatic-cylinder/stage-1-spec.md`: one
double-acting or single-acting pneumatic cylinder, checked against one load
in one installation. A new, standalone module family — no `linear-axis@1`
role, no Motor Sizing Tool family relationship.

- `resolvePistonAreas` — `A1 = pi*D^2/4`, `A2 = pi*(D^2-d^2)/4`. Direct
  geometric formulas both candidate sources agree on.
- `resolveTheoreticalForce` — `F = eta * A * P` (SMC's own formulas (1)/(2)),
  evaluated once per side. `eta` (SMC's own load factor) is a required,
  no-built-in-default input — Milwaukee Cylinder's own load-type-percentage
  method answers a different question (estimating the *required* force from
  a load, not derating the cylinder's own theoretical output) and is
  documented as upstream engineering guidance, never implemented as a
  formula here (`context/modules/pneumatic-cylinder/stage-2-contract.md`
  "Decisions" item 1).
- `resolveCushionKineticEnergy` — `E = (m/2) * V^2` (SMC's own formula (7)).
  Piston speed at end of stroke is a required engineer-supplied input —
  both candidate sources state directly that piston speed cannot be
  calculated from a formula.
- `resolveBucklingLoad` / `resolvePermissibleCompressiveLoad` — a generic
  Euler column formula (`Fk = factor*pi^2*E_steel*J/L^2`), reusing the
  identical four end-fixity cases and `1/K^2` effective-length-factor
  values `ball-screw@0.1.0`'s own kernel already established for the same
  underlying physics on a different component — reproduced independently
  here, not imported. The safety factor is applied as a **divisor**
  (`F_perm = Fk/S`), not a multiplier like `screw.buckling_safety_margin`:
  Hänchen's own generic hydraulic-industry reference (the only source with
  a number at all) states it that way.
- `resolveAirDemand` — SMC's own formulas (8)-(16), reported (not
  evaluated) air-consumption and required-air-volume outputs. Assumes
  symmetric extend/retract piping and approximates stroke time as
  `stroke / max_piston_speed` — two documented simplifications, neither of
  which affects a pass/fail check.

## Stage 3 package (2026-08-24)

A full `ModulePackage` wraps the kernel:

| File | Role |
| --- | --- |
| `manifest.ts` | Identity, validity envelope, source revisions, and ports. |
| `input-schema.ts` | Cross-field rules: `rod_diameter < bore_diameter`; at least one of `required_extend_force`/`required_retract_force`; `allowable_kinetic_energy` required together with a non-`none` cushion type; `piping_bore` required together with a nonzero `piping_length`. |
| `compute.ts` | Pure compute over the single (no load-case) scenario. |
| `trace.ts` / `checks.ts` | Trace steps and acceptance checks. |
| `ui.ts` / `report.ts` | Generic UI and report schemas. |
| `validation.ts` | Validation record — Stage 4 evidence and Stage 6's `reviewer`/`reviewDate` are both complete. |
| `index.ts` | Sealed package. Named `index.ts` so `npm run registry:generate` discovers it. |

No registry version is released by this package — `pneumatic.*` and the new
`volume`/`volumetricFlowRate` unit dimensions were already released at
Stage 2 (`context/modules/pneumatic-cylinder/stage-2-contract.md`, registry
`1.16.0`).

Reference-example reproduction against SMC's own worked examples is done
through the real compute path (`smc-reference-examples.ts`/`.test.ts`), not
just `math.ts`: a bore-selection example (63mm bore, eta=0.7, 1000N
required, clears at 1091.0N), an air-consumption example (50mm bore, 600mm
stroke, recovered via a text-extraction proxy after `smcworld.com`/
`smcpneumatics.com` both returned HTTP 403 to this session's direct fetch —
reproduces the source's own printed ~13L/~0.56L sub-totals to within 0.1L
with a 20mm rod inferred, not stated, in the recovered text), and a cushion
example (CM2-40, air cushion, cross-checked against an inferred 2.35J
allowable-energy figure). No worked buckling example exists in any source —
a disclosed gap, not a skipped step.

### A real registry gap found and closed at Stage 3

`stage-1-spec.md`'s own "to be added at Stage 2" note for the Milwaukee
Cylinder and SMC source revisions was never actually done —
`lib/standards/engineering-sources.ts` had zero `pneumatic`/`milwaukee`
entries before Stage 3, confirmed by grep. Both were registered that
session, a prerequisite for this module's own trace to cite SMC's formulas
at all.

## Stage 4 (validation, 2026-08-24)

**Reference examples: met** (see "Stage 3" above — reproduced through the
real compute path at Stage 3 itself, per `context/ai-workflow-rules.md`'s
own "New Module Workflow" Stage 3 step, "Add reference... tests").

**Independent benchmark: partially resolved, not fully closed — recorded
honestly as a split, not overclaimed.** Parker Hannifin's own literature
returned HTTP 403 again this session, the same block the Stage 1 and Stage
3 sessions already recorded
(`context/modules/pneumatic-cylinder/stage-2-contract.md` "Decisions" item
4). No genuine second, structurally distinct *method* — the
KTR-DIN-740-vs-`coupling` or IKO-vs-`linear-guide` kind of independent
benchmark — was found for any of this module's four formula areas
(theoretical force, cushioning, buckling, air consumption).

What was found instead: **Norgren (IMI Precision Engineering)'s own M/1000
"Heavy Duty Cylinders" technical data sheet**
(`us.norgren.m1000_heavy_duty_cylinders@web-2026-08-24`) — a third
manufacturer, independent of both SMC and Milwaukee, whose own printed
per-model "Theoretical forces (N) at 6 bar" and "Air consumption (l/cm) per
stroke at 6 bar" table (`./norgren-benchmark.ts`) this module's own kernel
was never calibrated to. Reproduced through `resolveTheoreticalForce`/
`resolveAirDemand` (at `loadFactor = 1.0` — Norgren's own printed force
carries no derating of its own, matching Milwaukee Cylinder's own
unfactored `F = P*A` convention directly) across 7 bore sizes (76mm-305mm,
`./norgren-benchmark.test.ts`), agreement is within 2% on all 21 individual
figures (mean absolute deviation under 1%) for both extend/retract
theoretical force and combined air consumption. Two of Norgren's own nine
printed base models are deliberately excluded, not silently dropped: 1020's
own printed instroke force implies a rod diameter inconsistent with the
same data sheet's own dimension table by ~14%, an unresolved discrepancy on
that one figure; 1025 is close (~1.8%) but left out to keep the benchmark
set's own tolerance band tight.

**This closes the independent-benchmark item for 2 of the module's 4
formula areas** (theoretical force, air consumption) with real third-party
numeric corroboration — not a second competing methodology, since
Norgren's own data sheet states no formula of its own, only pre-computed
ratings. **The cushion kinetic-energy-allowable and buckling formulas still
have no second independent source of any kind** — Norgren's data sheet
gives cushion length/volume, not an allowable-energy figure, and no
buckling table at all. Carried forward as an explicit, disclosed `0.1.0`
limitation, the same "real gap stays open at release" treatment
`ball-screw@0.1.0`'s own two unresolved buckling/equivalent-load
discrepancies received. See `validation.ts`'s own `independentBenchmark`
field and `validation/pneumatic-cylinder/0.1.0.md` for the full record.

**reviewer/reviewDate are finalized** ("Solo validation — Norgren M/1000
independent-benchmark substitute (theoretical-force and air-consumption
formulas only...)", `2026-08-24`) — the same solo-validation
reviewer-substitute policy every other released module in this project
uses, honestly scoped to what the substitute evidence actually covers.

## Stage 5 (2026-08-24): generic surfaces

This module has no upstream or downstream cross-module link and no
guided-workflow role — `manifest.ts`'s own `workflowRoles: []` and
`stage-1-spec.md`'s own "Existing Parameter Review" already confirm zero
`pneumatic.*`/`load.*`/`force.*`/`mass.*` overlap with any released
parameter group, so there is no `cross-module-links.test.ts` for this
module (unlike every Milestone 4/6 module). Generic UI and report schema
(`ui.ts`/`report.ts`, drafted at Stage 3) already pass conformance
validation through `package.test.ts`'s `runModuleConformance`
`package-validation` check — nothing new was needed here.

## Stage 6 (release, 2026-08-24)

`index.ts` assembles the same manifest, ports, compute, UI, report, and
validation record into a single `ModulePackage` and seals it, so `npm run
registry:generate` now discovers it: the module is registered as
`pneumatic-cylinder@0.1.0` in `lib/modules/registry.generated.ts`.
`package.test.ts` pins the source-immutability hash (`npm run
module:source-hash -- pneumatic-cylinder 0.1.0` → `9700fdc94f2a344f`) and
asserts both `import-boundary` and `source-immutability` pass as real
checks, not skipped — the same conformance rigor every other released
module in this project already established. Sealed package content hash:
`739621ff948938a9`. Full validation record:
`validation/pneumatic-cylinder/0.1.0.md`.
