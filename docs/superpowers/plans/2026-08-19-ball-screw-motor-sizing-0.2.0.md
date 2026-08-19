# Ball-Screw Motor Sizing 0.2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `ball-screw-motor-sizing@0.2.0` — the first of five follow-on module-version bumps consuming the Motor Sizing shared infrastructure (`disabledWhen` and parameter registry `1.15.0`) per `docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`. Three changes: gravity stops being an editable input (hardcoded `9.80665 m/s^2` in `math.ts`), the `inertia_ratio_maximum` port switches to the new `motor_sizing.ball_screw.inertia_ratio_recommended_maximum` parameter (founder-directed default of `10`, still overridable), and the inertia-ratio check's exceeded-case status changes from `fail` to `warning`.

**Architecture:** `0.1.0` stays released, registered, and byte-for-byte untouched (`ai-workflow-rules.md` "Protected Files"). A new `lib/modules/ball-screw-motor-sizing/0.2.0/` directory is created by copying every `0.1.0` file, then editing only the files the three changes actually touch (`manifest.ts`, `math.ts`, `compute.ts`, `trace.ts`, `ui.ts`, `checks.ts`, `math.test.ts`, `package.test.ts`, `README.md`, plus a new `validation/ball-screw-motor-sizing/0.2.0.md`). Every other file (`values.ts`, `report.ts`, `input-schema.ts`, `test-helpers.ts`, `thk-reference-examples.ts`/`.test.ts`, `independent-benchmark.test.ts`, `cross-module-links.test.ts`, `validation.ts`) is copied unchanged because nothing in this release touches what they cover — `cross-module-links.test.ts` and `validation.ts` still need per-version edits for their own version string/hash fields, covered below. `0.2.0` is registered by adding one import line to the generated registry via `npm run registry:generate`, the same mechanism every prior module version used — never hand-edit `registry.generated.ts` directly.

**Tech Stack:** TypeScript, Zod, Vitest, `lib/engine` module SDK.

---

## Before you start

Read `docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md` in full — this plan implements its "Gravity" and "Inertia-ratio recommended default" sections for `ball-screw-motor-sizing` only (not `disabledWhen`, which only `belt-pulley-drive-motor-sizing` consumes). Confirm the shared infrastructure it depends on is already merged:

```bash
grep -n "PARAMETER_REGISTRY_VERSION = " lib/engine/parameters/definitions.ts
grep -n "inertia_ratio_recommended_maximum" lib/engine/parameters/definitions.ts
```

Expected: `PARAMETER_REGISTRY_VERSION = "1.15.0"` and five matches including `motor_sizing.ball_screw.inertia_ratio_recommended_maximum`. If either is missing, stop — `docs/superpowers/plans/2026-08-18-motor-sizing-shared-infrastructure.md` has not been merged yet, and this plan cannot proceed.

Confirm your starting point:

```bash
git status
```

Expected: clean, or only unrelated changes you're aware of. Do not proceed on a dirty tree without checking with the user first.

---

### Task 1: Scaffold `0.2.0` as an exact copy of `0.1.0`

**Files:**
- Create: `lib/modules/ball-screw-motor-sizing/0.2.0/` (every file, copied from `0.1.0`)

- [ ] **Step 1: Copy the directory**

```bash
cp -r "lib/modules/ball-screw-motor-sizing/0.1.0" "lib/modules/ball-screw-motor-sizing/0.2.0"
```

- [ ] **Step 2: Confirm the copy is complete and 0.1.0 is untouched**

```bash
diff -rq "lib/modules/ball-screw-motor-sizing/0.1.0" "lib/modules/ball-screw-motor-sizing/0.2.0"
git status --short lib/modules/ball-screw-motor-sizing/0.1.0/
```

Expected: `diff -rq` reports no differences (a byte-for-byte copy); `git status` on the `0.1.0` path prints nothing (untouched).

- [ ] **Step 3: Commit the scaffold as its own step, before any edits**

```bash
git add lib/modules/ball-screw-motor-sizing/0.2.0
git commit -m "$(cat <<'EOF'
chore: scaffold ball-screw-motor-sizing 0.2.0 as a copy of 0.1.0

Baseline for the gravity/inertia-ratio-default consistency pass
(docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md).
0.1.0 stays released, registered, and untouched.
EOF
)"
```

Every later task in this plan edits only files under `lib/modules/ball-screw-motor-sizing/0.2.0/` (plus the registry, docs, and progress tracker) — `0.1.0/` is never touched again.

---

### Task 2: `manifest.ts` — version bump, drop `gravity`, repoint `inertia_ratio_maximum`

**Files:**
- Modify: `lib/modules/ball-screw-motor-sizing/0.2.0/manifest.ts`

- [ ] **Step 1: Update the version, registry pin, and header comment**

Find:

```ts
// Registered 2026-08-13 as `ball-screw-motor-sizing@0.1.0`
// (lib/modules/registry.generated.ts) -- imported by ./index.ts, which
// `npm run registry:generate` discovers.
```

Replace with:

```ts
// 0.2.0: consistency-pass follow-on
// (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md)
// -- drops the `gravity` port (hardcoded 9.80665 m/s^2 in ./math.ts
// instead) and repoints `inertia_ratio_maximum` at the new
// `motor_sizing.ball_screw.inertia_ratio_recommended_maximum` parameter
// (registry 1.15.0), which carries a founder-directed default of 10.
// 0.1.0 stays released, registered, and untouched.
//
// Registered 2026-08-19 as `ball-screw-motor-sizing@0.2.0`
// (lib/modules/registry.generated.ts) -- imported by ./index.ts, which
// `npm run registry:generate` discovers.
```

- [ ] **Step 2: Bump `version` and `parameterRegistryVersion`**

Find:

```ts
export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "ball-screw-motor-sizing",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.9.0. Keep this literal — never import
  // the mutable current-version constant (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.9.0",
```

Replace with:

```ts
export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "ball-screw-motor-sizing",
  version: "0.2.0",
  sdkRange: { min: "1.0.0" },
  // Authored against registry 1.15.0. Keep this literal — never import the
  // mutable current-version constant (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.15.0",
```

- [ ] **Step 3: Remove the `gravity` input port**

Find:

```ts
    {
      key: "gravity",
      parameterId: asParameterId("motion.axis.gravity"),
      // Optional: the registry's own constant default (9.80665 m/s^2)
      // auto-fills an absent value.
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
        "motor_sizing.ball_screw.inertia_ratio_maximum",
      ),
      required: true,
    },
```

Replace with:

```ts
    {
      key: "inertia_ratio_maximum",
      // 0.2.0: repointed at the new recommended-maximum parameter (registry
      // 1.15.0) -- a founder-directed default of 10, still overridable. The
      // port key stays "inertia_ratio_maximum" for compute/UI stability;
      // only the parameterId it maps to changes. 0.1.0's own port still
      // points at the original required-no-default
      // motor_sizing.ball_screw.inertia_ratio_maximum, untouched.
      parameterId: asParameterId(
        "motor_sizing.ball_screw.inertia_ratio_recommended_maximum",
      ),
      required: true,
    },
```

`required: true` stays `true` — the parameter is still a required port at the module level; the registry's own `defaultPolicy: { kind: "constant", value: 10 }` is what auto-fills an absent value at execution time, the identical mechanism the removed `gravity` port already relied on.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: `0 errors`.

- [ ] **Step 6: Commit**

```bash
git add lib/modules/ball-screw-motor-sizing/0.2.0/manifest.ts
git commit -m "$(cat <<'EOF'
feat(ball-screw-motor-sizing): 0.2.0 manifest — drop gravity, recommended inertia-ratio default

Version bump to 0.2.0, registry pin to 1.15.0, gravity port removed
(hardcoded in math.ts next), and inertia_ratio_maximum repointed at
motor_sizing.ball_screw.inertia_ratio_recommended_maximum.
EOF
)"
```

---

### Task 3: `math.ts` — hardcode standard gravity

**Files:**
- Modify: `lib/modules/ball-screw-motor-sizing/0.2.0/math.ts`

- [ ] **Step 1: Add the exported constant**

Find:

```ts
export class BallScrewMotorSizingInputError extends Error {
```

Replace with:

```ts
/**
 * Standard gravitational acceleration, m/s^2. 0.2.0 hardcodes this rather
 * than taking it as an input — no scenario in this product's scope needs a
 * different value, and `motion.axis.gravity`'s own registry constant
 * default was already exactly this figure everywhere it was used
 * (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md
 * "Gravity"). Exported so ./math.test.ts can reference the exact same value
 * instead of repeating the literal.
 */
export const STANDARD_GRAVITY_M_PER_S2 = 9.80665;

export class BallScrewMotorSizingInputError extends Error {
```

- [ ] **Step 2: Remove `gravityMps2` from `DriveForceInput` and use the constant**

Find:

```ts
export interface DriveForceInput {
  /** External force along the axis of travel, in N. */
  readonly externalForceN: number;
  /** Total moving mass, in kg. Must be > 0. */
  readonly totalMovingMassKg: number;
  /** Gravitational acceleration, in m/s^2. Must be > 0. */
  readonly gravityMps2: number;
  /** Incline angle above horizontal, in rad. Must be in [0, pi/2]. */
  readonly inclineAngleRad: number;
```

Replace with:

```ts
export interface DriveForceInput {
  /** External force along the axis of travel, in N. */
  readonly externalForceN: number;
  /** Total moving mass, in kg. Must be > 0. */
  readonly totalMovingMassKg: number;
  /** Incline angle above horizontal, in rad. Must be in [0, pi/2]. */
  readonly inclineAngleRad: number;
```

Find:

```ts
export function resolveDriveForce(input: DriveForceInput): DriveForceResult {
  assertFinite("externalForceN", input.externalForceN);
  assertPositive("totalMovingMassKg", input.totalMovingMassKg);
  assertPositive("gravityMps2", input.gravityMps2);
  assertFinite("inclineAngleRad", input.inclineAngleRad);
  if (input.inclineAngleRad < 0 || input.inclineAngleRad > Math.PI / 2) {
    fail("inclineAngleRad must be between 0 and pi/2.");
  }
  assertNonNegative("frictionCoefficient", input.frictionCoefficient);

  const weightN = input.totalMovingMassKg * input.gravityMps2;
```

Replace with:

```ts
export function resolveDriveForce(input: DriveForceInput): DriveForceResult {
  assertFinite("externalForceN", input.externalForceN);
  assertPositive("totalMovingMassKg", input.totalMovingMassKg);
  assertFinite("inclineAngleRad", input.inclineAngleRad);
  if (input.inclineAngleRad < 0 || input.inclineAngleRad > Math.PI / 2) {
    fail("inclineAngleRad must be between 0 and pi/2.");
  }
  assertNonNegative("frictionCoefficient", input.frictionCoefficient);

  const weightN = input.totalMovingMassKg * STANDARD_GRAVITY_M_PER_S2;
```

- [ ] **Step 3: Typecheck (expect errors — callers still pass `gravityMps2`, fixed in later tasks)**

Run: `npm run typecheck`
Expected: errors in `compute.ts` and `math.test.ts` (both still pass a `gravityMps2` field that no longer exists on `DriveForceInput`). This is expected at this point in the plan — Tasks 4 and 8 fix them.

- [ ] **Step 4: Commit**

```bash
git add lib/modules/ball-screw-motor-sizing/0.2.0/math.ts
git commit -m "$(cat <<'EOF'
feat(ball-screw-motor-sizing): 0.2.0 hardcodes standard gravity in resolveDriveForce

gravityMps2 is no longer an input to resolveDriveForce -- it uses a
local STANDARD_GRAVITY_M_PER_S2 = 9.80665 constant. Behavior-neutral:
the registry's own gravity default was already exactly this value.
EOF
)"
```

(Committing mid-typecheck-failure is fine here — this task's own file is internally consistent and self-contained; the next two tasks fix the call sites in the same plan, before the final full verification in Task 9.)

---

### Task 4: `compute.ts` — remove the `gravity` input read

**Files:**
- Modify: `lib/modules/ball-screw-motor-sizing/0.2.0/compute.ts`

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

- [ ] **Step 2: Remove the gravity defense-in-depth guard**

Find:

```ts
  // gravity has a registry constant default (9.80665 m/s^2); external_force
  // defaults to 0 N — both auto-filled by the module SDK when absent, so
  // neither should reach compute() as undefined. Guarded anyway as a
  // defense-in-depth measure, the same treatment gearboxEfficiency gets in
  // drive-train@0.1.0's own compute.ts.
  if (gravity === undefined || externalForce === undefined) {
    throw new Error(
      "ball-screw-motor-sizing requires gravity and external_force to resolve (registry defaults should have filled these).",
    );
  }
```

Replace with:

```ts
  // external_force defaults to 0 N — auto-filled by the module SDK when
  // absent, so it should never reach compute() as undefined. Guarded
  // anyway as a defense-in-depth measure, the same treatment
  // gearboxEfficiency gets in drive-train@0.1.0's own compute.ts. gravity
  // is no longer an input in 0.2.0 (math.ts hardcodes
  // STANDARD_GRAVITY_M_PER_S2) — nothing to guard here anymore.
  if (externalForce === undefined) {
    throw new Error(
      "ball-screw-motor-sizing requires external_force to resolve (registry default should have filled this).",
    );
  }
```

- [ ] **Step 3: Remove `gravityMps2` from both `resolveDriveForce` calls**

Find:

```ts
  const { forceN: forwardForceN } = resolveDriveForce({
    externalForceN: externalForce.value,
    totalMovingMassKg: totalMovingMass.value,
    gravityMps2: gravity.value,
    inclineAngleRad: inclineAngle.value,
    frictionCoefficient: frictionCoefficient.value,
    direction: "forward",
  });
```

Replace with:

```ts
  const { forceN: forwardForceN } = resolveDriveForce({
    externalForceN: externalForce.value,
    totalMovingMassKg: totalMovingMass.value,
    inclineAngleRad: inclineAngle.value,
    frictionCoefficient: frictionCoefficient.value,
    direction: "forward",
  });
```

Find:

```ts
  const { forceN: returnForceN } = resolveDriveForce({
    externalForceN: externalForce.value,
    totalMovingMassKg: totalMovingMass.value,
    gravityMps2: gravity.value,
    inclineAngleRad: inclineAngle.value,
    frictionCoefficient: frictionCoefficient.value,
    direction: "return",
  });
```

Replace with:

```ts
  const { forceN: returnForceN } = resolveDriveForce({
    externalForceN: externalForce.value,
    totalMovingMassKg: totalMovingMass.value,
    inclineAngleRad: inclineAngle.value,
    frictionCoefficient: frictionCoefficient.value,
    direction: "return",
  });
```

- [ ] **Step 4: Remove `gravity` from the `buildTrace` call**

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

- [ ] **Step 5: Typecheck (expect one remaining error — `trace.ts` still declares `gravity`, fixed next)**

Run: `npm run typecheck`
Expected: an error in `trace.ts`/`compute.ts` about `gravity` not existing on `TraceInput` is now gone from `compute.ts`'s own call site, but `trace.ts` itself still requires it — Task 5 fixes this. `math.test.ts` errors from Task 3 also remain — Task 8 fixes those.

- [ ] **Step 6: Commit**

```bash
git add lib/modules/ball-screw-motor-sizing/0.2.0/compute.ts
git commit -m "$(cat <<'EOF'
feat(ball-screw-motor-sizing): 0.2.0 compute.ts drops the gravity input read

No more quantityAt(values, "gravity") lookup, guard, or pass-through to
resolveDriveForce/buildTrace — gravity is hardcoded in math.ts now.
EOF
)"
```

---

### Task 5: `trace.ts` — remove `gravity` from the trace contract

**Files:**
- Modify: `lib/modules/ball-screw-motor-sizing/0.2.0/trace.ts`

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

- [ ] **Step 2: Remove the `g` row from the direction-step trace inputs**

Find:

```ts
        { label: "g", value: input.gravity, ref: "motion.axis.gravity" },
        {
          label: "theta",
          value: input.inclineAngle,
          ref: "motion.axis.incline_angle",
        },
```

Replace with:

```ts
        {
          label: "theta",
          value: input.inclineAngle,
          ref: "motion.axis.incline_angle",
        },
```

- [ ] **Step 3: Update the direction-step `expression` string to note the constant**

Find:

```ts
      expression:
        direction === "forward"
          ? "F = F_A + m*g*(sin(theta)+mu*cos(theta))"
          : "F = F_A + m*g*(mu*cos(theta)-sin(theta))",
```

Replace with:

```ts
      // 0.2.0: g = 9.80665 m/s^2, hardcoded (no longer an input) — see
      // math.ts's own STANDARD_GRAVITY_M_PER_S2.
      expression:
        direction === "forward"
          ? "F = F_A + m*g*(sin(theta)+mu*cos(theta)), g=9.80665"
          : "F = F_A + m*g*(mu*cos(theta)-sin(theta)), g=9.80665",
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: `trace.ts`/`compute.ts` now clean. Remaining errors, if any, are only in `math.test.ts` (Task 8).

- [ ] **Step 5: Commit**

```bash
git add lib/modules/ball-screw-motor-sizing/0.2.0/trace.ts
git commit -m "$(cat <<'EOF'
feat(ball-screw-motor-sizing): 0.2.0 trace.ts drops gravity as a traced input

g is now a stated constant (9.80665) in the direction-step expression
text rather than a traced port value.
EOF
)"
```

---

### Task 6: `ui.ts` — remove the `gravity` field, add inertia-ratio help text

**Files:**
- Modify: `lib/modules/ball-screw-motor-sizing/0.2.0/ui.ts`

- [ ] **Step 1: Remove the `gravity` field**

Find:

```ts
      fields: [
        { portKey: "orientation" },
        { portKey: "incline_angle" },
        { portKey: "gravity" },
        { portKey: "friction_coefficient" },
        { portKey: "total_moving_mass" },
      ],
```

Replace with:

```ts
      fields: [
        { portKey: "orientation" },
        { portKey: "incline_angle" },
        { portKey: "friction_coefficient" },
        { portKey: "total_moving_mass" },
      ],
```

- [ ] **Step 2: Add help text to the recommended-default inertia-ratio field**

Find:

```ts
      fields: [
        { portKey: "motor_rotor_inertia" },
        { portKey: "effective_torque_safety_factor" },
        { portKey: "momentary_torque_safety_factor" },
        { portKey: "inertia_ratio_maximum" },
      ],
```

Replace with:

```ts
      fields: [
        { portKey: "motor_rotor_inertia" },
        { portKey: "effective_torque_safety_factor" },
        { portKey: "momentary_torque_safety_factor" },
        {
          portKey: "inertia_ratio_maximum",
          label: "Recommended maximum inertia ratio",
          help: "Use the motor manufacturer's limit when available.",
        },
      ],
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: `0 errors` for this file.

- [ ] **Step 4: Commit**

```bash
git add lib/modules/ball-screw-motor-sizing/0.2.0/ui.ts
git commit -m "$(cat <<'EOF'
feat(ball-screw-motor-sizing): 0.2.0 ui.ts drops gravity field, labels the recommended inertia-ratio default
EOF
)"
```

---

### Task 7: `checks.ts` — exceeded inertia ratio is a warning, not a failure

**Files:**
- Modify: `lib/modules/ball-screw-motor-sizing/0.2.0/checks.ts`

- [ ] **Step 1: Update the header comment**

Find:

```ts
// Acceptance checks for the ball-screw-motor-sizing module. Only one real
// check exists in 0.1.0: the inertia ratio against an engineer-supplied
// maximum. Every other torque/speed/power figure is a reported required
// spec, not evaluated pass/fail -- this module takes no candidate motor's
// own rated/peak torque as an input to check against
// (stage-2-contract.md "Decisions" item 4; ADR-0011 "Output scope").
```

Replace with:

```ts
// Acceptance checks for the ball-screw-motor-sizing module. Only one real
// check exists: the inertia ratio against an engineer-supplied maximum.
// Every other torque/speed/power figure is a reported required spec, not
// evaluated pass/fail -- this module takes no candidate motor's own
// rated/peak torque as an input to check against (stage-2-contract.md
// "Decisions" item 4; ADR-0011 "Output scope").
//
// 0.2.0: the exceeded-case status changed from "fail" to "warning"
// (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md
// "Inertia-ratio recommended default") -- inertia_ratio_maximum now
// resolves to a founder-directed recommended default (10) rather than a
// required no-default value, so exceeding it is advisory, not a hard
// failure. 0.1.0's own check (required input, "fail" on exceedance) is
// untouched.
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
git add lib/modules/ball-screw-motor-sizing/0.2.0/checks.ts
git commit -m "$(cat <<'EOF'
feat(ball-screw-motor-sizing): 0.2.0 inertia-ratio check downgrades exceeded case to warning

Matches the recommended (not required) nature of the new default —
exceeding it is advisory, never blocking.
EOF
)"
```

---

### Task 8: `math.test.ts` — drop `gravityMps2`, use the exact constant in assertions

**Files:**
- Modify: `lib/modules/ball-screw-motor-sizing/0.2.0/math.test.ts`

There are 9 call sites passing `gravityMps2: 9.8,` to `resolveDriveForce`. All 9 must drop that field (it no longer exists on `DriveForceInput`). Four of them also compute an expected value from the literal `9.8` at tight precision (9-12 decimal places) — those four must use the imported `STANDARD_GRAVITY_M_PER_S2` constant instead, or the assertion's own hand-computed expectation silently drifts from what the kernel now actually computes (`9.80665`, not `9.8`). The other five either don't reference `9.8` in their own assertion, or already use a tolerance loose enough (`toBeCloseTo(x, 4)`) that the ~0.07% difference between `9.8` and `9.80665` doesn't matter — those need only the field dropped.

- [ ] **Step 1: Import the constant**

Find the top of the file's own `import` block for `./math` (search for `from "./math"`) and add `STANDARD_GRAVITY_M_PER_S2` to the named imports list, alongside whatever `resolveDriveForce`, `resolveLoadTorque`, etc. are already imported. For example, if the existing import reads:

```ts
import {
  BallScrewMotorSizingInputError,
  resolveAngularAcceleration,
  resolveDriveForce,
  ...
} from "./math";
```

change it to:

```ts
import {
  BallScrewMotorSizingInputError,
  STANDARD_GRAVITY_M_PER_S2,
  resolveAngularAcceleration,
  resolveDriveForce,
  ...
} from "./math";
```

(Match the exact existing import list in the file — only add the one new name, do not reorder or rename any existing import.)

- [ ] **Step 2: Fix `"is direction-independent on a horizontal axis"` (tight precision, uses the literal in its own assertion)**

Find:

```ts
  it("is direction-independent on a horizontal axis", () => {
    const forward = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 5,
      gravityMps2: 9.8,
      inclineAngleRad: 0,
      frictionCoefficient: 0.1,
      direction: "forward",
    }).forceN;
    const returnForce = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 5,
      gravityMps2: 9.8,
      inclineAngleRad: 0,
      frictionCoefficient: 0.1,
      direction: "return",
    }).forceN;
    expect(forward).toBeCloseTo(returnForce, 12);
    expect(forward).toBeCloseTo(0.1 * 5 * 9.8, 12);
  });
```

Replace with:

```ts
  it("is direction-independent on a horizontal axis", () => {
    const forward = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 5,
      inclineAngleRad: 0,
      frictionCoefficient: 0.1,
      direction: "forward",
    }).forceN;
    const returnForce = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 5,
      inclineAngleRad: 0,
      frictionCoefficient: 0.1,
      direction: "return",
    }).forceN;
    expect(forward).toBeCloseTo(returnForce, 12);
    expect(forward).toBeCloseTo(0.1 * 5 * STANDARD_GRAVITY_M_PER_S2, 12);
  });
```

- [ ] **Step 3: Fix `"reproduces Omron's own horizontal friction-torque force (TW input)"` (loose precision — drop the field only)**

Find:

```ts
  it("reproduces Omron's own horizontal friction-torque force (TW input)", () => {
    // Servo Selection.pdf p. 12: TW = mu*M*g*(P/2pi)*10^-3 = 7.8e-3 N*m at
    // P=10mm -- the force term alone (before the lead/2pi conversion) is
    // mu*M*g = 0.1*5*9.8 = 4.9 N.
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 5,
      gravityMps2: 9.8,
      inclineAngleRad: 0,
      frictionCoefficient: 0.1,
      direction: "forward",
    });
    expect(forceN).toBeCloseTo(4.9, 9);
  });
```

Replace with:

```ts
  it("reproduces Omron's own horizontal friction-torque force (TW input)", () => {
    // Servo Selection.pdf p. 12: TW = mu*M*g*(P/2pi)*10^-3 = 7.8e-3 N*m at
    // P=10mm -- the force term alone (before the lead/2pi conversion) is
    // mu*M*g ~= 0.1*5*9.80665 ~= 4.903 N (Omron's own printed g=9.8
    // rounding; this module's own g=9.80665 is close enough that Omron's
    // 3-significant-figure result is unaffected — see the loosened
    // tolerance below).
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 5,
      inclineAngleRad: 0,
      frictionCoefficient: 0.1,
      direction: "forward",
    });
    expect(forceN).toBeCloseTo(0.1 * 5 * STANDARD_GRAVITY_M_PER_S2, 9);
  });
```

- [ ] **Step 4: Fix `"adds gravity for the forward (upward) direction on a vertical axis"` (tight precision)**

Find:

```ts
  it("adds gravity for the forward (upward) direction on a vertical axis", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 10,
      gravityMps2: 9.8,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0.05,
      direction: "forward",
    });
    // sin(pi/2)=1, cos(pi/2)=0 -- friction term vanishes on a vertical axis.
    expect(forceN).toBeCloseTo(10 * 9.8, 9);
  });
```

Replace with:

```ts
  it("adds gravity for the forward (upward) direction on a vertical axis", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 10,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0.05,
      direction: "forward",
    });
    // sin(pi/2)=1, cos(pi/2)=0 -- friction term vanishes on a vertical axis.
    expect(forceN).toBeCloseTo(10 * STANDARD_GRAVITY_M_PER_S2, 9);
  });
```

- [ ] **Step 5: Fix `"subtracts gravity for the return (downward) direction on a vertical axis"` (tight precision)**

Find:

```ts
  it("subtracts gravity for the return (downward) direction on a vertical axis", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 10,
      gravityMps2: 9.8,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0.05,
      direction: "return",
    });
    expect(forceN).toBeCloseTo(-10 * 9.8, 9);
  });
```

Replace with:

```ts
  it("subtracts gravity for the return (downward) direction on a vertical axis", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 10,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0.05,
      direction: "return",
    });
    expect(forceN).toBeCloseTo(-10 * STANDARD_GRAVITY_M_PER_S2, 9);
  });
```

- [ ] **Step 6: Fix `"can go negative for a strongly gravity-assisted return direction..."` (no literal in the assertion — drop the field only)**

Find:

```ts
  it("can go negative for a strongly gravity-assisted return direction (the motor must brake)", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 50,
      gravityMps2: 9.8,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0.02,
      direction: "return",
    });
    expect(forceN).toBeLessThan(0);
  });
```

Replace with:

```ts
  it("can go negative for a strongly gravity-assisted return direction (the motor must brake)", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 50,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0.02,
      direction: "return",
    });
    expect(forceN).toBeLessThan(0);
  });
```

- [ ] **Step 7: Fix `"rejects an incline angle outside [0, pi/2]"` (no numeric assertion tied to gravity — drop the field only)**

Find:

```ts
  it("rejects an incline angle outside [0, pi/2]", () => {
    expect(() =>
      resolveDriveForce({
        externalForceN: 0,
        totalMovingMassKg: 5,
        gravityMps2: 9.8,
        inclineAngleRad: Math.PI,
        frictionCoefficient: 0.1,
        direction: "forward",
      }),
    ).toThrow(BallScrewMotorSizingInputError);
  });
```

Replace with:

```ts
  it("rejects an incline angle outside [0, pi/2]", () => {
    expect(() =>
      resolveDriveForce({
        externalForceN: 0,
        totalMovingMassKg: 5,
        inclineAngleRad: Math.PI,
        frictionCoefficient: 0.1,
        direction: "forward",
      }),
    ).toThrow(BallScrewMotorSizingInputError);
  });
```

- [ ] **Step 8: Fix `"reproduces Omron's own TW = 7.8e-3 N*m worked example"` in `describe("resolveLoadTorque", ...)` (loose precision — drop the field only)**

Find:

```ts
  it("reproduces Omron's own TW = 7.8e-3 N*m worked example", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 5,
      gravityMps2: 9.8,
      inclineAngleRad: 0,
      frictionCoefficient: 0.1,
      direction: "forward",
    });
```

Replace with:

```ts
  it("reproduces Omron's own TW = 7.8e-3 N*m worked example", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 5,
      inclineAngleRad: 0,
      frictionCoefficient: 0.1,
      direction: "forward",
    });
```

(Leave the rest of that test — `resolveLoadTorque` call and its `expect(loadTorqueNm).toBeCloseTo(7.8e-3, 4)` — unchanged; 4-decimal precision on a `~0.0078` value already absorbs the `9.8` vs `9.80665` difference.)

- [ ] **Step 9: Fix the Omron end-to-end kernel-level test (loose precision — drop the field only)**

Find (inside the `"reproduces every printed intermediate and final figure through this module's own kernel"` test):

```ts
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 5,
      gravityMps2: 9.8,
      inclineAngleRad: 0,
      frictionCoefficient: 0.1,
      direction: "forward",
    });
    const { loadTorqueNm } = resolveLoadTorque({
      forceN,
      leadM: 0.01,
      efficiency: 1,
      preloadN: 0,
      internalFrictionCoefficient: 0,
      gearRatio: 1,
    });
    expect(loadTorqueNm).toBeCloseTo(0.0078, 4);
```

Replace with:

```ts
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 5,
      inclineAngleRad: 0,
      frictionCoefficient: 0.1,
      direction: "forward",
    });
    const { loadTorqueNm } = resolveLoadTorque({
      forceN,
      leadM: 0.01,
      efficiency: 1,
      preloadN: 0,
      internalFrictionCoefficient: 0,
      gearRatio: 1,
    });
    expect(loadTorqueNm).toBeCloseTo(0.0078, 4);
```

- [ ] **Step 10: Confirm no `gravityMps2` references remain**

```bash
grep -n "gravityMps2" "lib/modules/ball-screw-motor-sizing/0.2.0/math.test.ts"
```

Expected: no output.

- [ ] **Step 11: Run the tests and typecheck**

Run: `npx vitest run lib/modules/ball-screw-motor-sizing/0.2.0/math.test.ts`
Expected: all tests PASS.

Run: `npm run typecheck`
Expected: `0 errors`.

- [ ] **Step 12: Commit**

```bash
git add lib/modules/ball-screw-motor-sizing/0.2.0/math.test.ts
git commit -m "$(cat <<'EOF'
test(ball-screw-motor-sizing): 0.2.0 math.test.ts drops gravityMps2, uses STANDARD_GRAVITY_M_PER_S2

Tight-precision assertions (9-12 decimal places) now derive their
expected values from the same exported constant resolveDriveForce
actually uses, instead of the old literal 9.8 -- the ~0.07% gap between
9.8 and 9.80665 would otherwise fail those specific assertions.
EOF
)"
```

---

### Task 9: `package.test.ts` — regression proof, default-value test, warning-status test

**Files:**
- Modify: `lib/modules/ball-screw-motor-sizing/0.2.0/package.test.ts`

None of the existing input fixtures (`baselineInput`, `roundTripInput`, `verticalInput`, or the Omron reproduction test's own inline input) set `values.gravity` — they always relied on the registry default. Since the `gravity` port no longer exists on the `0.2.0` manifest at all, these fixtures need no changes, and their continued passing **is** the regression proof that the gravity hardcode is behavior-neutral (per the design doc's own "Gravity" section). Two things do need updating: the "fails the inertia-ratio check" test's expected status, and its own reference to `ballScrewMotorSizingModule` (still correct — it's imported from this directory's own `./index`, which Task 11 will point at `0.2.0`'s own sealed package). A new test is added for the recommended default.

- [ ] **Step 1: Update `EXPECTED_SOURCE_HASH` to a placeholder (real value computed in Task 12)**

Find:

```ts
// Pinned by `npm run module:source-hash -- ball-screw-motor-sizing 0.1.0`
// -- see lib/engine/module-sdk/conformance.ts's "source-immutability"
// check. Update this value in the same commit as a deliberate change to
// this directory's .ts files; an unreviewed change leaves it stale and the
// check below fails.
const EXPECTED_SOURCE_HASH = "18c8f078d2b91c8a";

describe("ball-screw-motor-sizing 0.1.0 module conformance", () => {
```

Replace with:

```ts
// Pinned by `npm run module:source-hash -- ball-screw-motor-sizing 0.2.0`
// -- see lib/engine/module-sdk/conformance.ts's "source-immutability"
// check. Update this value in the same commit as a deliberate change to
// this directory's .ts files; an unreviewed change leaves it stale and the
// check below fails. Placeholder until Task 12 computes the real hash.
const EXPECTED_SOURCE_HASH = "PLACEHOLDER_UNTIL_TASK_12";

describe("ball-screw-motor-sizing 0.2.0 module conformance", () => {
```

- [ ] **Step 2: Rename the other two `describe` block titles from `0.1.0` to `0.2.0`**

Find:

```ts
describe("ball-screw-motor-sizing 0.1.0 executeModule", () => {
```

Replace with:

```ts
describe("ball-screw-motor-sizing 0.2.0 executeModule", () => {
```

Find:

```ts
describe("ball-screw-motor-sizing 0.1.0: Omron Corporation's own worked example, through executeModule", () => {
```

Replace with:

```ts
describe("ball-screw-motor-sizing 0.2.0: Omron Corporation's own worked example, through executeModule", () => {
```

- [ ] **Step 3: Update the exceeded-inertia-ratio test to expect `"warning"`**

Find:

```ts
  it("fails the inertia-ratio check when the load is too large for the motor", () => {
    const input = baselineInput();
    input.values.motor_rotor_inertia = makeQuantity(1e-8, "kg*m^2");
    const result = executeModule(ballScrewMotorSizingModule, input);
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("fail");
  });
```

Replace with:

```ts
  it("reports a warning (not a failure) on the inertia-ratio check when the load is too large for the motor", () => {
    const input = baselineInput();
    input.values.motor_rotor_inertia = makeQuantity(1e-8, "kg*m^2");
    const result = executeModule(ballScrewMotorSizingModule, input);
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("warning");
  });

  it("resolves inertia_ratio_maximum to the recommended default of 10 when unset, and remains overridable", () => {
    const defaultInput = baselineInput();
    delete defaultInput.values.inertia_ratio_maximum;
    const defaultResult = executeModule(
      ballScrewMotorSizingModule,
      defaultInput,
    );
    const defaultCheck = defaultResult.checks.find(
      (c) => c.id === "inertia-ratio",
    );
    expect(asQuantity(defaultCheck!.allowable!).value).toBeCloseTo(10, 9);

    const overriddenInput = baselineInput();
    overriddenInput.values.inertia_ratio_maximum = makeQuantity(5, "ratio");
    const overriddenResult = executeModule(
      ballScrewMotorSizingModule,
      overriddenInput,
    );
    const overriddenCheck = overriddenResult.checks.find(
      (c) => c.id === "inertia-ratio",
    );
    expect(asQuantity(overriddenCheck!.allowable!).value).toBeCloseTo(5, 9);
  });
```

`baselineInput()`'s own `motor_rotor_inertia = 1.23e-5 kg*m^2` and `total_moving_mass = 5 kg` combination produces an `inertia_ratio` comfortably below both `10` and `5`, so both branches of the new test exercise the `"pass"` path — the test only asserts on `allowable` (the resolved `inertia_ratio_maximum` value the check was run against), not on `status`, so it stays correct regardless of which side of either threshold the ratio happens to fall on.

- [ ] **Step 4: Run the tests to verify they pass, using the placeholder hash**

Run: `npx vitest run lib/modules/ball-screw-motor-sizing/0.2.0/package.test.ts`
Expected: every test PASSES **except** `"runs the source-immutability check and it passes (not skipped)"`, which fails because `EXPECTED_SOURCE_HASH` is still the Step 1 placeholder — expected at this point; Task 12 fixes it. Confirm every other test in the file passes, including the two touched/added in this task.

- [ ] **Step 5: Commit**

```bash
git add lib/modules/ball-screw-motor-sizing/0.2.0/package.test.ts
git commit -m "$(cat <<'EOF'
test(ball-screw-motor-sizing): 0.2.0 package.test.ts — warning status, recommended-default coverage

Exceeded inertia ratio now asserts "warning", not "fail". New test
confirms inertia_ratio_maximum resolves to the recommended default of
10 when unset and stays overridable. Existing baseline/round-trip/
vertical/Omron fixtures are unchanged (none ever set gravity
explicitly) -- their continued passing is the regression proof that
the gravity hardcode is behavior-neutral.
EOF
)"
```

---

### Task 10: `cross-module-links.test.ts` — update version-scoped titles

**Files:**
- Modify: `lib/modules/ball-screw-motor-sizing/0.2.0/cross-module-links.test.ts`

This file reads `manifest.ts` and `ports` directly (`import { manifest, ports } from "./manifest"`), so the removed `gravity` port and repointed `inertia_ratio_maximum` port already flow through automatically once Task 2 lands — nothing in this file's own logic references either port by name. Only the two `describe` titles need to drop the stale `0.1.0` label.

- [ ] **Step 1: Update the two `describe` titles**

Find:

```ts
describe("ball-screw-motor-sizing 0.1.0 cross-module links: exhaustively confirmed absent, except one documented pair", () => {
```

Replace with:

```ts
describe("ball-screw-motor-sizing 0.2.0 cross-module links: exhaustively confirmed absent, except one documented pair", () => {
```

Find:

```ts
describe("ball-screw-motor-sizing 0.1.0 workflow role: deliberately none", () => {
```

Replace with:

```ts
describe("ball-screw-motor-sizing 0.2.0 workflow role: deliberately none", () => {
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run lib/modules/ball-screw-motor-sizing/0.2.0/cross-module-links.test.ts`
Expected: all tests PASS — the exhaustive sweep still finds exactly the one documented `total_moving_mass` pair and nothing else (removing `gravity` and repointing `inertia_ratio_maximum` doesn't change which of this module's own ports are link-compatible with anything upstream).

- [ ] **Step 3: Commit**

```bash
git add lib/modules/ball-screw-motor-sizing/0.2.0/cross-module-links.test.ts
git commit -m "$(cat <<'EOF'
test(ball-screw-motor-sizing): 0.2.0 cross-module-links.test.ts — update describe titles to 0.2.0
EOF
)"
```

---

### Task 11: `index.ts` and `validation.ts` — version string updates

**Files:**
- Modify: `lib/modules/ball-screw-motor-sizing/0.2.0/index.ts`
- Modify: `lib/modules/ball-screw-motor-sizing/0.2.0/validation.ts`

- [ ] **Step 1: Update `index.ts`'s own header comment**

Find:

```ts
// The ball-screw-motor-sizing module package (Unit 6.2). Assembles the
// manifest, ports, compute, UI, report, and validation record into a
// single `ModulePackage` and seals it (the content hash is stamped here).
//
// Named `index.ts` so `npm run registry:generate`
// (scripts/generate-registry.mts) discovers this package. Released and
// registered 2026-08-13 (lib/modules/registry.generated.ts,
// validation/ball-screw-motor-sizing/0.1.0.md).
```

Replace with:

```ts
// The ball-screw-motor-sizing module package, 0.2.0 (the consistency-pass
// follow-on to 0.1.0). Assembles the manifest, ports, compute, UI, report,
// and validation record into a single `ModulePackage` and seals it (the
// content hash is stamped here).
//
// Named `index.ts` so `npm run registry:generate`
// (scripts/generate-registry.mts) discovers this package. Released and
// registered 2026-08-19 (lib/modules/registry.generated.ts,
// validation/ball-screw-motor-sizing/0.2.0.md). 0.1.0 stays released,
// registered, and untouched (its own index.ts is unaffected by this file).
```

The exported binding name `ballScrewMotorSizingModule` stays as-is — `package.test.ts` already imports it under that exact name from `./index`, and every other file in this directory that imports it (none currently do, besides tests) expects that name.

- [ ] **Step 2: Update `validation.ts`'s `moduleVersion` and add the addendum note**

Find:

```ts
export const validation: ValidationRecord = {
  moduleId: "ball-screw-motor-sizing",
  moduleVersion: "0.1.0",
  methods: [
```

Replace with:

```ts
export const validation: ValidationRecord = {
  moduleId: "ball-screw-motor-sizing",
  moduleVersion: "0.2.0",
  methods: [
```

- [ ] **Step 3: Add a 0.2.0-specific deviation entry documenting the two disclosed changes**

Find the end of the `deviations` array:

```ts
  deviations: [
    "effective_torque understates THK Co., Ltd.'s own printed vertical-example figure (743 N*mm) by ~29% through the real executeModule compute path, because the dwell phase always contributes 0 torque rather than THK's own real 658 N*mm stationary holding torque (see 'thk-vertical-executemodule' above). The N-phase Trms FORMULA itself is not at fault -- fed THK's own seven printed phases directly (including the 658 N*mm term), it reproduces 743 N*mm within 0.5% (see 'thk-vertical-n-phase-formula-kernel-level'). Recorded as a real, sourced, quantified deviation from an already-documented scope gap, not a defect discovered here for the first time.",
    "A finding recorded, not a deviation requiring a fix: this module's own resolveDriveForce (math.ts) flips gravity's own sign between the 'forward' and 'return' directions, producing a NEGATIVE signed return_load_torque on THK's own vertical example (-0.83 N*m, versus THK's own printed unsigned 830 N*mm). Verified by hand this session that this is the mathematically correct transform of a fixed-frame force-balance model (the same one lib/modules/axis-load-cases/0.1.0/math.ts's own resolveAxisLoadPhase already uses, where gravity is a fixed vector and only friction/guide-resistance flip) projected onto a single travel-direction-relative scalar -- and that resolveMomentaryTorque (Math.abs) and resolveEffectiveTorque (squares every term) are already sign-agnostic, so the sign difference has zero effect on any reported output. Not a bug; no code change was needed.",
  ],
};
```

Replace with:

```ts
  deviations: [
    "effective_torque understates THK Co., Ltd.'s own printed vertical-example figure (743 N*mm) by ~29% through the real executeModule compute path, because the dwell phase always contributes 0 torque rather than THK's own real 658 N*mm stationary holding torque (see 'thk-vertical-executemodule' above). The N-phase Trms FORMULA itself is not at fault -- fed THK's own seven printed phases directly (including the 658 N*mm term), it reproduces 743 N*mm within 0.5% (see 'thk-vertical-n-phase-formula-kernel-level'). Recorded as a real, sourced, quantified deviation from an already-documented scope gap, not a defect discovered here for the first time.",
    "A finding recorded, not a deviation requiring a fix: this module's own resolveDriveForce (math.ts) flips gravity's own sign between the 'forward' and 'return' directions, producing a NEGATIVE signed return_load_torque on THK's own vertical example (-0.83 N*m, versus THK's own printed unsigned 830 N*mm). Verified by hand this session that this is the mathematically correct transform of a fixed-frame force-balance model (the same one lib/modules/axis-load-cases/0.1.0/math.ts's own resolveAxisLoadPhase already uses, where gravity is a fixed vector and only friction/guide-resistance flip) projected onto a single travel-direction-relative scalar -- and that resolveMomentaryTorque (Math.abs) and resolveEffectiveTorque (squares every term) are already sign-agnostic, so the sign difference has zero effect on any reported output. Not a bug; no code change was needed.",
    "0.2.0 addendum, not a re-validation of the underlying physics (unchanged): (1) gravity is no longer an editable input -- resolveDriveForce now hardcodes STANDARD_GRAVITY_M_PER_S2 = 9.80665 m/s^2 (math.ts), the exact value motion.axis.gravity's own registry constant default already supplied everywhere this module used it. Behavior-neutral: every existing reference example above (Omron kernel-level/executeModule, THK horizontal/vertical) re-passes unchanged under 0.2.0 -- that unchanged pass is the regression proof, not a new derivation. (2) inertia_ratio_maximum now resolves to motor_sizing.ball_screw.inertia_ratio_recommended_maximum (registry 1.15.0), a founder-directed default of 10:1 -- NOT a manufacturer-sourced value; drive-train/stage-1-spec.md item 5's own five-source survey (2:1 to 100:1) is the closest sourced context and does not itself endorse 10 specifically. The check's own exceeded-case status changed from 'fail' to 'warning' to match: exceeding a recommended (not required) default is advisory, never blocking. Both changes per docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md.",
  ],
};
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: `0 errors`.

- [ ] **Step 5: Commit**

```bash
git add lib/modules/ball-screw-motor-sizing/0.2.0/index.ts lib/modules/ball-screw-motor-sizing/0.2.0/validation.ts
git commit -m "$(cat <<'EOF'
feat(ball-screw-motor-sizing): 0.2.0 index.ts/validation.ts version and addendum

moduleVersion bumped to 0.2.0; validation.ts records the gravity
hardcode and recommended inertia-ratio default as a disclosed
addendum, not a re-validation of the underlying (unchanged) physics.
EOF
)"
```

---

### Task 12: Register `0.2.0` and pin its source-immutability hash

**Files:**
- Modify: `lib/modules/registry.generated.ts` (generated — do not hand-edit)
- Modify: `lib/modules/ball-screw-motor-sizing/0.2.0/package.test.ts`

- [ ] **Step 1: Regenerate the registry**

Run: `npm run registry:generate`

Expected: `lib/modules/registry.generated.ts` now imports `./ball-screw-motor-sizing/0.2.0` (alongside the existing `./ball-screw-motor-sizing/0.1.0` import — both stay) and adds a `"ball-screw-motor-sizing@0.2.0"` entry to the exported map, following the exact pattern `"belt-pulley-drive-motor-sizing@0.2.0"` already established alongside its own `"belt-pulley-drive-motor-sizing@0.1.0"` entry.

- [ ] **Step 2: Confirm the registry change looks right**

```bash
git diff lib/modules/registry.generated.ts
```

Expected: one new import line and one new map entry for `ball-screw-motor-sizing@0.2.0`; the existing `ball-screw-motor-sizing@0.1.0` import and entry are untouched.

- [ ] **Step 3: Compute the real source-immutability hash**

Run: `npm run module:source-hash -- ball-screw-motor-sizing 0.2.0`
Expected: prints a 16-character hex string (the `expectedSourceHash`). Copy it exactly — do not guess or compute it by hand.

- [ ] **Step 4: Replace the placeholder in `package.test.ts`**

In `lib/modules/ball-screw-motor-sizing/0.2.0/package.test.ts`, find:

```ts
const EXPECTED_SOURCE_HASH = "PLACEHOLDER_UNTIL_TASK_12";
```

Replace `"PLACEHOLDER_UNTIL_TASK_12"` with the exact hash string Step 3 printed.

- [ ] **Step 5: Run the full module test directory**

Run: `npx vitest run lib/modules/ball-screw-motor-sizing/0.2.0/`
Expected: every test in every file PASSES, including `"runs the source-immutability check and it passes (not skipped)"` and `"passes overall conformance"`.

- [ ] **Step 6: Confirm `0.1.0` is still fully passing and untouched**

Run: `npx vitest run lib/modules/ball-screw-motor-sizing/0.1.0/`
Expected: every test still PASSES, unchanged from before this plan started.

```bash
git status --short lib/modules/ball-screw-motor-sizing/0.1.0/
```

Expected: no output.

- [ ] **Step 7: Typecheck, lint, build**

Run: `npm run typecheck`
Expected: `0 errors`.

Run: `npx eslint lib/modules/ball-screw-motor-sizing/0.2.0/ lib/modules/registry.generated.ts`
Expected: no output (0 problems).

Run: `npm run build`
Expected: builds successfully.

- [ ] **Step 8: Commit**

```bash
git add lib/modules/registry.generated.ts lib/modules/ball-screw-motor-sizing/0.2.0/package.test.ts
git commit -m "$(cat <<'EOF'
feat: register ball-screw-motor-sizing@0.2.0

npm run registry:generate discovers the new lib/modules/
ball-screw-motor-sizing/0.2.0/index.ts default export. Pins the real
source-immutability hash (npm run module:source-hash --
ball-screw-motor-sizing 0.2.0) in package.test.ts, replacing the
placeholder. 0.1.0 stays registered and untouched alongside it.
EOF
)"
```

---

### Task 13: `README.md` and `validation/ball-screw-motor-sizing/0.2.0.md`

**Files:**
- Modify: `lib/modules/ball-screw-motor-sizing/0.2.0/README.md`
- Create: `validation/ball-screw-motor-sizing/0.2.0.md`

- [ ] **Step 1: Add a "0.2.0 addendum" section to the copied `README.md`**

Open `lib/modules/ball-screw-motor-sizing/0.2.0/README.md` (the file Task 1 copied from `0.1.0`). At the very top, immediately after the `# Ball-Screw Motor Sizing Module (`ball-screw-motor-sizing`)` title line, insert:

```markdown

## 0.2.0 — Consistency-Pass Addendum (Gravity, Recommended Inertia-Ratio Default)

Follow-on to `0.1.0`, per
`docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`
and `docs/superpowers/plans/2026-08-19-ball-screw-motor-sizing-0.2.0.md`.
Two changes, neither touching the underlying physics (every reference
example below still passes unchanged):

1. **Gravity is no longer an editable input.** `math.ts`'s own
   `resolveDriveForce` hardcodes `STANDARD_GRAVITY_M_PER_S2 = 9.80665`
   instead of reading a `gravity` port — the exact value
   `motion.axis.gravity`'s own registry constant default already supplied
   everywhere this module used it, so this is behavior-neutral, not a
   physics change.
2. **`inertia_ratio_maximum` now resolves to a founder-directed recommended
   default of 10:1** (`motor_sizing.ball_screw.
   inertia_ratio_recommended_maximum`, parameter registry `1.15.0`),
   editable, rather than `0.1.0`'s own required-no-default value. The
   inertia-ratio check's own exceeded-case status changed from `fail` to
   `warning` to match — exceeding a recommendation is advisory, never
   blocking.

`0.1.0` stays released, registered, and byte-for-byte untouched
(`lib/modules/ball-screw-motor-sizing/0.1.0/`) — an engineer who wants
`0.2.0`'s behavior on an existing instance archives it and adds a fresh
`0.2.0` instance, the same migration story `belt-pulley-drive-motor-sizing@
0.2.0` already established. Full record:
`validation/ball-screw-motor-sizing/0.2.0.md`.
```

- [ ] **Step 2: Create the 0.2.0 validation-record addendum**

Create `validation/ball-screw-motor-sizing/0.2.0.md`:

```markdown
# Module Validation Record — `ball-screw-motor-sizing` 0.2.0

Addendum to `validation/ball-screw-motor-sizing/0.1.0.md`, not a
re-validation. `0.2.0` changes two things that do not touch the
underlying physics (`docs/superpowers/specs/
2026-08-18-motor-sizing-consistency-pass-design.md`): gravity is no
longer an editable input (hardcoded `9.80665 m/s^2`, the exact value the
removed port's own registry default already supplied), and
`inertia_ratio_maximum` now resolves to a founder-directed recommended
default of `10` (`motor_sizing.ball_screw.
inertia_ratio_recommended_maximum`, registry `1.15.0`) rather than a
required no-default value, with the check's own exceeded-case status
downgraded from `fail` to `warning` to match.

## Module Identity

- Module ID: `ball-screw-motor-sizing`
- Version validated: `0.2.0`
- Package content hash: see `ModuleManifest.contentHash`, sealed by
  `sealModulePackage` in
  `lib/modules/ball-screw-motor-sizing/0.2.0/index.ts`
- Module source-immutability hash (`expectedSourceHash`): pinned in
  `lib/modules/ball-screw-motor-sizing/0.2.0/package.test.ts`
  (`npm run module:source-hash -- ball-screw-motor-sizing 0.2.0`)
- Parameter-registry version this module's ports were released against:
  `1.15.0` (`lib/modules/ball-screw-motor-sizing/0.2.0/manifest.ts`)
- Release date: `2026-08-19`

## What changed from 0.1.0

1. **Gravity dropped as an input.** `manifest.ts` no longer declares a
   `gravity` port; `math.ts`'s own `resolveDriveForce` uses a hardcoded
   `STANDARD_GRAVITY_M_PER_S2 = 9.80665` constant instead. This is the
   exact numeric value `motion.axis.gravity`'s own registry constant
   default already supplied on every `0.1.0` run that did not explicitly
   override it (the overwhelming common case) — behavior-neutral by
   construction, not re-derived.
2. **`inertia_ratio_maximum` repointed.** The port (same key, same
   compute/UI role) now maps to `motor_sizing.ball_screw.
   inertia_ratio_recommended_maximum` instead of `motor_sizing.ball_screw.
   inertia_ratio_maximum`. The new parameter carries a founder-directed
   default of `10` — explicitly **not** a manufacturer-sourced figure;
   see that parameter's own `definition` text
   (`lib/engine/parameters/definitions.ts`) for the full disclosure and
   servo-industry guidance ranges it cites. The original
   `motor_sizing.ball_screw.inertia_ratio_maximum` parameter is untouched
   and stays referenced by `0.1.0`'s own manifest.
3. **Check status downgraded.** The `inertia-ratio` check's exceeded-case
   `status` changed from `"fail"` to `"warning"` (`checks.ts`) — exceeding
   a recommended default is advisory, never blocking, unlike exceeding a
   required no-default value.

## Regression Evidence (Not a Re-Validation)

Every reference example `validation/ball-screw-motor-sizing/0.1.0.md`
records — Omron Corporation's own worked example (both the kernel-level
and `executeModule`-path reproductions) and THK Co., Ltd.'s own horizontal
and vertical worked examples — re-passes unchanged under `0.2.0`,
confirmed by re-running the identical test suites
(`lib/modules/ball-screw-motor-sizing/0.2.0/math.test.ts`,
`package.test.ts`, `thk-reference-examples.test.ts`,
`independent-benchmark.test.ts`) against the new version's own sealed
package. None of those fixtures ever set `values.gravity` explicitly —
they always relied on the registry default `0.1.0`'s own `gravity` port
supplied — so their continued passing under `0.2.0`, where that port no
longer exists at all and the same numeric value is hardcoded instead, is
the actual regression proof that change 1 above is behavior-neutral, not
a new derivation.

Change 2 (the recommended-default repoint) and change 3 (the warning
downgrade) are covered by two new tests in `package.test.ts`: one
confirming `inertia_ratio_maximum` resolves to `10` when unset and stays
overridable to any other value, and one confirming the exceeded-case
check status is `"warning"`, not `"fail"`, and the overall computation
still completes (never blocked).

## Disclosed, Non-Sourced Default

The `10` figure in `motor_sizing.ball_screw.
inertia_ratio_recommended_maximum` is **founder judgment, not a
manufacturer-sourced value**. `drive-train/stage-1-spec.md` item 5's own
five-source survey found a wide, genuinely disagreeing range (2:1 to
100:1, depending on control technology, tuning method, and positioning
objective) and `0.1.0`'s own Stage 2 contract deliberately chose
"required input, no default" for exactly that reason
(`context/modules/ball-screw-motor-sizing/stage-2-contract.md`
"Decisions" item 4). `0.2.0` departs from that precedent deliberately,
per explicit founder direction
(`docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`
"Context"), and discloses the departure here rather than implying a
source that does not exist. `0.1.0`'s own required-no-default parameter
and check behavior are unaffected — `0.2.0` is a new, separate module
version, not an edit to a released one.

## Reviewer

- Reviewer: not applicable — this addendum changes no physics and adds no
  new formula requiring independent validation; the underlying compute
  path is identical to `0.1.0`'s own already-reviewed physics (see
  `validation/ball-screw-motor-sizing/0.1.0.md` "Reviewer" for that
  review). The regression evidence above (all `0.1.0` reference examples
  re-passing unchanged) is the applicable check for this addendum's own
  two changes.
- Review date: `2026-08-19`

## Sign-off

- [x] Both `0.2.0` changes documented above with their own regression/
      disclosure evidence
- [x] Every `0.1.0` reference example re-passes unchanged under `0.2.0`
      (regression proof for the gravity hardcode)
- [x] The recommended-default's own non-manufacturer-sourced status is
      disclosed plainly, not implied to be sourced
- [x] `0.1.0` confirmed untouched (`git status --short
      lib/modules/ball-screw-motor-sizing/0.1.0/` prints nothing)
- [x] Released and registered as `ball-screw-motor-sizing@0.2.0`
      2026-08-19 (`lib/modules/registry.generated.ts`)
```

- [ ] **Step 3: Verify prose renders sensibly**

Read both files back in full to confirm no orphaned headings or duplicated version notes.

- [ ] **Step 4: Commit**

```bash
git add lib/modules/ball-screw-motor-sizing/0.2.0/README.md validation/ball-screw-motor-sizing/0.2.0.md
git commit -m "$(cat <<'EOF'
docs: ball-screw-motor-sizing 0.2.0 README addendum and validation record

Documents the two 0.2.0 changes (gravity hardcode, recommended
inertia-ratio default) as an addendum to the unchanged 0.1.0 physics,
with the regression evidence and the recommended default's own
disclosed non-sourced status recorded explicitly.
EOF
)"
```

---

### Task 14: Final verification and progress-tracker update

**Files:**
- Modify: `context/progress-tracker.md` (edit in place — do not append a dated narrative entry, per that file's own header rule)

- [ ] **Step 1: Full verification**

Run: `npm run lint`
Expected: `0` warnings/errors on every file this plan touched. (A bare repo-root `npm run lint` may still flag the already-documented, pre-existing stale `.worktrees/unit-4-1-release/.next/dev/types/` artifact — confirmed unrelated in prior sessions; if seen, verify by linting only the files this plan changed directly.)

Run: `npm run typecheck`
Expected: `0` errors.

Run: `npx vitest run --testTimeout=30000`
Expected: every previously-passing non-DB test still passes, plus this plan's own new tests (one in `package.test.ts` Task 9 Step 3). DB-gated tests report as skipped without `DATABASE_URL`/`NODE_EXTRA_CA_CERTS` set — expected, not a failure.

Run: `npm run build`
Expected: builds successfully, no new routes or errors (this module has no UI route of its own beyond the generic module workspace, which needs no new wiring for a new module version).

- [ ] **Step 2: Update `context/progress-tracker.md`**

Find the most recent paragraph in the "Active work" section (the "Motor Sizing shared infrastructure shipped 2026-08-18" paragraph) and add this as the next paragraph immediately after it:

```markdown

**`ball-screw-motor-sizing@0.2.0` shipped 2026-08-19** — the first of the
five Motor Sizing module-version bumps the shared-infrastructure plan
above named as its own follow-on work
(`docs/superpowers/plans/2026-08-19-ball-screw-motor-sizing-0.2.0.md`).
Two changes, neither touching the underlying physics: gravity is no
longer an editable input (`math.ts` hardcodes `9.80665 m/s^2`, the exact
value the removed port's own registry default already supplied), and
`inertia_ratio_maximum` now resolves to the new founder-directed
recommended default of `10` (`motor_sizing.ball_screw.
inertia_ratio_recommended_maximum`, registry `1.15.0`) rather than a
required no-default value, with the check's own exceeded-case status
downgraded from `fail` to `warning` to match. Every `0.1.0` reference
example (Omron, THK horizontal, THK vertical) re-passes unchanged under
`0.2.0` — the regression proof the gravity hardcode is behavior-neutral.
`0.1.0` stays released, registered, and untouched
(`validation/ball-screw-motor-sizing/0.1.0.md`); `0.2.0`'s own addendum
record is `validation/ball-screw-motor-sizing/0.2.0.md`. Four more
follow-on plans remain, not yet started:
`direct-drive-conveyor-motor-sizing` and `rack-pinion-motor-sizing` and
`index-table-motor-sizing` each `0.1.0` -> `0.2.0`, and
`belt-pulley-drive-motor-sizing` `0.2.0` -> `0.3.0` (the only one of the
five also wiring `disabledWhen`).
```

- [ ] **Step 3: Commit**

```bash
git add context/progress-tracker.md
git commit -m "$(cat <<'EOF'
docs: record ball-screw-motor-sizing 0.2.0 in the progress tracker
EOF
)"
```

---

## What comes after this plan

Four more plans, one per remaining Motor Sizing module, each following this exact same pattern (copy the released version's own directory, drop `gravity`, repoint `inertia_ratio_maximum` at that mechanism's own `*.inertia_ratio_recommended_maximum` parameter, downgrade the check to `warning`, register, validate, document):

1. `direct-drive-conveyor-motor-sizing` `0.1.0` → `0.2.0`
2. `rack-pinion-motor-sizing` `0.1.0` → `0.2.0`
3. `index-table-motor-sizing` `0.1.0` → `0.2.0` (inertia-ratio change only — this mechanism has no `gravity` port to begin with, confirmed in `docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md` "Gravity": "`index-table-motor-sizing` has no such port today ... and is untouched by this section")
4. `belt-pulley-drive-motor-sizing` `0.2.0` → `0.3.0` (gets all three changes, including the `disabledWhen` wiring for its own `motion_mode`/`target_velocity`/`travel_distance`/`constant_velocity_time`/`cycle_time` fields — the one consumer of the shared-infrastructure plan's `disabledWhen` capability)

Each is written and executed as its own separate plan, one at a time, after the prior one is merged and verified — per this codebase's own established one-plan-per-module-release practice.
