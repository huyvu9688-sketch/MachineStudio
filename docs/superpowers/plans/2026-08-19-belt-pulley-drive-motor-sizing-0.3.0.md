# Belt-Pulley Drive Motor Sizing 0.3.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `belt-pulley-drive-motor-sizing@0.3.0` — the fifth and last of the five follow-on module-version bumps consuming the Motor Sizing shared infrastructure (`disabledWhen` and parameter registry `1.15.0`) per `docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`. Unlike its four siblings (all already shipped at `0.1.0` → `0.2.0`), this module gets all **three** consistency-pass changes at once and starts from `0.2.0` (already shipped 2026-08-18, with the native motion-cycle work), not `0.1.0`:

1. Gravity stops being an editable input — hardcoded `9.80665 m/s^2` in `math.ts`.
2. `inertia_ratio_maximum` repoints at the new `motor_sizing.belt_pulley.inertia_ratio_recommended_maximum` parameter (founder-directed default of `10`, still overridable).
3. `disabledWhen` wiring in `ui.ts` — this is the one and only consumer of the shared `disabledWhen` capability in this project: `target_velocity`/`constant_velocity_time` disable when `motion_mode` is `"distance"`, and `travel_distance`/`cycle_time` disable when `motion_mode` is `"velocity"`.

Once this plan lands, the shared-infrastructure consistency pass is complete across all five Motor Sizing Tool modules.

**Architecture:** `0.1.0` and `0.2.0` both stay released, registered, and byte-for-byte untouched (`ai-workflow-rules.md` "Protected Files"). A new `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/` directory is created by copying every `0.2.0` file, then editing only the files the three changes actually touch (`manifest.ts`, `math.ts`, `compute.ts`, `trace.ts`, `ui.ts`, `checks.ts`, `math.test.ts`, `independent-benchmark.test.ts`, `package.test.ts`, `cross-module-links.test.ts`, `README.md`, plus a new `validation/belt-pulley-drive-motor-sizing/0.3.0.md`). Every other file (`values.ts`, `report.ts`, `input-schema.ts`, `input-schema.test.ts`, `test-helpers.ts`, `automationdirect-reference-example.ts`/`.test.ts`, `independent-benchmark.ts`, `index.ts`, `validation.ts`) is copied unchanged or gets only version-string edits, covered below. `0.3.0` is registered by adding one import line to the generated registry via `npm run registry:generate` — never hand-edit `registry.generated.ts` directly.

One thing this module's own `0.2.0` has that none of its four siblings had at the equivalent step: an `independent-benchmark.test.ts` that calls this module's own `resolveDriveForce` directly (not just through `executeModule`), passing `gravityMps2` explicitly — that call site needs the same field-drop `math.test.ts` needs. Caught by reading the file directly, not assumed from the sibling plans' own pattern (none of the four needed this).

**Tech Stack:** TypeScript, Zod, Vitest, `lib/engine` module SDK.

---

## Before you start

Read `docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md` in full — this plan implements all three of its sections (Gravity, `disabledWhen`, Inertia-ratio recommended default) for `belt-pulley-drive-motor-sizing`, the design's own only `disabledWhen` consumer. Confirm the shared infrastructure it depends on is already merged:

```bash
grep -n "PARAMETER_REGISTRY_VERSION = " lib/engine/parameters/definitions.ts
grep -n "motor_sizing.belt_pulley.inertia_ratio_recommended_maximum" lib/engine/parameters/definitions.ts
grep -n "disabledWhen" lib/engine/module-sdk/types.ts lib/engine/module-sdk/schemas.ts lib/engine/module-sdk/validate.ts
grep -n "resolveFieldDisabled" lib/application/calculations/resolve-field-disabled.ts
```

Expected: `PARAMETER_REGISTRY_VERSION = "1.15.0"`; a match for `motor_sizing.belt_pulley.inertia_ratio_recommended_maximum`; `disabledWhen` present in all three `module-sdk` files; `resolveFieldDisabled` exported. All confirmed present while writing this plan — if any is missing, stop, `docs/superpowers/plans/2026-08-18-motor-sizing-shared-infrastructure.md` has not been merged, and this plan cannot proceed.

Confirm your starting point:

```bash
git status
```

Expected: clean, or only unrelated changes you're aware of. Do not proceed on a dirty tree without checking with the user first.

---

### Task 1: Scaffold `0.3.0` as an exact copy of `0.2.0`

**Files:**
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/` (every file, copied from `0.2.0`)

- [ ] **Step 1: Copy the directory**

```bash
cp -r "lib/modules/belt-pulley-drive-motor-sizing/0.2.0" "lib/modules/belt-pulley-drive-motor-sizing/0.3.0"
```

- [ ] **Step 2: Confirm the copy is complete and 0.1.0/0.2.0 are untouched**

```bash
diff -rq "lib/modules/belt-pulley-drive-motor-sizing/0.2.0" "lib/modules/belt-pulley-drive-motor-sizing/0.3.0"
git status --short lib/modules/belt-pulley-drive-motor-sizing/0.1.0/ lib/modules/belt-pulley-drive-motor-sizing/0.2.0/
```

Expected: `diff -rq` reports no differences (a byte-for-byte copy); `git status` on both prior-version paths prints nothing (untouched).

- [ ] **Step 3: Commit the scaffold as its own step, before any edits**

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.3.0
git commit -m "$(cat <<'EOF'
chore: scaffold belt-pulley-drive-motor-sizing 0.3.0 as a copy of 0.2.0

Baseline for the gravity/disabledWhen/inertia-ratio-default
consistency pass
(docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md).
0.1.0 and 0.2.0 stay released, registered, and untouched.
EOF
)"
```

Every later task in this plan edits only files under `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/` (plus the registry, docs, and progress tracker) — `0.1.0/` and `0.2.0/` are never touched again.

---

### Task 2: `manifest.ts` — version bump, drop `gravity`, repoint `inertia_ratio_maximum`

**Files:**
- Modify: `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/manifest.ts`

- [ ] **Step 1: Update the header comment**

Find:

```ts
// Manifest and ports for belt-pulley-drive-motor-sizing 0.2.0 -- the first
// module-version bump in this project. Adds a native repeating
// trapezoidal motion cycle (accelerate/run/decelerate/dwell), velocity-
// first or distance-first input, and deceleration/effective (RMS) torque
// outputs, on top of everything 0.1.0 already computes (inertia, drive
// force, load torque, momentary/required torque) -- see
// docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md
// and context/modules/belt-pulley-drive-motor-sizing/stage-2-contract.md
// "0.2.0 Addendum". Self-contained: duplicates rather than imports 0.1.0's
// own unchanged kernel functions (stage-2-contract.md "cross-version reuse
// policy").
//
// Registered as `belt-pulley-drive-motor-sizing@0.2.0`
// (lib/modules/registry.generated.ts) -- imported by ./index.ts, which
// `npm run registry:generate` discovers. 0.1.0 stays registered, edited,
// and immutable exactly as released (CLAUDE.md).
```

Replace with:

```ts
// Manifest and ports for belt-pulley-drive-motor-sizing 0.3.0 -- the
// consistency-pass follow-on to 0.2.0
// (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md),
// and the only module in this project consuming the shared `disabledWhen`
// UI capability. Three changes on top of everything 0.2.0 already computes:
// the `gravity` port is dropped (hardcoded 9.80665 m/s^2 in ./math.ts
// instead), `inertia_ratio_maximum` repoints at the new
// `motor_sizing.belt_pulley.inertia_ratio_recommended_maximum` parameter
// (registry 1.15.0, founder-directed default of 10), and `./ui.ts` wires
// `disabledWhen` on the four motion-mode-dependent fields
// (target_velocity/constant_velocity_time disable when motion_mode is
// "distance"; travel_distance/cycle_time disable when motion_mode is
// "velocity"). Self-contained: duplicates rather than imports 0.1.0's/
// 0.2.0's own unchanged kernel functions (stage-2-contract.md
// "cross-version reuse policy").
//
// Registered 2026-08-19 as `belt-pulley-drive-motor-sizing@0.3.0`
// (lib/modules/registry.generated.ts) -- imported by ./index.ts, which
// `npm run registry:generate` discovers. 0.1.0 and 0.2.0 stay registered,
// edited, and immutable exactly as released (CLAUDE.md).
```

- [ ] **Step 2: Bump `version` and `parameterRegistryVersion`**

Find:

```ts
export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "belt-pulley-drive-motor-sizing",
  version: "0.2.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.14.0, the version that released this
  // module's own 8 new motor_sizing.belt_pulley.* parameters
  // (stage-2-contract.md "0.2.0 Addendum"). Keep this literal -- never
  // import the mutable current-version constant (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.14.0",
```

Replace with:

```ts
export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "belt-pulley-drive-motor-sizing",
  version: "0.3.0",
  sdkRange: { min: "1.0.0" },
  // Authored against registry 1.15.0. Keep this literal -- never import
  // the mutable current-version constant (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.15.0",
```

- [ ] **Step 3: Remove the `gravity` input port**

Find:

```ts
    {
      key: "gravity",
      parameterId: asParameterId("motion.axis.gravity"),
      required: false,
    },
    {
      key: "friction_coefficient",
```

Replace with:

```ts
    {
      key: "friction_coefficient",
```

- [ ] **Step 4: Repoint `inertia_ratio_maximum` at the recommended-default parameter**

Find:

```ts
    {
      key: "inertia_ratio_maximum",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.inertia_ratio_maximum",
      ),
      required: true,
    },
  ] satisfies ModuleInputPort[],
```

Replace with:

```ts
    {
      key: "inertia_ratio_maximum",
      // 0.3.0: repointed at the new recommended-maximum parameter (registry
      // 1.15.0) -- a founder-directed default of 10, still overridable. The
      // port key stays "inertia_ratio_maximum" for compute/UI stability;
      // only the parameterId it maps to changes. 0.1.0's and 0.2.0's own
      // ports still point at the original required-no-default
      // motor_sizing.belt_pulley.inertia_ratio_maximum, untouched.
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.inertia_ratio_recommended_maximum",
      ),
      required: true,
    },
  ] satisfies ModuleInputPort[],
```

`required: true` stays `true` — the parameter is still a required port at the module level; the registry's own `defaultPolicy: { kind: "constant", value: 10 }` is what auto-fills an absent value at execution time, the identical mechanism the removed `gravity` port already relied on.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: errors in `math.ts`/`compute.ts`/`trace.ts`/`ui.ts` (all still reference the removed `gravity` port or its `DriveForceInput`/`TraceInput` fields) — expected at this point; later tasks fix them.

- [ ] **Step 6: Commit**

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.3.0/manifest.ts
git commit -m "$(cat <<'EOF'
feat(belt-pulley-drive-motor-sizing): 0.3.0 manifest — drop gravity, recommended inertia-ratio default

Version bump to 0.3.0, registry pin to 1.15.0, gravity port removed
(hardcoded in math.ts next), and inertia_ratio_maximum repointed at
motor_sizing.belt_pulley.inertia_ratio_recommended_maximum.
EOF
)"
```

(Committing mid-typecheck-failure is fine here — the next several tasks fix every call site, before the final full verification.)

---

### Task 3: `math.ts` — hardcode standard gravity

**Files:**
- Modify: `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/math.ts`

- [ ] **Step 1: Add the exported constant**

Find:

```ts
export class BeltPulleyMotorSizingInputError extends Error {
```

Replace with:

```ts
/**
 * Standard gravitational acceleration, m/s^2. 0.3.0 hardcodes this rather
 * than taking it as an input — no scenario in this product's scope needs a
 * different value, and `motion.axis.gravity`'s own registry constant
 * default was already exactly this figure everywhere it was used
 * (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md
 * "Gravity"). Exported so ./math.test.ts and ./independent-benchmark.test.ts
 * can reference the exact same value instead of repeating the literal.
 */
export const STANDARD_GRAVITY_M_PER_S2 = 9.80665;

export class BeltPulleyMotorSizingInputError extends Error {
```

- [ ] **Step 2: Remove `gravityMps2` from `DriveForceInput` and use the constant**

Find:

```ts
export interface DriveForceInput {
  readonly externalForceN: number;
  readonly totalMovingMassKg: number;
  readonly gravityMps2: number;
  readonly inclineAngleRad: number;
  readonly frictionCoefficient: number;
}
```

Replace with:

```ts
export interface DriveForceInput {
  readonly externalForceN: number;
  readonly totalMovingMassKg: number;
  readonly inclineAngleRad: number;
  readonly frictionCoefficient: number;
}
```

Find:

```ts
export function resolveDriveForce(input: DriveForceInput): DriveForceResult {
  assertFinite("externalForceN", input.externalForceN);
  assertPositive("totalMovingMassKg", input.totalMovingMassKg);
  assertPositive("gravityMps2", input.gravityMps2);
  assertFinite("inclineAngleRad", input.inclineAngleRad);
  assertNonNegative("frictionCoefficient", input.frictionCoefficient);

  const gravityForceN =
    input.totalMovingMassKg *
    input.gravityMps2 *
    (Math.sin(input.inclineAngleRad) +
      input.frictionCoefficient * Math.cos(input.inclineAngleRad));

  return { forceN: input.externalForceN + gravityForceN };
}
```

Replace with:

```ts
export function resolveDriveForce(input: DriveForceInput): DriveForceResult {
  assertFinite("externalForceN", input.externalForceN);
  assertPositive("totalMovingMassKg", input.totalMovingMassKg);
  assertFinite("inclineAngleRad", input.inclineAngleRad);
  assertNonNegative("frictionCoefficient", input.frictionCoefficient);

  const gravityForceN =
    input.totalMovingMassKg *
    STANDARD_GRAVITY_M_PER_S2 *
    (Math.sin(input.inclineAngleRad) +
      input.frictionCoefficient * Math.cos(input.inclineAngleRad));

  return { forceN: input.externalForceN + gravityForceN };
}
```

- [ ] **Step 3: Typecheck (expect errors — callers still pass `gravityMps2`, fixed in later tasks)**

Run: `npm run typecheck`
Expected: errors in `compute.ts`, `math.test.ts`, and `independent-benchmark.test.ts` (all still pass a `gravityMps2` field that no longer exists on `DriveForceInput`). Expected at this point — Tasks 4, 8, and 9 fix them.

- [ ] **Step 4: Commit**

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.3.0/math.ts
git commit -m "$(cat <<'EOF'
feat(belt-pulley-drive-motor-sizing): 0.3.0 hardcodes standard gravity in resolveDriveForce

gravityMps2 is no longer an input to resolveDriveForce -- it uses a
local STANDARD_GRAVITY_M_PER_S2 = 9.80665 constant. Behavior-neutral:
the registry's own gravity default was already exactly this value.
EOF
)"
```

---

### Task 4: `compute.ts` — remove the `gravity` input read

**Files:**
- Modify: `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/compute.ts`

- [ ] **Step 1: Remove the `gravity` lookup**

Find:

```ts
  const inclineAngle = quantityAt(values, "incline_angle");
  const gravity = quantityAt(values, "gravity");
  const frictionCoefficient = quantityAt(values, "friction_coefficient");
```

Replace with:

```ts
  const inclineAngle = quantityAt(values, "incline_angle");
  const frictionCoefficient = quantityAt(values, "friction_coefficient");
```

- [ ] **Step 2: Remove `gravity` from the first (required-inputs) guard's failure message but not its condition — it was never in that list**

Read the two `if` guards immediately below the lookups. `gravity` already only appears in the *second* guard (the constant-default one) — confirm this by re-reading the block before editing:

```ts
  if (
    inclineAngle === undefined ||
    frictionCoefficient === undefined ||
    totalMovingMass === undefined ||
    pulleyPitchDiameter === undefined ||
    pulleyMass === undefined ||
    idlerPulleyMass === undefined ||
    mechanicalEfficiency === undefined ||
    orientation === undefined ||
    motionMode === undefined ||
    accelerationTime === undefined ||
    decelerationTime === undefined ||
    motorRotorInertia === undefined ||
    requiredTorqueSafetyFactor === undefined ||
    inertiaRatioMaximum === undefined
  ) {
    throw new Error(
      "belt-pulley-drive-motor-sizing requires its full set of geometry, motion, motor, and safety-factor inputs.",
    );
  }
```

This guard is untouched — `gravity` was never one of its conditions. Move on to Step 3, which fixes the second guard.

- [ ] **Step 3: Remove `gravity` from the constant-default guard**

Find:

```ts
  // gravity/gear_ratio/belt_mass/external_force/dwell_time all have
  // registry constant defaults -- auto-filled by the module SDK when
  // absent, so none should reach compute() as undefined. Guarded anyway
  // as a defense-in-depth measure, the same treatment 0.1.0 already gives
  // its own constant-default ports.
  if (
    gravity === undefined ||
    gearRatio === undefined ||
    beltMass === undefined ||
    externalForce === undefined ||
    dwellTime === undefined
  ) {
    throw new Error(
      "belt-pulley-drive-motor-sizing requires gravity, gear_ratio, belt_mass, external_force, and dwell_time to resolve (the registry defaults should have filled these).",
    );
  }
```

Replace with:

```ts
  // gear_ratio/belt_mass/external_force/dwell_time all have registry
  // constant defaults -- auto-filled by the module SDK when absent, so none
  // should reach compute() as undefined. Guarded anyway as a
  // defense-in-depth measure, the same treatment 0.1.0 already gives its
  // own constant-default ports. gravity is no longer an input in 0.3.0
  // (math.ts hardcodes STANDARD_GRAVITY_M_PER_S2) -- nothing to guard here
  // anymore.
  if (
    gearRatio === undefined ||
    beltMass === undefined ||
    externalForce === undefined ||
    dwellTime === undefined
  ) {
    throw new Error(
      "belt-pulley-drive-motor-sizing requires gear_ratio, belt_mass, external_force, and dwell_time to resolve (the registry defaults should have filled these).",
    );
  }
```

- [ ] **Step 4: Remove `gravityMps2` from the `resolveDriveForce` call**

Find:

```ts
  const { forceN } = resolveDriveForce({
    externalForceN: externalForce.value,
    totalMovingMassKg: totalMovingMass.value,
    gravityMps2: gravity.value,
    inclineAngleRad: inclineAngle.value,
    frictionCoefficient: frictionCoefficient.value,
  });
```

Replace with:

```ts
  const { forceN } = resolveDriveForce({
    externalForceN: externalForce.value,
    totalMovingMassKg: totalMovingMass.value,
    inclineAngleRad: inclineAngle.value,
    frictionCoefficient: frictionCoefficient.value,
  });
```

- [ ] **Step 5: Remove `gravity` from the `buildTrace` call**

Find:

```ts
    trace: buildTrace({
      orientation,
      inclineAngle,
      gravity,
      frictionCoefficient,
```

Replace with:

```ts
    trace: buildTrace({
      orientation,
      inclineAngle,
      frictionCoefficient,
```

- [ ] **Step 6: Typecheck (expect a remaining error — `trace.ts` still declares `gravity`, fixed next)**

Run: `npm run typecheck`
Expected: `compute.ts` itself now clean; `trace.ts` still requires a `gravity` field on `TraceInput` — Task 5 fixes this. `math.test.ts`/`independent-benchmark.test.ts` errors from Task 3 also remain — Tasks 8/9 fix those.

- [ ] **Step 7: Commit**

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.3.0/compute.ts
git commit -m "$(cat <<'EOF'
feat(belt-pulley-drive-motor-sizing): 0.3.0 compute.ts drops the gravity input read

No more quantityAt(values, "gravity") lookup, guard, or pass-through to
resolveDriveForce/buildTrace -- gravity is hardcoded in math.ts now.
EOF
)"
```

---

### Task 5: `trace.ts` — remove `gravity` from the trace contract

**Files:**
- Modify: `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/trace.ts`

- [ ] **Step 1: Remove `gravity` from `TraceInput`**

Find:

```ts
export interface TraceInput {
  readonly orientation: EnumValue;
  readonly inclineAngle: Quantity;
  readonly gravity: Quantity;
  readonly frictionCoefficient: Quantity;
```

Replace with:

```ts
export interface TraceInput {
  readonly orientation: EnumValue;
  readonly inclineAngle: Quantity;
  readonly frictionCoefficient: Quantity;
```

- [ ] **Step 2: Remove the `g` row from the load-torque step's own trace inputs**

Find:

```ts
      { label: "g", value: input.gravity, ref: "motion.axis.gravity" },
      {
        label: "mu",
        value: input.frictionCoefficient,
        ref: "motion.axis.friction_coefficient",
      },
```

Replace with:

```ts
      {
        label: "mu",
        value: input.frictionCoefficient,
        ref: "motion.axis.friction_coefficient",
      },
```

- [ ] **Step 3: Update the load-torque step's own `expression` string to note the constant**

Find:

```ts
    methodId: "motor_sizing.belt_pulley.load_torque",
    expression: "F = F_A + M*g*(sin(theta)+mu*cos(theta)); T_L = F*D/(2*eta*i)",
```

Replace with:

```ts
    methodId: "motor_sizing.belt_pulley.load_torque",
    // 0.3.0: g = 9.80665 m/s^2, hardcoded (no longer an input) -- see
    // math.ts's own STANDARD_GRAVITY_M_PER_S2.
    expression:
      "F = F_A + M*g*(sin(theta)+mu*cos(theta)), g=9.80665; T_L = F*D/(2*eta*i)",
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: `trace.ts`/`compute.ts` now clean. Remaining errors, if any, are only in `math.test.ts`/`independent-benchmark.test.ts` (Tasks 8/9) and `ui.ts` (Task 6 — not yet an error since dropping a field doesn't fail typecheck by itself; `ui.ts` is edited next regardless).

- [ ] **Step 5: Commit**

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.3.0/trace.ts
git commit -m "$(cat <<'EOF'
feat(belt-pulley-drive-motor-sizing): 0.3.0 trace.ts drops gravity as a traced input

g is now a stated constant (9.80665) in the load-torque step's own
expression text rather than a traced port value.
EOF
)"
```

---

### Task 6: `ui.ts` — remove `gravity`, add inertia-ratio help text, wire `disabledWhen`

**Files:**
- Modify: `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/ui.ts`

- [ ] **Step 1: Update the header comment**

Find:

```ts
// Generic UI schema for belt-pulley-drive-motor-sizing 0.2.0. Selects and
// groups input ports for the generic module workspace (Unit 3.3); it
// encodes no computation. All four motion-mode-dependent fields
// (target_velocity, travel_distance, constant_velocity_time, cycle_time)
// are listed -- the real per-mode requirement is enforced server-side by
// ./input-schema.ts, the same "all fields shown, validation enforces
// requirement" precedent support-bearing@0.1.0's own bearing.location
// split already established for its UI.
```

Replace with:

```ts
// Generic UI schema for belt-pulley-drive-motor-sizing 0.3.0. Selects and
// groups input ports for the generic module workspace (Unit 3.3); it
// encodes no computation. All four motion-mode-dependent fields
// (target_velocity, travel_distance, constant_velocity_time, cycle_time)
// are listed -- the real per-mode requirement is still enforced
// server-side by ./input-schema.ts (unchanged from 0.2.0), the same "all
// fields shown, validation enforces requirement" precedent
// support-bearing@0.1.0's own bearing.location split already established.
//
// NEW in 0.3.0: this module is the only consumer of the shared
// `disabledWhen` UI capability
// (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md
// "Generic UI capability: disabledWhen") -- target_velocity/
// constant_velocity_time render disabled whenever motion_mode is
// "distance"; travel_distance/cycle_time render disabled whenever
// motion_mode is "velocity". This is a presentation hint only; the actual
// required/optional enforcement per mode still happens in
// ./input-schema.ts exactly as it did in 0.2.0.
```

- [ ] **Step 2: Wire `disabledWhen` on the four motion-mode-dependent fields**

Find:

```ts
    {
      id: "motion",
      title: "Motion cycle",
      fields: [
        { portKey: "motion_mode" },
        { portKey: "target_velocity" },
        { portKey: "travel_distance" },
        { portKey: "acceleration_time" },
        { portKey: "deceleration_time" },
        { portKey: "constant_velocity_time" },
        { portKey: "cycle_time" },
        { portKey: "dwell_time" },
      ],
    },
```

Replace with:

```ts
    {
      id: "motion",
      title: "Motion cycle",
      fields: [
        { portKey: "motion_mode" },
        {
          portKey: "target_velocity",
          disabledWhen: { portKey: "motion_mode", equals: "distance" },
        },
        {
          portKey: "travel_distance",
          disabledWhen: { portKey: "motion_mode", equals: "velocity" },
        },
        { portKey: "acceleration_time" },
        { portKey: "deceleration_time" },
        {
          portKey: "constant_velocity_time",
          disabledWhen: { portKey: "motion_mode", equals: "distance" },
        },
        {
          portKey: "cycle_time",
          disabledWhen: { portKey: "motion_mode", equals: "velocity" },
        },
        { portKey: "dwell_time" },
      ],
    },
```

- [ ] **Step 3: Remove the `gravity` field**

Find:

```ts
    {
      id: "geometry-and-environment",
      title: "Geometry and environment",
      fields: [
        { portKey: "orientation" },
        { portKey: "incline_angle" },
        { portKey: "gravity" },
        { portKey: "friction_coefficient" },
        { portKey: "total_moving_mass" },
      ],
    },
```

Replace with:

```ts
    {
      id: "geometry-and-environment",
      title: "Geometry and environment",
      fields: [
        { portKey: "orientation" },
        { portKey: "incline_angle" },
        { portKey: "friction_coefficient" },
        { portKey: "total_moving_mass" },
      ],
    },
```

- [ ] **Step 4: Add help text to the recommended-default inertia-ratio field**

Find:

```ts
    {
      id: "motor-and-safety-factors",
      title: "Candidate motor and safety factors",
      fields: [
        { portKey: "motor_rotor_inertia" },
        { portKey: "required_torque_safety_factor" },
        { portKey: "inertia_ratio_maximum" },
      ],
    },
```

Replace with:

```ts
    {
      id: "motor-and-safety-factors",
      title: "Candidate motor and safety factors",
      fields: [
        { portKey: "motor_rotor_inertia" },
        { portKey: "required_torque_safety_factor" },
        {
          portKey: "inertia_ratio_maximum",
          label: "Recommended maximum inertia ratio",
          help: "Use the motor manufacturer's limit when available.",
        },
      ],
    },
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: `0 errors` for this file.

- [ ] **Step 6: Commit**

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.3.0/ui.ts
git commit -m "$(cat <<'EOF'
feat(belt-pulley-drive-motor-sizing): 0.3.0 ui.ts drops gravity, wires disabledWhen, labels the recommended inertia-ratio default

This module is the only consumer of the shared disabledWhen capability
in this project: target_velocity/constant_velocity_time disable when
motion_mode is "distance"; travel_distance/cycle_time disable when
motion_mode is "velocity". Presentation only -- input-schema.ts's own
superRefine requirement logic is unchanged.
EOF
)"
```

---

### Task 7: `checks.ts` — exceeded inertia ratio is a warning, not a failure

**Files:**
- Modify: `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/checks.ts`

- [ ] **Step 1: Update the header comment**

Find:

```ts
// Acceptance checks for belt-pulley-drive-motor-sizing 0.2.0. Unchanged
// from 0.1.0: the inertia ratio against an engineer-supplied maximum is
// still the only real check -- no source found gives a universal
// continuous-torque acceptance criterion for effective_torque
// (docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md
// "Checks"). Duplicated, not imported, per stage-2-contract.md "0.2.0
// Addendum" cross-version reuse policy.
```

Replace with:

```ts
// Acceptance checks for belt-pulley-drive-motor-sizing 0.3.0. The inertia
// ratio against an engineer-supplied maximum is still the only real check
// -- no source found gives a universal continuous-torque acceptance
// criterion for effective_torque
// (docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md
// "Checks"). Duplicated, not imported, per stage-2-contract.md "0.2.0
// Addendum" cross-version reuse policy.
//
// 0.3.0: the exceeded-case status changed from "fail" to "warning"
// (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md
// "Inertia-ratio recommended default") -- inertia_ratio_maximum now
// resolves to a founder-directed recommended default (10) rather than a
// required no-default value, so exceeding it is advisory, not a hard
// failure. 0.1.0's and 0.2.0's own check (required input, "fail" on
// exceedance) is untouched.
```

- [ ] **Step 2: Change the status and message**

Find:

```ts
export function buildChecks(input: ChecksInput): CheckResult[] {
  const inertiaOk = input.inertiaRatio <= input.inertiaRatioMaximum;

  return [
    {
      id: "inertia-ratio",
      status: inertiaOk ? "pass" : "fail",
      message: inertiaOk
        ? "Load-to-rotor inertia ratio is within the required maximum."
        : "Load-to-rotor inertia ratio exceeds the required maximum.",
      criterion: "R_J <= R_Jmax",
```

Replace with:

```ts
export function buildChecks(input: ChecksInput): CheckResult[] {
  const inertiaOk = input.inertiaRatio <= input.inertiaRatioMaximum;

  return [
    {
      id: "inertia-ratio",
      status: inertiaOk ? "pass" : "warning",
      message: inertiaOk
        ? "Load-to-rotor inertia ratio is within the recommended maximum."
        : "Load-to-rotor inertia ratio exceeds the recommended maximum — motor response may be sluggish or harder to tune; not recommended, but this does not block the calculation.",
      criterion: "R_J <= R_Jmax",
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: `0 errors` (`CheckResult`'s own `status` type already includes `"warning"` — `lib/engine/trace/checks.ts`).

- [ ] **Step 4: Commit**

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.3.0/checks.ts
git commit -m "$(cat <<'EOF'
feat(belt-pulley-drive-motor-sizing): 0.3.0 inertia-ratio check downgrades exceeded case to warning

Matches the recommended (not required) nature of the new default --
exceeding it is advisory, never blocking.
EOF
)"
```

---

### Task 8: `math.test.ts` — drop `gravityMps2`

**Files:**
- Modify: `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/math.test.ts`

Only one call site in this file passes `gravityMps2` to `resolveDriveForce`, and it already uses a local `G = 9.80665` constant that is numerically identical to `STANDARD_GRAVITY_M_PER_S2` — the assertion's own expected value (`10 + 50 * G * 0.15`) needs no change, only the now-nonexistent field.

- [ ] **Step 1: Drop the field**

Find:

```ts
describe("resolveDriveForce / resolveLoadTorque", () => {
  it("F = FA + m*g*(sin(theta)+mu*cos(theta)); TL = F*D/(2*eta*i)", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 10,
      totalMovingMassKg: 50,
      gravityMps2: G,
      inclineAngleRad: 0,
      frictionCoefficient: 0.15,
    });
    expect(forceN).toBeCloseTo(10 + 50 * G * 0.15, 9);
```

Replace with:

```ts
describe("resolveDriveForce / resolveLoadTorque", () => {
  it("F = FA + m*g*(sin(theta)+mu*cos(theta)); TL = F*D/(2*eta*i)", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 10,
      totalMovingMassKg: 50,
      inclineAngleRad: 0,
      frictionCoefficient: 0.15,
    });
    // G (local, 9.80665) matches math.ts's own STANDARD_GRAVITY_M_PER_S2
    // exactly -- no assertion value changes, only the removed field above.
    expect(forceN).toBeCloseTo(10 + 50 * G * 0.15, 9);
```

- [ ] **Step 2: Confirm no `gravityMps2` references remain**

```bash
grep -n "gravityMps2" "lib/modules/belt-pulley-drive-motor-sizing/0.3.0/math.test.ts"
```

Expected: no output.

- [ ] **Step 3: Run the tests and typecheck**

Run: `npx vitest run lib/modules/belt-pulley-drive-motor-sizing/0.3.0/math.test.ts`
Expected: all tests PASS.

Run: `npm run typecheck`
Expected: only `independent-benchmark.test.ts` errors remain (Task 9).

- [ ] **Step 4: Commit**

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.3.0/math.test.ts
git commit -m "$(cat <<'EOF'
test(belt-pulley-drive-motor-sizing): 0.3.0 math.test.ts drops gravityMps2

The one call site's own local G=9.80665 constant already matches
math.ts's own STANDARD_GRAVITY_M_PER_S2 exactly, so only the
now-nonexistent field is dropped -- the assertion's expected value is
unchanged.
EOF
)"
```

---

### Task 9: `independent-benchmark.test.ts` — drop `gravityMps2` from the kernel call only

**Files:**
- Modify: `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/independent-benchmark.test.ts`

This file calls two different functions with a `gravityMps2` field: this module's own `resolveDriveForce` (from `./math`, now field-less) and `resolveOrientalMotorLoadTorque` (from `./independent-benchmark`, a deliberately separate, structurally different reimplementation with its own unrelated `OrientalMotorLoadTorqueInput` interface — untouched, still takes `gravityMps2` as its own explicit input). Only the first needs editing.

- [ ] **Step 1: Drop `gravityMps2` from the `resolveDriveForce` call only**

Find:

```ts
                  const kernel = (() => {
                    const { forceN } = resolveDriveForce({
                      externalForceN: externalForce,
                      totalMovingMassKg: mass,
                      gravityMps2: G,
                      inclineAngleRad: incline,
                      frictionCoefficient: friction,
                    });
                    return resolveLoadTorque({
                      forceN,
                      pulleyPitchDiameterM: diameter,
                      mechanicalEfficiency: efficiency,
                      gearRatio,
                    }).loadTorqueNm;
                  })();
                  const benchmark = resolveOrientalMotorLoadTorque({
                    totalMovingMassKg: mass,
                    gravityMps2: G,
                    inclineAngleRad: incline,
                    frictionCoefficient: friction,
```

Replace with:

```ts
                  const kernel = (() => {
                    const { forceN } = resolveDriveForce({
                      externalForceN: externalForce,
                      totalMovingMassKg: mass,
                      inclineAngleRad: incline,
                      frictionCoefficient: friction,
                    });
                    return resolveLoadTorque({
                      forceN,
                      pulleyPitchDiameterM: diameter,
                      mechanicalEfficiency: efficiency,
                      gearRatio,
                    }).loadTorqueNm;
                  })();
                  // resolveOrientalMotorLoadTorque (./independent-benchmark)
                  // is a deliberately separate reimplementation with its own
                  // gravityMps2 input -- unaffected by 0.3.0's gravity
                  // hardcode in ./math.ts, and kept at exactly G=9.80665
                  // here so this property sweep still compares like for
                  // like against the kernel's own (now-hardcoded) value.
                  const benchmark = resolveOrientalMotorLoadTorque({
                    totalMovingMassKg: mass,
                    gravityMps2: G,
                    inclineAngleRad: incline,
                    frictionCoefficient: friction,
```

- [ ] **Step 2: Confirm exactly one `gravityMps2` reference remains (the benchmark's own, untouched)**

```bash
grep -n "gravityMps2" "lib/modules/belt-pulley-drive-motor-sizing/0.3.0/independent-benchmark.test.ts"
```

Expected: exactly one match, on the `resolveOrientalMotorLoadTorque` call.

- [ ] **Step 3: Run the tests and typecheck**

Run: `npx vitest run lib/modules/belt-pulley-drive-motor-sizing/0.3.0/independent-benchmark.test.ts`
Expected: all tests PASS — `G` is exactly `9.80665`, identical to `STANDARD_GRAVITY_M_PER_S2`, so the property sweep still agrees to the same 9-decimal tolerance.

Run: `npm run typecheck`
Expected: `0 errors` across the whole `0.3.0` directory now (remaining errors, if any, are in `package.test.ts`, fixed in Task 10).

- [ ] **Step 4: Commit**

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.3.0/independent-benchmark.test.ts
git commit -m "$(cat <<'EOF'
test(belt-pulley-drive-motor-sizing): 0.3.0 independent-benchmark.test.ts drops gravityMps2 from the kernel call

resolveDriveForce no longer takes gravityMps2 (math.ts hardcodes it).
resolveOrientalMotorLoadTorque -- a deliberately separate
reimplementation with its own unrelated interface -- keeps its own
gravityMps2=G=9.80665 explicit input unchanged, so the property sweep
still compares like for like.
EOF
)"
```

---

### Task 10: `package.test.ts` — regression proof, default-value test, warning-status test, `disabledWhen` structural test

**Files:**
- Modify: `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/package.test.ts`

None of the existing input fixtures (`baselineInput`, `distanceModeInput`, `verticalInput`) set `values.gravity` — they always relied on the registry default. Since the `gravity` port no longer exists on the `0.3.0` manifest at all, these fixtures need no changes, and their continued passing **is** the regression proof that the gravity hardcode is behavior-neutral.

- [ ] **Step 1: Update `EXPECTED_SOURCE_HASH` to a placeholder (real value computed in Task 12)**

Find:

```ts
// Pinned by `npm run module:source-hash -- belt-pulley-drive-motor-sizing
// 0.2.0` -- see lib/engine/module-sdk/conformance.ts's
// "source-immutability" check.
const EXPECTED_SOURCE_HASH = "9d3676ca93508828";

describe("belt-pulley-drive-motor-sizing 0.2.0 module conformance", () => {
```

Replace with:

```ts
// Pinned by `npm run module:source-hash -- belt-pulley-drive-motor-sizing
// 0.3.0` -- see lib/engine/module-sdk/conformance.ts's
// "source-immutability" check. Update this value in the same commit as a
// deliberate change to this directory's .ts files; an unreviewed change
// leaves it stale and the check below fails. Placeholder until Task 12
// computes the real hash.
const EXPECTED_SOURCE_HASH = "PLACEHOLDER_UNTIL_TASK_12";

describe("belt-pulley-drive-motor-sizing 0.3.0 module conformance", () => {
```

- [ ] **Step 2: Rename the remaining `describe` block title from `0.2.0` to `0.3.0`**

Find:

```ts
describe("belt-pulley-drive-motor-sizing 0.2.0 executeModule", () => {
```

Replace with:

```ts
describe("belt-pulley-drive-motor-sizing 0.3.0 executeModule", () => {
```

- [ ] **Step 3: Update the inertia-ratio-pass assertion's own comment context, add the warning-status and recommended-default tests, and a `disabledWhen` structural test**

Find:

```ts
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("pass");
  });
```

Replace with:

```ts
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("pass");
  });

  it("reports a warning (not a failure) on the inertia-ratio check when the load is too large for the motor", () => {
    const input = baselineInput();
    input.values.motor_rotor_inertia = makeQuantity(1e-8, "kg*m^2");
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      input,
    );
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("warning");
  });

  it("resolves inertia_ratio_maximum to the recommended default of 10 when unset, and remains overridable", () => {
    const defaultInput = baselineInput();
    delete (defaultInput.values as Record<string, unknown>)
      .inertia_ratio_maximum;
    const defaultResult = executeModule(
      beltPulleyDriveMotorSizingModule,
      defaultInput,
    );
    const defaultCheck = defaultResult.checks.find(
      (c) => c.id === "inertia-ratio",
    );
    expect(asQuantity(defaultCheck!.allowable!).value).toBeCloseTo(10, 9);

    const overriddenInput = baselineInput();
    overriddenInput.values.inertia_ratio_maximum = makeQuantity(5, "ratio");
    const overriddenResult = executeModule(
      beltPulleyDriveMotorSizingModule,
      overriddenInput,
    );
    const overriddenCheck = overriddenResult.checks.find(
      (c) => c.id === "inertia-ratio",
    );
    expect(asQuantity(overriddenCheck!.allowable!).value).toBeCloseTo(5, 9);
  });
```

`baselineInput()`'s own `inertia_ratio_maximum = 30` sits comfortably above both `10` and `5`, so both branches of the new default-value test exercise the `"pass"` path — that test only asserts on `allowable` (the resolved `inertia_ratio_maximum` value the check was run against), not on `status`, so it stays correct regardless of which side of either threshold the ratio happens to fall on.

- [ ] **Step 4: Add a `disabledWhen` structural test against `uiSchema` directly**

Add this new `describe` block at the end of the file (after the final closing `});` of `describe("belt-pulley-drive-motor-sizing 0.3.0 executeModule", ...)`):

```ts

describe("belt-pulley-drive-motor-sizing 0.3.0 disabledWhen wiring", () => {
  it("disables target_velocity and constant_velocity_time when motion_mode is distance, and travel_distance/cycle_time when motion_mode is velocity", () => {
    const motionGroup = uiSchema.groups.find((g) => g.id === "motion");
    expect(motionGroup).toBeDefined();

    const byKey = new Map(
      motionGroup!.fields.map((f) => [f.portKey, f.disabledWhen]),
    );

    expect(byKey.get("target_velocity")).toEqual({
      portKey: "motion_mode",
      equals: "distance",
    });
    expect(byKey.get("constant_velocity_time")).toEqual({
      portKey: "motion_mode",
      equals: "distance",
    });
    expect(byKey.get("travel_distance")).toEqual({
      portKey: "motion_mode",
      equals: "velocity",
    });
    expect(byKey.get("cycle_time")).toEqual({
      portKey: "motion_mode",
      equals: "velocity",
    });
    // motion_mode itself, and the two fixed-duration phase times, carry no
    // disabledWhen -- they're real inputs in both modes.
    expect(byKey.get("motion_mode")).toBeUndefined();
    expect(byKey.get("acceleration_time")).toBeUndefined();
    expect(byKey.get("deceleration_time")).toBeUndefined();
    expect(byKey.get("dwell_time")).toBeUndefined();
  });

  it("every disabledWhen.portKey references a declared enum input port (package-validation already asserts this generically; confirmed directly here too)", () => {
    const motionGroup = uiSchema.groups.find((g) => g.id === "motion");
    const enumPortKeys = new Set(
      ports.inputs
        .filter((p) => p.key === "motion_mode")
        .map((p) => p.key),
    );
    for (const field of motionGroup!.fields) {
      if (field.disabledWhen !== undefined) {
        expect(enumPortKeys.has(field.disabledWhen.portKey)).toBe(true);
      }
    }
  });
});
```

Add the needed imports at the top of the file. Find the existing import block:

```ts
import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { beltPulleyDriveMotorSizingModule } from "./index";
import { asQuantity, type RawInput } from "./test-helpers";
```

Replace with:

```ts
import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { beltPulleyDriveMotorSizingModule } from "./index";
import { ports } from "./manifest";
import { uiSchema } from "./ui";
import { asQuantity, type RawInput } from "./test-helpers";
```

- [ ] **Step 5: Run the tests to verify they pass, using the placeholder hash**

Run: `npx vitest run lib/modules/belt-pulley-drive-motor-sizing/0.3.0/package.test.ts`
Expected: every test PASSES **except** `"runs the source-immutability check and it passes (not skipped)"`, which fails because `EXPECTED_SOURCE_HASH` is still the Step 1 placeholder — expected at this point; Task 12 fixes it. Confirm every other test in the file passes, including the four touched/added in this task.

- [ ] **Step 6: Commit**

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.3.0/package.test.ts
git commit -m "$(cat <<'EOF'
test(belt-pulley-drive-motor-sizing): 0.3.0 package.test.ts — warning status, recommended-default, disabledWhen coverage

Exceeded inertia ratio now asserts "warning", not "fail". New test
confirms inertia_ratio_maximum resolves to the recommended default of
10 when unset and stays overridable. New disabledWhen structural test
confirms the "motion" group's four motion-mode-dependent fields carry
the right condition and nothing else does. Existing baseline/
distance-mode/vertical fixtures are unchanged (none ever set gravity
explicitly) -- their continued passing is the regression proof that
the gravity hardcode is behavior-neutral.
EOF
)"
```

---

### Task 11: `cross-module-links.test.ts` — update version-scoped titles, add `0.2.0` as a sibling upstream

**Files:**
- Modify: `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/cross-module-links.test.ts`

`0.2.0`'s own version of this file already added `0.1.0` as a sibling upstream module (the first time this project swept one module version's own outputs against a later version of the same module's own inputs). `0.3.0` needs the same treatment for `0.2.0` — both `0.1.0` and `0.2.0` become upstream candidates now.

- [ ] **Step 1: Add a `0.2.0` upstream import alongside the existing `0.1.0` one**

Find:

```ts
import { ports as beltPulleyDriveMotorSizing010Ports } from "../0.1.0/manifest";
```

Replace with:

```ts
import { ports as beltPulleyDriveMotorSizing010Ports } from "../0.1.0/manifest";
import { ports as beltPulleyDriveMotorSizing020Ports } from "../0.2.0/manifest";
```

- [ ] **Step 2: Add the `0.2.0` entry to `UPSTREAM_MODULES`**

Find:

```ts
  {
    label: "belt-pulley-drive-motor-sizing-0.1.0",
    outputs: beltPulleyDriveMotorSizing010Ports.outputs,
  },
];
```

Replace with:

```ts
  {
    label: "belt-pulley-drive-motor-sizing-0.1.0",
    outputs: beltPulleyDriveMotorSizing010Ports.outputs,
  },
  {
    label: "belt-pulley-drive-motor-sizing-0.2.0",
    outputs: beltPulleyDriveMotorSizing020Ports.outputs,
  },
];
```

- [ ] **Step 3: Update the version-scoped `describe` titles and the module-instance-id labels**

Find:

```ts
describe("belt-pulley-drive-motor-sizing 0.2.0 cross-module links: exhaustively confirmed absent, except one documented pair", () => {
  for (const upstream of UPSTREAM_MODULES) {
    it(`no ${upstream.label} output is link-compatible with any belt-pulley-drive-motor-sizing 0.2.0 input, other than the one documented exception`, () => {
      const sources = upstream.outputs.map((port) =>
        outputNode(port, `${upstream.label}-1`),
      );
      const sinks = ports.inputs.map((port) =>
        inputNode(port, "belt-pulley-drive-motor-sizing-0.2.0-1"),
      );

      for (const sink of sinks) {
        for (const source of sources) {
          const outputKey = source.id.slice(`${upstream.label}-1.`.length);
          const inputKey = sink.id.slice(
            "belt-pulley-drive-motor-sizing-0.2.0-1.".length,
          );
```

Replace with:

```ts
describe("belt-pulley-drive-motor-sizing 0.3.0 cross-module links: exhaustively confirmed absent, except one documented pair", () => {
  for (const upstream of UPSTREAM_MODULES) {
    it(`no ${upstream.label} output is link-compatible with any belt-pulley-drive-motor-sizing 0.3.0 input, other than the one documented exception`, () => {
      const sources = upstream.outputs.map((port) =>
        outputNode(port, `${upstream.label}-1`),
      );
      const sinks = ports.inputs.map((port) =>
        inputNode(port, "belt-pulley-drive-motor-sizing-0.3.0-1"),
      );

      for (const sink of sinks) {
        for (const source of sources) {
          const outputKey = source.id.slice(`${upstream.label}-1.`.length);
          const inputKey = sink.id.slice(
            "belt-pulley-drive-motor-sizing-0.3.0-1.".length,
          );
```

- [ ] **Step 4: Update the confirming-exception test's own module-instance-id label**

Find:

```ts
    const sink = inputNode(
      findPort(ports.inputs, "total_moving_mass"),
      "belt-pulley-drive-motor-sizing-0.2.0-1",
    );
```

Replace with:

```ts
    const sink = inputNode(
      findPort(ports.inputs, "total_moving_mass"),
      "belt-pulley-drive-motor-sizing-0.3.0-1",
    );
```

- [ ] **Step 5: Update the workflow-role `describe` title**

Find:

```ts
describe("belt-pulley-drive-motor-sizing 0.2.0 workflow role: deliberately none", () => {
```

Replace with:

```ts
describe("belt-pulley-drive-motor-sizing 0.3.0 workflow role: deliberately none", () => {
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run lib/modules/belt-pulley-drive-motor-sizing/0.3.0/cross-module-links.test.ts`
Expected: all tests PASS — the exhaustive sweep (now against six upstream modules, including `0.1.0` and `0.2.0` of this same module) still finds exactly the one documented `total_moving_mass` pair and nothing else. Removing `gravity` and repointing `inertia_ratio_maximum` doesn't change which of this module's own ports are link-compatible with anything upstream — `0.2.0`'s own `gravity`/`inertia_ratio_maximum` outputs don't exist either (it has no output ports of those names), so there is nothing new to find there.

- [ ] **Step 7: Commit**

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.3.0/cross-module-links.test.ts
git commit -m "$(cat <<'EOF'
test(belt-pulley-drive-motor-sizing): 0.3.0 cross-module-links.test.ts — add 0.2.0 as a sibling upstream, update titles to 0.3.0

Both 0.1.0 and 0.2.0 of this same module are now upstream candidates
in the exhaustive sweep, the same treatment 0.2.0's own file already
gave 0.1.0.
EOF
)"
```

---

### Task 12: `index.ts` and `validation.ts` — version string updates, register, pin hash

**Files:**
- Modify: `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/index.ts`
- Modify: `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/validation.ts`
- Modify: `lib/modules/registry.generated.ts` (generated — do not hand-edit)
- Modify: `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/package.test.ts`

- [ ] **Step 1: Update `index.ts`'s own header comment**

Find:

```ts
// The belt-pulley-drive-motor-sizing 0.2.0 package (Stage 6 release).
// Assembles the manifest, ports, compute, UI, report, and validation
// record into a single `ModulePackage` and seals it (the content hash is
// stamped here).
//
// Named `index.ts` so `npm run registry:generate` discovers this package
// -- 0.1.0 stays registered, edited, and immutable exactly as released
// (CLAUDE.md); this is the first module-version bump in this project.
```

Replace with:

```ts
// The belt-pulley-drive-motor-sizing 0.3.0 package -- the consistency-pass
// follow-on to 0.2.0, and the last of the five Motor Sizing Tool
// module-version bumps
// (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md).
// Assembles the manifest, ports, compute, UI, report, and validation
// record into a single `ModulePackage` and seals it (the content hash is
// stamped here).
//
// Named `index.ts` so `npm run registry:generate`
// (scripts/generate-registry.mts) discovers this package. Released and
// registered 2026-08-19 (lib/modules/registry.generated.ts,
// validation/belt-pulley-drive-motor-sizing/0.3.0.md). 0.1.0 and 0.2.0
// stay released, registered, and untouched (their own index.ts files are
// unaffected by this one).
```

The exported binding name `beltPulleyDriveMotorSizingModule` stays as-is — `package.test.ts` already imports it under that exact name from `./index`.

- [ ] **Step 2: Update `validation.ts`'s `moduleVersion` and add a 0.3.0-specific deviation entry**

Find:

```ts
export const validation: ValidationRecord = {
  moduleId: "belt-pulley-drive-motor-sizing",
  moduleVersion: "0.2.0",
  methods: [
```

Replace with:

```ts
export const validation: ValidationRecord = {
  moduleId: "belt-pulley-drive-motor-sizing",
  moduleVersion: "0.3.0",
  methods: [
```

Find the end of the `deviations` array:

```ts
  deviations: [
    "AutomationDirect's own worked example has a confirmed arithmetic slip, disclosed and not reproduced (carried over unchanged from 0.1.0): its own friction force is computed as 0.05 x 100 = 5.0 lb though the stated table+workpiece weight is 90 lb (correct: 4.5 lb). This module's own kernel computes friction from the actual supplied mass, so it does not reproduce the source's own printed T_run/T_motor totals that follow from it.",
    "The two primary sources place mechanical efficiency on opposite sides of the calculation (carried over unchanged from 0.1.0): Oriental Motor divides load torque by eta; AutomationDirect divides the carriage's own inertia by e. This module follows Oriental Motor's own convention, matching every already-released Motor Sizing Tool sibling.",
  ],
};
```

Replace with:

```ts
  deviations: [
    "AutomationDirect's own worked example has a confirmed arithmetic slip, disclosed and not reproduced (carried over unchanged from 0.1.0): its own friction force is computed as 0.05 x 100 = 5.0 lb though the stated table+workpiece weight is 90 lb (correct: 4.5 lb). This module's own kernel computes friction from the actual supplied mass, so it does not reproduce the source's own printed T_run/T_motor totals that follow from it.",
    "The two primary sources place mechanical efficiency on opposite sides of the calculation (carried over unchanged from 0.1.0): Oriental Motor divides load torque by eta; AutomationDirect divides the carriage's own inertia by e. This module follows Oriental Motor's own convention, matching every already-released Motor Sizing Tool sibling.",
    "0.3.0 addendum, not a re-validation of the underlying physics (unchanged): gravity is now a hardcoded 9.80665 m/s^2 constant (math.ts) rather than an editable input -- behavior-neutral, since the removed motion.axis.gravity port's own registry default was already exactly this value and no reference example or benchmark in this module's own validation record ever overrode it. inertia_ratio_maximum now resolves to motor_sizing.belt_pulley.inertia_ratio_recommended_maximum (registry 1.15.0), a founder-directed default of 10:1 -- NOT a manufacturer-sourced value; neither of this module's own two primary sources (Oriental Motor, AutomationDirect) states a recommended inertia-ratio figure for a belt-and-pulley drive specifically. The check's own exceeded-case status changed from 'fail' to 'warning' to match. ui.ts additionally wires the new disabledWhen UI capability on the four motion-mode-dependent fields -- a presentation hint only, verified structurally in package.test.ts and generically (including against this module's own belt_pulley_motion_mode enum) in lib/application/calculations/resolve-field-disabled.test.ts; input-schema.ts's own required/optional enforcement per mode is unchanged. Per docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md.",
  ],
};
```

- [ ] **Step 3: Regenerate the registry**

Run: `npm run registry:generate`

Expected: `lib/modules/registry.generated.ts` now imports `./belt-pulley-drive-motor-sizing/0.3.0` (alongside the existing `0.1.0`/`0.2.0` imports — both stay) and adds a `"belt-pulley-drive-motor-sizing@0.3.0"` entry to the exported map.

- [ ] **Step 4: Confirm the registry change looks right**

```bash
git diff lib/modules/registry.generated.ts
```

Expected: one new import line and one new map entry for `belt-pulley-drive-motor-sizing@0.3.0`; the existing `0.1.0`/`0.2.0` imports and entries are untouched.

- [ ] **Step 5: Compute the real source-immutability hash**

Run: `npm run module:source-hash -- belt-pulley-drive-motor-sizing 0.3.0`
Expected: prints a 16-character hex string (the `expectedSourceHash`). Copy it exactly — do not guess or compute it by hand.

- [ ] **Step 6: Replace the placeholder in `package.test.ts`**

In `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/package.test.ts`, find:

```ts
const EXPECTED_SOURCE_HASH = "PLACEHOLDER_UNTIL_TASK_12";
```

Replace `"PLACEHOLDER_UNTIL_TASK_12"` with the exact hash string Step 5 printed.

- [ ] **Step 7: Run the full module test directory**

Run: `npx vitest run lib/modules/belt-pulley-drive-motor-sizing/0.3.0/`
Expected: every test in every file PASSES, including `"runs the source-immutability check and it passes (not skipped)"` and `"passes overall conformance"`.

- [ ] **Step 8: Confirm `0.1.0` and `0.2.0` are still fully passing and untouched**

Run: `npx vitest run lib/modules/belt-pulley-drive-motor-sizing/0.1.0/ lib/modules/belt-pulley-drive-motor-sizing/0.2.0/`
Expected: every test still PASSES, unchanged from before this plan started.

```bash
git status --short lib/modules/belt-pulley-drive-motor-sizing/0.1.0/ lib/modules/belt-pulley-drive-motor-sizing/0.2.0/
```

Expected: no output.

- [ ] **Step 9: Typecheck, lint, build**

Run: `npm run typecheck`
Expected: `0 errors`.

Run: `npx eslint lib/modules/belt-pulley-drive-motor-sizing/0.3.0/ lib/modules/registry.generated.ts`
Expected: no output (0 problems).

Run: `npm run build`
Expected: builds successfully.

- [ ] **Step 10: Commit**

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.3.0/index.ts lib/modules/belt-pulley-drive-motor-sizing/0.3.0/validation.ts lib/modules/registry.generated.ts lib/modules/belt-pulley-drive-motor-sizing/0.3.0/package.test.ts
git commit -m "$(cat <<'EOF'
feat: register belt-pulley-drive-motor-sizing@0.3.0

moduleVersion bumped to 0.3.0; validation.ts records the gravity
hardcode, the recommended inertia-ratio default, and the disabledWhen
UI wiring as a disclosed addendum, not a re-validation of the
underlying (unchanged) physics. npm run registry:generate discovers
the new lib/modules/belt-pulley-drive-motor-sizing/0.3.0/index.ts
default export. Pins the real source-immutability hash (npm run
module:source-hash -- belt-pulley-drive-motor-sizing 0.3.0) in
package.test.ts, replacing the placeholder. 0.1.0 and 0.2.0 stay
registered and untouched alongside it.
EOF
)"
```

---

### Task 13: `README.md` and `validation/belt-pulley-drive-motor-sizing/0.3.0.md`

**Files:**
- Modify: `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/README.md`
- Create: `validation/belt-pulley-drive-motor-sizing/0.3.0.md`

- [ ] **Step 1: Add a "0.3.0 addendum" section to the copied `README.md`**

Open `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/README.md` (the file Task 1 copied from `0.2.0`). At the very top, immediately after the `# Belt-Pulley Drive Motor Sizing Module ...` title line, insert:

```markdown

## 0.3.0 — Consistency-Pass Addendum (Gravity, disabledWhen, Recommended Inertia-Ratio Default)

Follow-on to `0.2.0`, per
`docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`
and `docs/superpowers/plans/2026-08-19-belt-pulley-drive-motor-sizing-0.3.0.md`
-- the last of the five Motor Sizing Tool module-version bumps, and the
only one carrying all three consistency-pass changes at once, since this
is the design's own only `disabledWhen` consumer. None of the three
changes touches the underlying physics (every reference example below
still passes unchanged):

1. **Gravity is no longer an input.** `math.ts` hardcodes
   `STANDARD_GRAVITY_M_PER_S2 = 9.80665` where the removed `gravity` port
   used to flow in. Behavior-neutral: the removed port's own registry
   constant default was already exactly this value, and no reference
   example or benchmark in this module's own validation record ever
   overrode it.
2. **`inertia_ratio_maximum` now resolves to a founder-directed recommended
   default of 10:1** (`motor_sizing.belt_pulley.
   inertia_ratio_recommended_maximum`, parameter registry `1.15.0`),
   editable, rather than `0.2.0`'s own required-no-default value. The
   inertia-ratio check's own exceeded-case status changed from `fail` to
   `warning` to match.
3. **`ui.ts` wires the new `disabledWhen` UI capability** -- this module is
   the only consumer of it in this project. `target_velocity`/
   `constant_velocity_time` render disabled whenever `motion_mode` is
   `"distance"`; `travel_distance`/`cycle_time` render disabled whenever
   `motion_mode` is `"velocity"`. Presentation only --
   `input-schema.ts`'s own required/optional enforcement per mode is
   unchanged.

`0.1.0` and `0.2.0` both stay released, registered, and byte-for-byte
untouched (`lib/modules/belt-pulley-drive-motor-sizing/0.1.0/`,
`lib/modules/belt-pulley-drive-motor-sizing/0.2.0/`) -- an engineer who
wants `0.3.0`'s behavior on an existing instance archives it and adds a
fresh `0.3.0` instance, the same migration story every prior Motor Sizing
`0.2.0` release already established. Full record:
`validation/belt-pulley-drive-motor-sizing/0.3.0.md`.

Completes ADR-0011's own Motor Sizing Tool consistency pass: all five
mechanism modules (`ball-screw-motor-sizing@0.2.0`,
`direct-drive-conveyor-motor-sizing@0.2.0`,
`rack-pinion-motor-sizing@0.2.0`, `index-table-motor-sizing@0.2.0`, and
this module at `0.3.0`) now consume the shared parameter-registry `1.15.0`
recommended inertia-ratio default.
```

- [ ] **Step 2: Create the 0.3.0 validation-record addendum**

Create `validation/belt-pulley-drive-motor-sizing/0.3.0.md`:

```markdown
# Module Validation Record — `belt-pulley-drive-motor-sizing` 0.3.0

Addendum to `validation/belt-pulley-drive-motor-sizing/0.2.0.md`, not a
re-validation. `0.3.0` changes exactly three things, none of which touches
the underlying physics (`docs/superpowers/specs/
2026-08-18-motor-sizing-consistency-pass-design.md`): gravity is hardcoded
rather than an editable input, `inertia_ratio_maximum` resolves to a
founder-directed recommended default, and `ui.ts` wires the new
`disabledWhen` UI capability (this module is the design's own only
consumer of it).

## Module Identity

- Module ID: `belt-pulley-drive-motor-sizing`
- Version validated: `0.3.0`
- Package content hash: see `ModuleManifest.contentHash`, sealed by
  `sealModulePackage` in
  `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/index.ts`
- Module source-immutability hash (`expectedSourceHash`): pinned in
  `lib/modules/belt-pulley-drive-motor-sizing/0.3.0/package.test.ts`
  (`npm run module:source-hash -- belt-pulley-drive-motor-sizing 0.3.0`)
- Parameter-registry version this module's ports were released against:
  `1.15.0` (`lib/modules/belt-pulley-drive-motor-sizing/0.3.0/manifest.ts`)
- Release date: `2026-08-19`

## What changed from 0.2.0

1. **Gravity hardcoded.** The `gravity` port is removed from
   `manifest.ts`/`ui.ts`; `math.ts` uses a local
   `STANDARD_GRAVITY_M_PER_S2 = 9.80665` constant everywhere the removed
   input used to flow into `resolveDriveForce`. Behavior-neutral: the
   removed port's own registry constant default was already exactly this
   value, and no reference example or benchmark in this module's own
   validation record ever overrode it.
2. **`inertia_ratio_maximum` repointed.** The port (same key, same
   compute/UI role) now maps to `motor_sizing.belt_pulley.
   inertia_ratio_recommended_maximum` instead of `motor_sizing.belt_pulley.
   inertia_ratio_maximum`. The new parameter carries a founder-directed
   default of `10` — explicitly **not** a manufacturer-sourced figure;
   neither of this module's own two primary sources (Oriental Motor Co.,
   Ltd., AutomationDirect) states a recommended inertia-ratio figure for a
   belt-and-pulley drive specifically. The original `motor_sizing.
   belt_pulley.inertia_ratio_maximum` parameter is untouched and stays
   referenced by `0.1.0`'s and `0.2.0`'s own manifests.
3. **Check status downgraded.** The `inertia-ratio` check's exceeded-case
   `status` changed from `"fail"` to `"warning"` (`checks.ts`) — exceeding
   a recommended default is advisory, never blocking, unlike exceeding a
   required no-default value.
4. **`disabledWhen` wired.** `ui.ts`'s own `"motion"` group now declares
   `disabledWhen: { portKey: "motion_mode", equals: "distance" }` on
   `target_velocity` and `constant_velocity_time`, and
   `disabledWhen: { portKey: "motion_mode", equals: "velocity" }` on
   `travel_distance` and `cycle_time`. This module is the only consumer of
   the shared `disabledWhen` UI capability in this project
   (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md
   "Generic UI capability: disabledWhen"). Presentation only —
   `input-schema.ts`'s own `superRefine` requirement logic is completely
   unchanged, and this module's own trace/compute path never reads
   `disabledWhen`.

**Not changed:** the trace `ref` for the removed `gravity` row is simply
deleted (unlike `index-table-motor-sizing@0.2.0`'s repointed `R_Jmax` row,
there is no equivalent "same value, new source" repoint needed here — the
`g` row's own value is now a stated constant in the load-torque step's own
`expression` text, not a traced port at all).

## Regression Evidence (Not a Re-Validation)

Every reference example `validation/belt-pulley-drive-motor-sizing/0.2.0.md`
records — AutomationDirect's own pulley-inertia example, the load/reflected
-inertia example with its own disclosed 1/e adjustment, and the
symmetric-deceleration-torque internal-consistency check — re-passes
unchanged under `0.3.0`, confirmed by re-running the identical test suites
(`lib/modules/belt-pulley-drive-motor-sizing/0.3.0/math.test.ts`,
`package.test.ts`, `automationdirect-reference-example.test.ts`,
`independent-benchmark.test.ts`) against the new version's own sealed
package. None of those fixtures ever sets `gravity` explicitly (they all
relied on the registry constant default), so their continued passing is
direct regression proof that the gravity hardcode is behavior-neutral.
None of them ever exceeds the inertia ratio either, so none exercises the
changed check-status branch — that branch is covered by two new tests in
`package.test.ts`: one confirming `inertia_ratio_maximum` resolves to `10`
when unset and stays overridable, one confirming the exceeded-case check
status is `"warning"`, not `"fail"`. `disabledWhen` wiring is confirmed
structurally (the `"motion"` group's own field list carries exactly the
four intended conditions and nothing else) in `package.test.ts`, and
generically — including directly against this module's own
`belt_pulley_motion_mode` enum values — in
`lib/application/calculations/resolve-field-disabled.test.ts` (shared
infrastructure, not this module's own file).

## Disclosed, Non-Sourced Default

The `10` figure in `motor_sizing.belt_pulley.
inertia_ratio_recommended_maximum` is **founder judgment, not a
manufacturer-sourced value**. Neither of this module's own two primary
sources (Oriental Motor Co., Ltd.'s General Catalog Technical Reference,
AutomationDirect's SureServo Selection Appendix) states a recommended or
required inertia-ratio figure for a belt-and-pulley drive specifically —
the `0.1.0`/`0.2.0` Stage 2 contract's own choice of "required input, no
default" for `inertia_ratio_maximum` reflected that absence
(`context/modules/belt-pulley-drive-motor-sizing/stage-2-contract.md`).
`0.3.0` departs from that precedent deliberately, per explicit founder
direction
(`docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`
"Context"), and discloses the departure here rather than implying a source
that does not exist. `0.1.0`'s and `0.2.0`'s own required-no-default
parameter and check behavior are unaffected — `0.3.0` is a new, separate
module version, not an edit to a released one.

## Reviewer

- Reviewer: not applicable — this addendum changes no physics and adds no
  new formula requiring independent validation; the underlying compute
  path is identical to `0.2.0`'s own already-reviewed physics (see
  `validation/belt-pulley-drive-motor-sizing/0.2.0.md` "Reviewer" for that
  review). The regression evidence above (every `0.2.0` reference example
  re-passing unchanged) is the applicable check for this addendum's own
  three changes.
- Review date: `2026-08-19`

## Sign-off

- [x] The three `0.3.0` changes documented above with their own
      regression/disclosure evidence
- [x] Every `0.2.0` reference example re-passes unchanged under `0.3.0`
- [x] The recommended-default's own non-manufacturer-sourced status is
      disclosed plainly, not implied to be sourced
- [x] `disabledWhen` wiring confirmed structurally and via the shared
      generic mechanism's own test suite
- [x] `0.1.0` and `0.2.0` confirmed untouched (`git status --short
      lib/modules/belt-pulley-drive-motor-sizing/0.1.0/
      lib/modules/belt-pulley-drive-motor-sizing/0.2.0/` prints nothing)
- [x] Released and registered as `belt-pulley-drive-motor-sizing@0.3.0`
      2026-08-19 (`lib/modules/registry.generated.ts`)
- [x] Last of the five Motor Sizing Tool consistency-pass module-version
      bumps — the shared-infrastructure design
      (`docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`)
      is now fully complete across all five modules
```

- [ ] **Step 3: Verify prose renders sensibly**

Read both files back in full to confirm no orphaned headings or duplicated version notes.

- [ ] **Step 4: Commit**

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.3.0/README.md validation/belt-pulley-drive-motor-sizing/0.3.0.md
git commit -m "$(cat <<'EOF'
docs: belt-pulley-drive-motor-sizing 0.3.0 README addendum and validation record

Documents all three 0.3.0 changes (gravity hardcode, disabledWhen
wiring, recommended inertia-ratio default) as an addendum to the
unchanged 0.2.0 physics, with the regression evidence and the
recommended default's own disclosed non-sourced status recorded
explicitly. Notes this module is the design's own only disabledWhen
consumer, and that this release completes the five-module consistency
pass.
EOF
)"
```

---

### Task 14: Final verification and progress-tracker/context-doc updates

**Files:**
- Modify: `context/progress-tracker.md` (edit in place — do not append a dated narrative entry, per that file's own header rule)
- Modify: `context/ui-context.md` (per the design doc's own "Documentation" section — confirm whether a `disabledWhen` paragraph was already added by the shared-infrastructure plan; if not, add one here)
- Modify: `lib/engine/parameters/README.md` (confirm the `1.15.0` note already exists from the shared-infrastructure plan; this task does not duplicate it if so)

- [ ] **Step 1: Full verification**

Run: `npm run lint`
Expected: `0` warnings/errors on every file this plan touched. (A bare repo-root `npm run lint` may still flag the already-documented, pre-existing stale `.worktrees/unit-4-1-release/.next/dev/types/` artifact — confirmed unrelated in prior sessions; if seen, verify by linting only the files this plan changed directly.)

Run: `npm run typecheck`
Expected: `0` errors.

Run: `npx vitest run --testTimeout=30000`
Expected: every previously-passing non-DB test still passes, plus this plan's own new tests (Task 10 Steps 3-4). DB-gated tests report as skipped without `DATABASE_URL`/`NODE_EXTRA_CA_CERTS` set — expected, not a failure.

Run: `npm run build`
Expected: builds successfully, no new routes or errors (this module has no UI route of its own beyond the generic module workspace, which needs no new wiring for a new module version — `disabledWhen` rendering is already generic, built by the shared-infrastructure plan).

- [ ] **Step 2: Confirm whether `context/ui-context.md` and `lib/engine/parameters/README.md` already document the shared infrastructure**

```bash
grep -n "disabledWhen" context/ui-context.md
grep -n "1.15.0" lib/engine/parameters/README.md
```

If both already have their own paragraph/note (expected — the shared-infrastructure plan, not this one, owns that documentation per the design doc's own "Documentation" section), skip to Step 3. If either is missing, add a short paragraph/note matching that file's own existing per-version-bump convention before proceeding — do not invent new structure.

- [ ] **Step 3: Update `context/progress-tracker.md`**

Find the most recent paragraph in the "Active work" section (the `index-table-motor-sizing@0.2.0` paragraph, ending "...One more follow-on plan remains, not yet started: `belt-pulley-drive-motor-sizing` `0.2.0` -> `0.3.0` (the only one of the five also wiring `disabledWhen`).") and add this as the next paragraph immediately after it:

```markdown

**`belt-pulley-drive-motor-sizing@0.3.0` shipped 2026-08-19** — the fifth
and last of the five module-version bumps, and the only one carrying all
three consistency-pass changes at once: gravity is now hardcoded
(`STANDARD_GRAVITY_M_PER_S2 = 9.80665` in `math.ts`), `inertia_ratio_maximum`
repoints at `motor_sizing.belt_pulley.inertia_ratio_recommended_maximum`
(registry `1.15.0`, default `10`, check downgraded `fail` -> `warning`),
and `ui.ts` wires the shared `disabledWhen` UI capability on the four
motion-mode-dependent fields (`target_velocity`/`constant_velocity_time`
disable when `motion_mode` is `"distance"`; `travel_distance`/`cycle_time`
disable when `motion_mode` is `"velocity"`) — this module is the design's
own only `disabledWhen` consumer. A real, session-specific finding not
present in any of the four prior module-version bumps:
`independent-benchmark.test.ts` calls this module's own `resolveDriveForce`
directly (not just through `executeModule`), so it needed the same
`gravityMps2` field drop `math.test.ts` needed — caught by reading the
file directly. Every `0.2.0` reference example (AutomationDirect pulley-
inertia, load/reflected-inertia with its own disclosed 1/e adjustment,
symmetric-deceleration-torque internal-consistency check) re-passes
unchanged under `0.3.0` — the regression proof; none ever set `gravity`
explicitly or exceeded the inertia ratio. `0.1.0` and `0.2.0` both stay
released, registered, and untouched
(`validation/belt-pulley-drive-motor-sizing/0.1.0.md`,
`validation/belt-pulley-drive-motor-sizing/0.2.0.md`); `0.3.0`'s own
addendum record is `validation/belt-pulley-drive-motor-sizing/0.3.0.md`.
**This completes the five-module Motor Sizing Tool consistency pass**
(`docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`)
— every mechanism module now consumes parameter registry `1.15.0`'s own
recommended inertia-ratio default, and the shared `disabledWhen` UI
capability has its one real consumer wired end to end.
```

- [ ] **Step 4: Commit**

```bash
git add context/progress-tracker.md
git commit -m "$(cat <<'EOF'
docs: record belt-pulley-drive-motor-sizing 0.3.0 in the progress tracker

Also closes out the five-module Motor Sizing Tool consistency pass
(docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md).
EOF
)"
```

---

## What comes after this plan

Nothing further from this design doc — this is the last of its five
follow-on module-version bumps. `context/progress-tracker.md`'s own "Next
up" section still needs a pass to reflect that Milestone 6's own
consistency-pass follow-on work (not itself a numbered unit, but real
founder-directed work on top of it) is now fully done, and to re-surface
whatever the actual next priority is (Unit 5.4 Scenarios 2/3, still
genuinely blocked on evidence, or a fresh founder-directed item) — that
reassessment is out of scope for this plan itself.
