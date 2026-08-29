# Guided Cylinder Sizing MGP Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release `guided-cylinder-sizing@0.2.0`, a MGP-first guided-cylinder selector for vertical lifters, horizontal pushers, and stoppers using SMC’s published selection graphs and a visible user safety factor.

**Architecture:** Preserve `guided-cylinder-sizing@0.1.0` unchanged. A new `0.2.0` module records only the simplified application inputs and emits a factored-load selection request. An application-layer MGP matcher selects and evaluates digitized manufacturer curves per candidate; the existing MGQ/MGP matcher and catalog type remain available for `0.1.0` runs.

**Tech Stack:** TypeScript strict, Zod, Vitest, Next.js 16 generic workspace renderer, Prisma/PostgreSQL catalog seed scripts, SMC MGP catalogue source at `reference/source-material/guided cylinder/MGP.md`.

---

## File Structure

- Create `context/modules/guided-cylinder-sizing/0.2.0-stage-1-spec.md` — versioned engineering scope, source pages, graph envelopes, and warnings.
- Create `context/modules/guided-cylinder-sizing/0.2.0-stage-2-contract.md` — port-to-parameter mapping and removed legacy inputs.
- Create `lib/modules/guided-cylinder-sizing/0.2.0/` — immutable new module package: manifest, compute, checks, trace, UI/report schemas, validation, tests, and reference examples.
- Create `lib/application/catalogs/mgp-selection-curves.ts` and `.test.ts` — typed digitized MGP graph data, deterministic band selection, and interpolation.
- Create `lib/application/catalogs/mgp-guided-cylinder-matching.ts` and `.test.ts` — MGP candidate filtering, graph evaluation, reasons, and ranking.
- Create `scripts/seed-mgp-guided-cylinder-catalog.mts` and `reference/catalog-seed/smc-mgp.csv` — a distinct MGP-only component type and all standard MGP candidates.
- Modify `lib/engine/parameters/definitions.ts`, parameter registry fixtures, `lib/application/catalogs/load-component-assignment-view.ts`, its DB fixture test, the generic workspace UI schema/rendering boundary, `lib/modules/registry.generated.ts`, and current progress/validation docs.

### Task 1: Versioned engineering and parameter contract

**Files:**
- Create: `context/modules/guided-cylinder-sizing/0.2.0-stage-1-spec.md`
- Create: `context/modules/guided-cylinder-sizing/0.2.0-stage-2-contract.md`
- Modify: `lib/engine/parameters/definitions.ts`
- Modify: `lib/engine/parameters/registry.test.ts`
- Modify: `lib/engine/parameters/hash.test.ts`

- [ ] **Step 1: Write the failing registry-contract tests**

Add assertions for the new parameter IDs and their exact contracts:

```ts
expect(PARAMETER_REGISTRY.get("pneumatic_guided_mgp_sizing.application_case"))
  .toMatchObject({ valueType: "enum", enumOptions: ["vertical_lifter", "horizontal_pusher", "stopper"] });
expect(PARAMETER_REGISTRY.get("pneumatic_guided_mgp_sizing.eccentric_distance"))
  .toMatchObject({ valueType: "quantity", canonicalUnit: "mm", range: { min: 0, unit: "mm" } });
expect(PARAMETER_REGISTRY.get("pneumatic_guided_mgp_sizing.load_safety_factor"))
  .toMatchObject({ valueType: "quantity", canonicalUnit: "ratio", range: { min: 1, unit: "ratio" } });
expect(PARAMETER_REGISTRY.get("pneumatic_guided_mgp_sizing.transfer_speed"))
  .toMatchObject({ valueType: "quantity", canonicalUnit: "m/s", displayUnits: ["m/s", "m/min"] });
```

- [ ] **Step 2: Run the registry tests and verify they fail because the parameters do not exist**

Run: `npx vitest run lib/engine/parameters/registry.test.ts lib/engine/parameters/hash.test.ts`

Expected: FAIL with the four unknown parameter IDs above.

- [ ] **Step 3: Write the Stage 1/2 records and add the minimal registry definitions**

Document these decisions exactly: reuse `motion.axis.total_moving_mass`, `pneumatic_guided_sizing.required_stroke`, `pneumatic.operating_pressure`, and `pneumatic.max_piston_speed`; add the four IDs tested above; do not reuse or add `incline_angle`, `friction_coefficient`, `process_force`, `mounting_style`, `buckling_safety_factor`, or roll/pitch/yaw ports. Define the safety factor as required, minimum 1, with no constant default.

Update the registry release version and pinned hash using the existing generation/test convention. Do not alter old parameter definitions: the old group remains required by `0.1.0`.

- [ ] **Step 4: Re-run registry tests**

Run: `npx vitest run lib/engine/parameters/registry.test.ts lib/engine/parameters/hash.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the contract unit**

```bash
git add context/modules/guided-cylinder-sizing/0.2.0-stage-1-spec.md context/modules/guided-cylinder-sizing/0.2.0-stage-2-contract.md lib/engine/parameters/definitions.ts lib/engine/parameters/registry.test.ts lib/engine/parameters/hash.test.ts
git commit -m "feat: add MGP guided cylinder selection parameters"
```

### Task 2: Digitize and validate the MGP selection curves

**Files:**
- Create: `lib/application/catalogs/mgp-selection-curves.ts`
- Create: `lib/application/catalogs/mgp-selection-curves.test.ts`
- Modify: `context/modules/guided-cylinder-sizing/0.2.0-stage-1-spec.md`

- [ ] **Step 1: Write failing curve-selection tests from the published examples**

Encode the two catalogue examples from `MGP.md` page 545:

```ts
expect(selectMgpSelectionBand({
  applicationCase: "vertical_lifter", bearingType: "ball_bushing",
  operatingPressureMPa: 0.5, requiredStrokeMm: 30, pistonSpeedMmPerS: 200,
  eccentricDistanceMm: 90,
})).toMatchObject({ graph: 5, xUnit: "mm", xValue: 90 });

expect(selectMgpSelectionBand({
  applicationCase: "horizontal_pusher", bearingType: "slide",
  operatingPressureMPa: 0.5, requiredStrokeMm: 30, pistonSpeedMmPerS: 200,
  eccentricDistanceMm: 50,
})).toMatchObject({ graph: 13, xUnit: "mm", xValue: 30 });
```

Also add failure tests for vertical `L >= 200`, horizontal `L > 100`, unsupported pressure (`0.41–0.49 MPa`), and speed above the published 500 mm/s correction range.

- [ ] **Step 2: Run the focused curve tests and verify the missing implementation failure**

Run: `npx vitest run lib/application/catalogs/mgp-selection-curves.test.ts`

Expected: FAIL because `mgp-selection-curves.ts` and `selectMgpSelectionBand` do not exist.

- [ ] **Step 3: Create the source-backed curve dataset and selector**

Create typed records for every graph on MGP catalogue pages 545–551. Each record must contain its published graph number, application case, bearing family, pressure band, speed band, stroke band or horizontal `L` band, bore, x/y units, and ordered digitized points. Use `x = eccentric distance (mm)` for vertical, `x = stroke (mm)` for horizontal, and `x = transfer speed (m/min)` for stopper; use `y = allowable load mass (kg)` throughout.

Use the catalogue’s published bands exactly:

```ts
type MgpApplicationCase = "vertical_lifter" | "horizontal_pusher" | "stopper";
type MgpBearingType = "slide" | "ball_bushing" | "high_precision_ball_bushing";
type MgpPressureBand = "0.4_mpa" | "at_least_0.5_mpa";

export interface MgpSelectionCurve {
  readonly graph: number;
  readonly applicationCase: MgpApplicationCase;
  readonly bearingType: MgpBearingType;
  readonly pressureBand: MgpPressureBand;
  readonly maxSpeedMmPerS: 200 | 400 | 500;
  readonly maxStrokeMm?: 30 | 50;
  readonly horizontalOffsetMm?: 50 | 100;
  readonly boreDiameterMm: number;
  readonly xUnit: "mm" | "m/min";
  readonly points: readonly { readonly x: number; readonly loadMassKg: number }[];
}
```

Digitize at least every labelled curve endpoint and every bend/axis crossing. Record each source page and the digitization precision in the Stage 1 document. Use log-log interpolation only between points on a log-log source graph; use straight-line interpolation for the stopper chart. Throw a typed out-of-envelope result rather than extrapolating.

- [ ] **Step 4: Re-run the curve tests**

Run: `npx vitest run lib/application/catalogs/mgp-selection-curves.test.ts`

Expected: PASS, including both catalogue examples and every envelope boundary.

- [ ] **Step 5: Commit the curve unit**

```bash
git add lib/application/catalogs/mgp-selection-curves.ts lib/application/catalogs/mgp-selection-curves.test.ts context/modules/guided-cylinder-sizing/0.2.0-stage-1-spec.md
git commit -m "feat: add MGP selection curve evaluation"
```

### Task 3: Build the immutable `guided-cylinder-sizing@0.2.0` package

**Files:**
- Create: `lib/modules/guided-cylinder-sizing/0.2.0/{manifest,compute,checks,trace,values,ui,report,validation,index,math,test-helpers,math.test,package.test}.ts`

- [ ] **Step 1: Write failing module tests for each application case**

Use three minimal fixtures that only provide applicable ports. Assert that the module produces factored mass and echoes exactly the values the matcher needs:

```ts
expect(asQuantity(computation.outputs.factored_load_mass).value).toBeCloseTo(6);
expect(computation.outputs.application_case_out).toMatchObject({ value: "vertical_lifter" });
expect(asQuantity(computation.outputs.eccentric_distance_out).value).toBe(90);
```

Add failure assertions that vertical/horizontal cases require piston speed and eccentric distance, stopper requires transfer speed, and a factor below one is rejected by the registry. Assert the new manifest has no legacy ports named `roll_offset`, `pitch_offset`, `yaw_offset`, `mounting_style`, or `buckling_safety_factor`.

- [ ] **Step 2: Verify the tests fail before implementation exists**

Run: `npx vitest run lib/modules/guided-cylinder-sizing/0.2.0/package.test.ts`

Expected: FAIL because the `0.2.0` package is absent.

- [ ] **Step 3: Implement the minimum package**

Set the new manifest version to `0.2.0`, use the current parameter-registry version, and set the catalog adapter component type to `pneumatic_cylinder_guided_mgp`. `compute()` must multiply load mass by the safety factor once, output that factored mass, and echo case, stroke, pressure, speed, distance, and transfer speed where applicable. It must not reproduce the old Euclidean-moment or Euler-buckling calculations.

The trace must name the selected application case and express the only module calculation as:

```text
m_design = m_entered × S_guided
```

For vertical and horizontal applications, treat graph selection as the governing manufacturer method. Report theoretical candidate output in matching results, but do not invent an axial-force requirement from an unspecified friction or process-force value. For stopper, record transfer speed in `m/min` in the trace while storing the canonical input in `m/s`.

- [ ] **Step 4: Verify package and math tests pass**

Run: `npx vitest run lib/modules/guided-cylinder-sizing/0.2.0/math.test.ts lib/modules/guided-cylinder-sizing/0.2.0/package.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the module package unit**

```bash
git add lib/modules/guided-cylinder-sizing/0.2.0
git commit -m "feat: add simplified MGP guided cylinder module"
```

### Task 4: Add MGP candidate matching and MGP-only catalog data

**Files:**
- Create: `lib/application/catalogs/mgp-guided-cylinder-matching.ts`
- Create: `lib/application/catalogs/mgp-guided-cylinder-matching.test.ts`
- Create: `reference/catalog-seed/smc-mgp.csv`
- Create: `scripts/seed-mgp-guided-cylinder-catalog.mts`

- [ ] **Step 1: Write failing matching tests**

Test a vertical-lifter candidate selected from the published graph-5 example, a horizontal-pusher candidate from graph 13, and a stopper candidate. Include these required outcomes:

```ts
expect(outcome.accepted[0]?.candidate.attributes.bore_diameter).toMatchObject({ value: 25 });
expect(outcome.rejected[0]?.reasons).toContain("MGP graph envelope does not cover eccentric distance 200 mm.");
expect(stopperOutcome.accepted.every((x) => x.candidate.attributes.bearing_type.value === "slide")).toBe(true);
```

- [ ] **Step 2: Verify matcher tests fail because the matcher is absent**

Run: `npx vitest run lib/application/catalogs/mgp-guided-cylinder-matching.test.ts`

Expected: FAIL with an unresolved module import.

- [ ] **Step 3: Implement candidate evaluation and seed source**

Create a distinct component type, `pneumatic_cylinder_guided_mgp`, so existing `pneumatic_cylinder_guided` assignments remain compatible with `0.1.0`. Seed model, bore, rod diameter, bearing type, and exact standard-stroke availability from the MGP source. The matcher must:

- reject non-MGPM candidates for a stopper;
- reject a candidate whose standard-stroke list does not include the required stroke;
- select the candidate’s curve using its own bearing type and bore;
- compare its curve’s allowable mass to `factored_load_mass`;
- calculate and report theoretical extend/retract output from candidate geometry and entered pressure, without using it as an invented general pusher-force gate; and
- rank accepted candidates by ascending bore, then descending graph mass margin, then deterministic candidate ID.

Use the generic catalog API for candidate retrieval; do not modify `lib/catalog` or Prisma schema.

- [ ] **Step 4: Re-run matcher tests**

Run: `npx vitest run lib/application/catalogs/mgp-guided-cylinder-matching.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit catalog matching**

```bash
git add lib/application/catalogs/mgp-guided-cylinder-matching.ts lib/application/catalogs/mgp-guided-cylinder-matching.test.ts reference/catalog-seed/smc-mgp.csv scripts/seed-mgp-guided-cylinder-catalog.mts
git commit -m "feat: match MGP guided cylinders from selection curves"
```

### Task 5: Add the reusable catalogue-illustration UI callout

**Files:**
- Modify: `lib/engine/module-sdk/types.ts`
- Modify: generic module-workspace schema renderer identified by `rg -n "uiSchema.groups|ModuleUiGroup" app lib`
- Modify: `lib/modules/guided-cylinder-sizing/0.2.0/ui.ts`
- Create/Modify: the renderer’s colocated Vitest test file
- Create: `public/module-guides/mgp-selection-cases.svg`

- [ ] **Step 1: Read the relevant Next.js 16 guide before editing UI code**

Run: `rg -n "Server Components|Client Components|public assets" node_modules/next/dist/docs -g '*.md' | Select-Object -First 40`

Expected: identifies the current Next.js documentation governing the renderer’s component boundary and static public assets.

- [ ] **Step 2: Write the failing renderer test**

Define an optional UI callout with title, image path, alt text, and case-keyed explanatory text. Assert the MGP module renders `/module-guides/mgp-selection-cases.svg` and the selected case’s `L` definition; assert other modules render no callout.

- [ ] **Step 3: Run the focused UI test and verify failure**

Run: `npx vitest run <renderer-test-path-from-step-2>`

Expected: FAIL because `ModuleUiSchema` has no callout contract.

- [ ] **Step 4: Implement the minimal generic callout contract and MGP illustration**

Extend `ModuleUiSchema` with an optional `callouts` array; render only image paths beginning `/module-guides/`; use semantic `<figure>`, `<img>`, and `<figcaption>`. The MGP SVG must label Vertical lifter, Horizontal pusher, Stopper, and `L = distance from plate to load centre of gravity`; it must not reproduce the full copyrighted catalogue table or graph. Configure the MGP module callout and case-specific help text.

- [ ] **Step 5: Re-run the focused UI test and typecheck**

Run: `npx vitest run <renderer-test-path-from-step-2> && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the UI unit**

```bash
git add lib/engine/module-sdk/types.ts app lib/modules/guided-cylinder-sizing/0.2.0/ui.ts public/module-guides/mgp-selection-cases.svg
git commit -m "feat: show MGP load-case guidance in module UI"
```

### Task 6: Integrate, validate, and release the new version

**Files:**
- Modify: `lib/application/catalogs/load-component-assignment-view.ts`
- Modify: `lib/application/catalogs/load-component-assignment-view.test.ts`
- Modify: `lib/modules/registry.generated.ts` via generator
- Create: `lib/modules/guided-cylinder-sizing/0.2.0/smc-reference-example.ts`
- Create: `lib/modules/guided-cylinder-sizing/0.2.0/smc-reference-example.test.ts`
- Create: `validation/guided-cylinder-sizing/0.2.0.md`
- Modify: `context/progress-tracker.md`

- [ ] **Step 1: Write failing integration tests for a `0.2.0` module instance**

Create a calculation run with `modulePackageId: "guided-cylinder-sizing"`, `moduleVersion: "0.2.0"`, an MGP component fixture, and the vertical-lifter example. Assert matching is available and names the selected MGP model and graph. Add a `0.1.0` fixture assertion proving it still dispatches to the old matcher.

- [ ] **Step 2: Run the DB-gated integration test and verify the new-version dispatch failure**

Run: `npx vitest run lib/application/catalogs/load-component-assignment-view.test.ts`

Expected: the `0.2.0` scenario fails before the new component type/dispatcher is recognized; pre-existing DB availability failures are reported separately and not masked.

- [ ] **Step 3: Implement explicit version-aware dispatch and published examples**

Dispatch `pneumatic_cylinder_guided_mgp` only to `evaluateMgpGuidedCylinderCandidates`; retain `pneumatic_cylinder_guided` → `evaluateGuidedCylinderCandidates`. Add reference tests for MGP page-545 vertical (`MGPL25-30Z`) and horizontal (`MGPM20-30Z`) examples, plus a stopper source example. Record source pages, digitization precision, factor behavior, and every unsupported envelope in `validation/guided-cylinder-sizing/0.2.0.md`.

- [ ] **Step 4: Generate registration and source hashes**

Run:

```bash
npm run registry:generate
npm run module:source-hash -- guided-cylinder-sizing 0.2.0
```

Copy the printed source hash into the new package conformance test; do not update the `0.1.0` hash.

- [ ] **Step 5: Run full verification**

Run: `npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build`

Expected: exit code 0 for every command.

- [ ] **Step 6: Commit release artifacts**

```bash
git add lib/application/catalogs/load-component-assignment-view.ts lib/application/catalogs/load-component-assignment-view.test.ts lib/modules/registry.generated.ts lib/modules/guided-cylinder-sizing/0.2.0 validation/guided-cylinder-sizing/0.2.0.md context/progress-tracker.md
git commit -m "feat: release MGP guided cylinder sizing 0.2.0"
```

## Plan Self-Review

- Spec coverage: Tasks 1–3 replace legacy inputs, establish the new contract, case-aware compute, trace, and safety-factor behavior. Tasks 2 and 4 implement the exact published MGP graph selection, MGP candidate data, and no-extrapolation boundaries. Task 5 provides the requested visual load-case selector. Task 6 proves end-to-end matching, preserves `0.1.0`, registers the package, and records validation.
- Placeholder scan: no implementation behavior is deferred; the only source transcription activity is explicitly bounded to MGP pages 545–551 and backed by reference examples and anchor-point verification.
- Type consistency: `application_case`, `eccentric_distance`, `load_safety_factor`, and `transfer_speed` are introduced once in Task 1, emitted by Task 3, and consumed by Task 4.
