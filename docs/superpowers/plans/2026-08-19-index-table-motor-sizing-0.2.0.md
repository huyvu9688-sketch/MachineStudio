# Index-Table Motor Sizing 0.2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `index-table-motor-sizing@0.2.0` — the fourth of five follow-on module-version bumps consuming the Motor Sizing shared infrastructure (parameter registry `1.15.0`) per `docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`. Unlike the three siblings already shipped (`ball-screw-motor-sizing@0.2.0`, `direct-drive-conveyor-motor-sizing@0.2.0`, `rack-pinion-motor-sizing@0.2.0`), this module has **no `gravity` port to begin with** — it is this project's only Motor Sizing module with zero `motion.axis.*` reuse (confirmed in the design doc's own "Gravity" section: "`index-table-motor-sizing` has no such port today ... and is untouched by this section"). So `0.2.0` makes exactly one change: the `inertia_ratio_maximum` port switches from the required-no-default `motor_sizing.index_table.inertia_ratio_maximum` parameter to the new founder-directed recommended-default parameter `motor_sizing.index_table.inertia_ratio_recommended_maximum` (default `10`, still overridable), and the inertia-ratio check's exceeded-case status changes from `fail` to `warning`.

**Architecture:** `0.1.0` stays released, registered, and byte-for-byte untouched (`ai-workflow-rules.md` "Protected Files"). A new `lib/modules/index-table-motor-sizing/0.2.0/` directory is created by copying every `0.1.0` file, then editing only the files the single change actually touches (`manifest.ts`, `trace.ts`, `ui.ts`, `checks.ts`, `package.test.ts`, `cross-module-links.test.ts`, `index.ts`, `validation.ts`, `README.md`, plus a new `validation/index-table-motor-sizing/0.2.0.md`). Every other file (`values.ts`, `compute.ts`, `report.ts`, `test-helpers.ts`, `math.ts`/`math.test.ts`, `automationdirect-reference-example.ts`/`.test.ts`, `oriental-motor-reference-example.ts`/`.test.ts`, `independent-benchmark.ts`/`.test.ts`) is copied unchanged: `compute.ts` reads the port by its stable key `"inertia_ratio_maximum"`, which does not change — only the `parameterId` that key maps to in `manifest.ts` changes, so nothing downstream of `compute.ts`'s own `quantityAt(values, "inertia_ratio_maximum")` lookup needs editing. `0.2.0` is registered by adding one import line to the generated registry via `npm run registry:generate` — never hand-edit `registry.generated.ts` directly.

**Tech Stack:** TypeScript, Zod, Vitest, `lib/engine` module SDK.

---

## Before you start

Read `docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md` in full — this plan implements its "Inertia-ratio recommended default" section for `index-table-motor-sizing` only (this module is explicitly excluded from the "Gravity" section, and does not consume `disabledWhen`). Confirm the shared infrastructure it depends on is already merged:

```bash
grep -n "PARAMETER_REGISTRY_VERSION = " lib/engine/parameters/definitions.ts
grep -n "motor_sizing.index_table.inertia_ratio_recommended_maximum" lib/engine/parameters/definitions.ts
```

Expected: `PARAMETER_REGISTRY_VERSION = "1.15.0"` and a match for `id: "motor_sizing.index_table.inertia_ratio_recommended_maximum"`. If either is missing, stop — `docs/superpowers/plans/2026-08-18-motor-sizing-shared-infrastructure.md` has not been merged yet, and this plan cannot proceed. (Both were confirmed present while writing this plan.)

Confirm your starting point:

```bash
git status
```

Expected: clean, or only unrelated changes you're aware of. Do not proceed on a dirty tree without checking with the user first.

---

### Task 1: Scaffold `0.2.0` as an exact copy of `0.1.0`

**Files:**
- Create: `lib/modules/index-table-motor-sizing/0.2.0/` (every file, copied from `0.1.0`)

- [ ] **Step 1: Copy the directory**

```bash
cp -r "lib/modules/index-table-motor-sizing/0.1.0" "lib/modules/index-table-motor-sizing/0.2.0"
```

- [ ] **Step 2: Confirm the copy is complete and 0.1.0 is untouched**

```bash
diff -rq "lib/modules/index-table-motor-sizing/0.1.0" "lib/modules/index-table-motor-sizing/0.2.0"
git status --short lib/modules/index-table-motor-sizing/0.1.0/
```

Expected: `diff -rq` reports no differences (a byte-for-byte copy); `git status` on the `0.1.0` path prints nothing (untouched).

- [ ] **Step 3: Commit the scaffold as its own step, before any edits**

```bash
git add lib/modules/index-table-motor-sizing/0.2.0
git commit -m "$(cat <<'EOF'
chore: scaffold index-table-motor-sizing 0.2.0 as a copy of 0.1.0

Baseline for the recommended-inertia-ratio-default consistency pass
(docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md).
0.1.0 stays released, registered, and untouched.
EOF
)"
```

Every later task in this plan edits only files under `lib/modules/index-table-motor-sizing/0.2.0/` (plus the registry, docs, and progress tracker) — `0.1.0/` is never touched again.

---

### Task 2: `manifest.ts` — version bump, repoint `inertia_ratio_maximum`

**Files:**
- Modify: `lib/modules/index-table-motor-sizing/0.2.0/manifest.ts`

- [ ] **Step 1: Update the header comment**

Find:

```ts
// Registered as `index-table-motor-sizing@0.1.0`
// (lib/modules/registry.generated.ts) -- imported by ./index.ts, which
// `npm run registry:generate` discovers.
```

Replace with:

```ts
// 0.2.0: consistency-pass follow-on
// (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md)
// -- repoints inertia_ratio_maximum at the new
// motor_sizing.index_table.inertia_ratio_recommended_maximum parameter
// (registry 1.15.0), which carries a founder-directed default of 10. This
// is the ONLY change: unlike its four siblings, this module has no
// gravity port to begin with (zero motion.axis.* reuse, confirmed in the
// design doc's own "Gravity" section), so there is nothing to drop there.
// 0.1.0 stays released, registered, and untouched.
//
// Registered 2026-08-19 as `index-table-motor-sizing@0.2.0`
// (lib/modules/registry.generated.ts) -- imported by ./index.ts, which
// `npm run registry:generate` discovers.
```

- [ ] **Step 2: Bump `version` and `parameterRegistryVersion`**

Find:

```ts
export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "index-table-motor-sizing",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.13.0, the version that released this
  // module's own motor_sizing.index_table.* group (stage-2-contract.md).
  // Keep this literal -- never import the mutable current-version constant
  // (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.13.0",
```

Replace with:

```ts
export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "index-table-motor-sizing",
  version: "0.2.0",
  sdkRange: { min: "1.0.0" },
  // Authored against registry 1.15.0. Keep this literal -- never import
  // the mutable current-version constant (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.15.0",
```

- [ ] **Step 3: Repoint `inertia_ratio_maximum` at the recommended-default parameter**

Find:

```ts
    {
      key: "inertia_ratio_maximum",
      parameterId: asParameterId(
        "motor_sizing.index_table.inertia_ratio_maximum",
      ),
      required: true,
    },
  ] satisfies ModuleInputPort[],
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
      // motor_sizing.index_table.inertia_ratio_maximum, untouched.
      parameterId: asParameterId(
        "motor_sizing.index_table.inertia_ratio_recommended_maximum",
      ),
      required: true,
    },
  ] satisfies ModuleInputPort[],
```

`required: true` stays `true` — the parameter is still a required port at the module level; the registry's own `defaultPolicy: { kind: "constant", value: 10 }` is what auto-fills an absent value at execution time.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: `0 errors`.

- [ ] **Step 5: Commit**

```bash
git add lib/modules/index-table-motor-sizing/0.2.0/manifest.ts
git commit -m "$(cat <<'EOF'
feat(index-table-motor-sizing): 0.2.0 manifest — recommended inertia-ratio default

Version bump to 0.2.0, registry pin to 1.15.0, inertia_ratio_maximum
repointed at motor_sizing.index_table.inertia_ratio_recommended_maximum.
No gravity port exists on this module, so nothing else changes here.
EOF
)"
```

---

### Task 3: `trace.ts` — repoint the traced `ref` for `R_Jmax`

**Files:**
- Modify: `lib/modules/index-table-motor-sizing/0.2.0/trace.ts`

- [ ] **Step 1: Update the `R_Jmax` trace row's source reference**

Find:

```ts
        label: "R_Jmax",
        value: input.inertiaRatioMaximum,
        ref: "motor_sizing.index_table.inertia_ratio_maximum",
      },
    ],
```

Replace with:

```ts
        label: "R_Jmax",
        value: input.inertiaRatioMaximum,
        // 0.2.0: this trace row's value now resolves from the recommended-
        // maximum parameter (manifest.ts), so its own ref must cite that
        // same parameter id -- otherwise the trace would cite a parameter
        // the value did not actually come from.
        ref: "motor_sizing.index_table.inertia_ratio_recommended_maximum",
      },
    ],
```

`TraceInput`'s own field name (`inertiaRatioMaximum`) and every call site that builds it stay unchanged — this is a `ref` string update only, not a shape change.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add lib/modules/index-table-motor-sizing/0.2.0/trace.ts
git commit -m "$(cat <<'EOF'
feat(index-table-motor-sizing): 0.2.0 trace.ts cites the recommended-maximum parameter

The R_Jmax trace row's own ref now points at
motor_sizing.index_table.inertia_ratio_recommended_maximum, matching
the parameter manifest.ts actually resolves that value from.
EOF
)"
```

---

### Task 4: `ui.ts` — add help text to the recommended-default field

**Files:**
- Modify: `lib/modules/index-table-motor-sizing/0.2.0/ui.ts`

- [ ] **Step 1: Add help text**

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

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add lib/modules/index-table-motor-sizing/0.2.0/ui.ts
git commit -m "$(cat <<'EOF'
feat(index-table-motor-sizing): 0.2.0 ui.ts labels the recommended inertia-ratio default
EOF
)"
```

---

### Task 5: `checks.ts` — exceeded inertia ratio is a warning, not a failure

**Files:**
- Modify: `lib/modules/index-table-motor-sizing/0.2.0/checks.ts`

- [ ] **Step 1: Update the header comment**

Find:

```ts
// Acceptance checks for the index-table-motor-sizing module. Only one real
// check exists in 0.1.0: the inertia ratio against an engineer-supplied
// maximum. Every other torque/speed/power figure is a reported required
// spec, not evaluated pass/fail (the same single-check shape every Motor
// Sizing Tool module already establishes).
```

Replace with:

```ts
// Acceptance checks for the index-table-motor-sizing module. Only one real
// check exists: the inertia ratio against an engineer-supplied maximum.
// Every other torque/speed/power figure is a reported required spec, not
// evaluated pass/fail (the same single-check shape every Motor Sizing Tool
// module already establishes).
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
git add lib/modules/index-table-motor-sizing/0.2.0/checks.ts
git commit -m "$(cat <<'EOF'
feat(index-table-motor-sizing): 0.2.0 inertia-ratio check downgrades exceeded case to warning

Matches the recommended (not required) nature of the new default —
exceeding it is advisory, never blocking.
EOF
)"
```

---

### Task 6: `package.test.ts` — regression proof, default-value test, warning-status test

**Files:**
- Modify: `lib/modules/index-table-motor-sizing/0.2.0/package.test.ts`

None of the existing input fixtures (`baselineInput`, `gearedInput`, `loadTorqueInput`, `noOptionalPortsInput`) set `values.inertia_ratio_maximum` in a way this change affects except the one test targeted below — their continued passing **is** the regression proof this repoint is behavior-neutral for every scenario that does not deliberately exceed the ratio.

- [ ] **Step 1: Update `EXPECTED_SOURCE_HASH` to a placeholder (real value computed in Task 8)**

Find:

```ts
// Pinned by `npm run module:source-hash -- index-table-motor-sizing
// 0.1.0` -- see lib/engine/module-sdk/conformance.ts's
// "source-immutability" check. Update this value in the same commit as a
// deliberate change to this directory's .ts files; an unreviewed change
// leaves it stale and the check below fails.
const EXPECTED_SOURCE_HASH = "0e6bd7b721780cd5";

describe("index-table-motor-sizing 0.1.0 module conformance", () => {
```

Replace with:

```ts
// Pinned by `npm run module:source-hash -- index-table-motor-sizing
// 0.2.0` -- see lib/engine/module-sdk/conformance.ts's
// "source-immutability" check. Update this value in the same commit as a
// deliberate change to this directory's .ts files; an unreviewed change
// leaves it stale and the check below fails. Placeholder until Task 8
// computes the real hash.
const EXPECTED_SOURCE_HASH = "PLACEHOLDER_UNTIL_TASK_8";

describe("index-table-motor-sizing 0.2.0 module conformance", () => {
```

- [ ] **Step 2: Rename the other `describe` block title from `0.1.0` to `0.2.0`**

Find:

```ts
describe("index-table-motor-sizing 0.1.0 executeModule", () => {
```

Replace with:

```ts
describe("index-table-motor-sizing 0.2.0 executeModule", () => {
```

- [ ] **Step 3: Update the exceeded-inertia-ratio test to expect `"warning"`, and add a recommended-default coverage test**

Find:

```ts
  it("fails the inertia-ratio check when the load is too large for the motor", () => {
    const input = baselineInput();
    input.values.motor_rotor_inertia = makeQuantity(1e-8, "kg*m^2");
    const result = executeModule(indexTableMotorSizingModule, input);
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("fail");
  });
```

Replace with:

```ts
  it("reports a warning (not a failure) on the inertia-ratio check when the load is too large for the motor", () => {
    const input = baselineInput();
    input.values.motor_rotor_inertia = makeQuantity(1e-8, "kg*m^2");
    const result = executeModule(indexTableMotorSizingModule, input);
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("warning");
  });

  it("resolves inertia_ratio_maximum to the recommended default of 10 when unset, and remains overridable", () => {
    const defaultInput = baselineInput();
    delete (defaultInput.values as Record<string, unknown>)
      .inertia_ratio_maximum;
    const defaultResult = executeModule(
      indexTableMotorSizingModule,
      defaultInput,
    );
    const defaultCheck = defaultResult.checks.find(
      (c) => c.id === "inertia-ratio",
    );
    expect(asQuantity(defaultCheck!.allowable!).value).toBeCloseTo(10, 9);

    const overriddenInput = baselineInput();
    overriddenInput.values.inertia_ratio_maximum = makeQuantity(5, "ratio");
    const overriddenResult = executeModule(
      indexTableMotorSizingModule,
      overriddenInput,
    );
    const overriddenCheck = overriddenResult.checks.find(
      (c) => c.id === "inertia-ratio",
    );
    expect(asQuantity(overriddenCheck!.allowable!).value).toBeCloseTo(5, 9);
  });
```

Check `baselineInput()`'s own `motor_rotor_inertia`/table-and-load figures against the module's `inertia_ratio` output before running this: the new test only asserts on `allowable` (the resolved `inertia_ratio_maximum` value the check ran against), not on `status`, so it stays correct regardless of which side of either threshold (`10` or `5`) the baseline's own inertia ratio happens to fall on — the same reasoning `ball-screw-motor-sizing@0.2.0`'s own equivalent test already used (`docs/superpowers/plans/2026-08-19-ball-screw-motor-sizing-0.2.0.md` Task 9 Step 3).

- [ ] **Step 4: Run the tests to verify they pass, using the placeholder hash**

Run: `npx vitest run lib/modules/index-table-motor-sizing/0.2.0/package.test.ts`
Expected: every test PASSES **except** `"runs the source-immutability check and it passes (not skipped)"`, which fails because `EXPECTED_SOURCE_HASH` is still the Step 1 placeholder — expected at this point; Task 8 fixes it. Confirm every other test in the file passes, including the two touched/added in this task.

- [ ] **Step 5: Commit**

```bash
git add lib/modules/index-table-motor-sizing/0.2.0/package.test.ts
git commit -m "$(cat <<'EOF'
test(index-table-motor-sizing): 0.2.0 package.test.ts — warning status, recommended-default coverage

Exceeded inertia ratio now asserts "warning", not "fail". New test
confirms inertia_ratio_maximum resolves to the recommended default of
10 when unset and stays overridable. Every other fixture (baseline,
geared, load-torque, no-optional-ports) is unchanged -- their
continued passing is the regression proof that the repoint is
behavior-neutral outside the deliberately-exceeded case.
EOF
)"
```

---

### Task 7: `cross-module-links.test.ts` — update version-scoped titles

**Files:**
- Modify: `lib/modules/index-table-motor-sizing/0.2.0/cross-module-links.test.ts`

This file reads `manifest.ts` and `ports` directly, so the repointed `inertia_ratio_maximum` port already flows through automatically once Task 2 lands — nothing in this file's own logic references that port by name. Only the two `describe` titles need to drop the stale `0.1.0` label.

- [ ] **Step 1: Update the two `describe` titles**

Find:

```ts
describe("index-table-motor-sizing 0.1.0 cross-module links: exhaustively confirmed absent (no motion.axis.* reuse at all)", () => {
```

Replace with:

```ts
describe("index-table-motor-sizing 0.2.0 cross-module links: exhaustively confirmed absent (no motion.axis.* reuse at all)", () => {
```

Find:

```ts
describe("index-table-motor-sizing 0.1.0 workflow role: deliberately none", () => {
```

Replace with:

```ts
describe("index-table-motor-sizing 0.2.0 workflow role: deliberately none", () => {
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run lib/modules/index-table-motor-sizing/0.2.0/cross-module-links.test.ts`
Expected: all tests PASS — the exhaustive sweep still finds zero upstream/downstream links (repointing `inertia_ratio_maximum` doesn't change which of this module's own ports are link-compatible with anything, since this module has no `motion.axis.*` reuse either way).

- [ ] **Step 3: Commit**

```bash
git add lib/modules/index-table-motor-sizing/0.2.0/cross-module-links.test.ts
git commit -m "$(cat <<'EOF'
test(index-table-motor-sizing): 0.2.0 cross-module-links.test.ts — update describe titles to 0.2.0
EOF
)"
```

---

### Task 8: `index.ts` and `validation.ts` — version string updates, register, pin hash

**Files:**
- Modify: `lib/modules/index-table-motor-sizing/0.2.0/index.ts`
- Modify: `lib/modules/index-table-motor-sizing/0.2.0/validation.ts`
- Modify: `lib/modules/registry.generated.ts` (generated — do not hand-edit)
- Modify: `lib/modules/index-table-motor-sizing/0.2.0/package.test.ts`

- [ ] **Step 1: Update `index.ts`'s own header comment**

Find:

```ts
// The index-table-motor-sizing module package (Unit 6.6). Assembles the
// manifest, ports, compute, UI, report, and validation record into a
// single `ModulePackage` and seals it (the content hash is stamped here).
//
// Named `index.ts` so `npm run registry:generate` discovers this package
// -- the fifth and last mechanism module in the Motor Sizing Tool family
// (ADR-0011), after ball-screw-motor-sizing@0.1.0,
// direct-drive-conveyor-motor-sizing@0.1.0,
// rack-pinion-motor-sizing@0.1.0, and belt-pulley-drive-motor-sizing@0.1.0.
```

Replace with:

```ts
// The index-table-motor-sizing module package, 0.2.0 (the consistency-pass
// follow-on to 0.1.0). Assembles the manifest, ports, compute, UI, report,
// and validation record into a single `ModulePackage` and seals it (the
// content hash is stamped here).
//
// Named `index.ts` so `npm run registry:generate`
// (scripts/generate-registry.mts) discovers this package. Released and
// registered 2026-08-19 (lib/modules/registry.generated.ts,
// validation/index-table-motor-sizing/0.2.0.md). 0.1.0 stays released,
// registered, and untouched (its own index.ts is unaffected by this file).
```

The exported binding name `indexTableMotorSizingModule` stays as-is — `package.test.ts` already imports it under that exact name from `./index`.

- [ ] **Step 2: Update `validation.ts`'s `moduleVersion` and add the addendum note**

Find:

```ts
export const validation: ValidationRecord = {
  moduleId: "index-table-motor-sizing",
  moduleVersion: "0.1.0",
  methods: [
```

Replace with:

```ts
export const validation: ValidationRecord = {
  moduleId: "index-table-motor-sizing",
  moduleVersion: "0.2.0",
  methods: [
```

- [ ] **Step 3: Add a 0.2.0-specific deviation entry documenting the disclosed change**

Find the end of the `deviations` array:

```ts
  deviations: [
    "AutomationDirect's own worked example computes acceleration torque with a rounded 0.1 constant standing in for the exact 2*pi/60=0.10472 (confirmed against the same document's own Example 7, which uses the unrounded form and reproduces its own printed figure exactly only that way). This module's own kernel uses exact physics throughout, consistent with every other module in this codebase, so its own torque outputs are systematically ~4.7% higher than this source's own printed figures from the constant alone, compounding with the source's own further intermediate rounding (121 rpm, 0.13 s vs. this module's own precisely-computed values) to a total ~8% difference -- fully explained and reapplied exactly at the test level (validation.ts referenceExamples, `automationdirect-index-table-torque-disclosed-deviation`), not an unexplained residual.",
    "A genuine unit-convention difference between the two primary sources, disclosed rather than silently reconciled: Oriental Motor's own printed 'oz-in^2' inertia figures are mass-based (oz used as a mass unit, confirmed by cross-checking the source's own printed oz-in^2-to-kg*m^2 conversion on the same page), while AutomationDirect's own 'lb-in-sec^2' figures are weight-based, requiring the explicit /g division its own formula shows. Both are legitimate, internally consistent conventions within their own documents; this module's own kernel works entirely in SI mass-based units throughout, so no ambiguity reaches the kernel itself -- the distinction only matters when hand-deriving each source's own fixture inputs, and is recorded here for anyone re-deriving those fixtures in the future.",
  ],
};
```

Replace with:

```ts
  deviations: [
    "AutomationDirect's own worked example computes acceleration torque with a rounded 0.1 constant standing in for the exact 2*pi/60=0.10472 (confirmed against the same document's own Example 7, which uses the unrounded form and reproduces its own printed figure exactly only that way). This module's own kernel uses exact physics throughout, consistent with every other module in this codebase, so its own torque outputs are systematically ~4.7% higher than this source's own printed figures from the constant alone, compounding with the source's own further intermediate rounding (121 rpm, 0.13 s vs. this module's own precisely-computed values) to a total ~8% difference -- fully explained and reapplied exactly at the test level (validation.ts referenceExamples, `automationdirect-index-table-torque-disclosed-deviation`), not an unexplained residual.",
    "A genuine unit-convention difference between the two primary sources, disclosed rather than silently reconciled: Oriental Motor's own printed 'oz-in^2' inertia figures are mass-based (oz used as a mass unit, confirmed by cross-checking the source's own printed oz-in^2-to-kg*m^2 conversion on the same page), while AutomationDirect's own 'lb-in-sec^2' figures are weight-based, requiring the explicit /g division its own formula shows. Both are legitimate, internally consistent conventions within their own documents; this module's own kernel works entirely in SI mass-based units throughout, so no ambiguity reaches the kernel itself -- the distinction only matters when hand-deriving each source's own fixture inputs, and is recorded here for anyone re-deriving those fixtures in the future.",
    "0.2.0 addendum, not a re-validation of the underlying physics (unchanged): inertia_ratio_maximum now resolves to motor_sizing.index_table.inertia_ratio_recommended_maximum (registry 1.15.0), a founder-directed default of 10:1 -- NOT a manufacturer-sourced value; neither of this module's own two primary sources (Oriental Motor, AutomationDirect) states a recommended inertia-ratio figure for an index table specifically. The check's own exceeded-case status changed from 'fail' to 'warning' to match: exceeding a recommended (not required) default is advisory, never blocking. Per docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md. This module has no gravity port to begin with (zero motion.axis.* reuse), so that section of the design doc does not apply here.",
  ],
};
```

- [ ] **Step 4: Regenerate the registry**

Run: `npm run registry:generate`

Expected: `lib/modules/registry.generated.ts` now imports `./index-table-motor-sizing/0.2.0` (alongside the existing `./index-table-motor-sizing/0.1.0` import — both stay) and adds an `"index-table-motor-sizing@0.2.0"` entry to the exported map.

- [ ] **Step 5: Confirm the registry change looks right**

```bash
git diff lib/modules/registry.generated.ts
```

Expected: one new import line and one new map entry for `index-table-motor-sizing@0.2.0`; the existing `index-table-motor-sizing@0.1.0` import and entry are untouched.

- [ ] **Step 6: Compute the real source-immutability hash**

Run: `npm run module:source-hash -- index-table-motor-sizing 0.2.0`
Expected: prints a 16-character hex string (the `expectedSourceHash`). Copy it exactly — do not guess or compute it by hand.

- [ ] **Step 7: Replace the placeholder in `package.test.ts`**

In `lib/modules/index-table-motor-sizing/0.2.0/package.test.ts`, find:

```ts
const EXPECTED_SOURCE_HASH = "PLACEHOLDER_UNTIL_TASK_8";
```

Replace `"PLACEHOLDER_UNTIL_TASK_8"` with the exact hash string Step 6 printed.

- [ ] **Step 8: Run the full module test directory**

Run: `npx vitest run lib/modules/index-table-motor-sizing/0.2.0/`
Expected: every test in every file PASSES, including `"runs the source-immutability check and it passes (not skipped)"` and `"passes overall conformance"`.

- [ ] **Step 9: Confirm `0.1.0` is still fully passing and untouched**

Run: `npx vitest run lib/modules/index-table-motor-sizing/0.1.0/`
Expected: every test still PASSES, unchanged from before this plan started.

```bash
git status --short lib/modules/index-table-motor-sizing/0.1.0/
```

Expected: no output.

- [ ] **Step 10: Typecheck, lint, build**

Run: `npm run typecheck`
Expected: `0 errors`.

Run: `npx eslint lib/modules/index-table-motor-sizing/0.2.0/ lib/modules/registry.generated.ts`
Expected: no output (0 problems).

Run: `npm run build`
Expected: builds successfully.

- [ ] **Step 11: Commit**

```bash
git add lib/modules/index-table-motor-sizing/0.2.0/index.ts lib/modules/index-table-motor-sizing/0.2.0/validation.ts lib/modules/registry.generated.ts lib/modules/index-table-motor-sizing/0.2.0/package.test.ts
git commit -m "$(cat <<'EOF'
feat: register index-table-motor-sizing@0.2.0

moduleVersion bumped to 0.2.0; validation.ts records the recommended
inertia-ratio default as a disclosed addendum, not a re-validation of
the underlying (unchanged) physics. npm run registry:generate
discovers the new lib/modules/index-table-motor-sizing/0.2.0/index.ts
default export. Pins the real source-immutability hash (npm run
module:source-hash -- index-table-motor-sizing 0.2.0) in
package.test.ts, replacing the placeholder. 0.1.0 stays registered and
untouched alongside it.
EOF
)"
```

---

### Task 9: `README.md` and `validation/index-table-motor-sizing/0.2.0.md`

**Files:**
- Modify: `lib/modules/index-table-motor-sizing/0.2.0/README.md`
- Create: `validation/index-table-motor-sizing/0.2.0.md`

- [ ] **Step 1: Add a "0.2.0 addendum" section to the copied `README.md`**

Open `lib/modules/index-table-motor-sizing/0.2.0/README.md` (the file Task 1 copied from `0.1.0`). At the very top, immediately after the `# Index-Table Motor Sizing Module (`index-table-motor-sizing`)` title line, insert:

```markdown

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
```

- [ ] **Step 2: Create the 0.2.0 validation-record addendum**

Create `validation/index-table-motor-sizing/0.2.0.md`:

```markdown
# Module Validation Record — `index-table-motor-sizing` 0.2.0

Addendum to `validation/index-table-motor-sizing/0.1.0.md`, not a
re-validation. `0.2.0` changes exactly one thing, which does not touch the
underlying physics (`docs/superpowers/specs/
2026-08-18-motor-sizing-consistency-pass-design.md`): `inertia_ratio_maximum`
now resolves to a founder-directed recommended default of `10`
(`motor_sizing.index_table.inertia_ratio_recommended_maximum`, registry
`1.15.0`) rather than a required no-default value, with the check's own
exceeded-case status downgraded from `fail` to `warning` to match. This
module has no `gravity` port (zero `motion.axis.*` reuse, this project's
only mechanism module with that property), so the design doc's own
"Gravity" section does not apply here — `0.2.0` is a single-change release.

## Module Identity

- Module ID: `index-table-motor-sizing`
- Version validated: `0.2.0`
- Package content hash: see `ModuleManifest.contentHash`, sealed by
  `sealModulePackage` in
  `lib/modules/index-table-motor-sizing/0.2.0/index.ts`
- Module source-immutability hash (`expectedSourceHash`): pinned in
  `lib/modules/index-table-motor-sizing/0.2.0/package.test.ts`
  (`npm run module:source-hash -- index-table-motor-sizing 0.2.0`)
- Parameter-registry version this module's ports were released against:
  `1.15.0` (`lib/modules/index-table-motor-sizing/0.2.0/manifest.ts`)
- Release date: `2026-08-19`

## What changed from 0.1.0

1. **`inertia_ratio_maximum` repointed.** The port (same key, same
   compute/UI role) now maps to `motor_sizing.index_table.
   inertia_ratio_recommended_maximum` instead of `motor_sizing.index_table.
   inertia_ratio_maximum`. The new parameter carries a founder-directed
   default of `10` — explicitly **not** a manufacturer-sourced figure;
   neither of this module's own two primary sources (Oriental Motor Co.,
   Ltd., AutomationDirect) states a recommended inertia-ratio figure for an
   index table specifically. The original `motor_sizing.index_table.
   inertia_ratio_maximum` parameter is untouched and stays referenced by
   `0.1.0`'s own manifest.
2. **Check status downgraded.** The `inertia-ratio` check's exceeded-case
   `status` changed from `"fail"` to `"warning"` (`checks.ts`) — exceeding
   a recommended default is advisory, never blocking, unlike exceeding a
   required no-default value.
3. **Trace `ref` repointed.** The `R_Jmax` trace row (`trace.ts`) now cites
   `motor_sizing.index_table.inertia_ratio_recommended_maximum` as its
   source parameter, matching the parameter the value actually resolves
   from — keeping the trace's own source citation accurate.

**Not changed:** this module has no `gravity` port in `0.1.0` and gains
none in `0.2.0` — it is this project's only Motor Sizing module with zero
`motion.axis.*` reuse, confirmed directly in `docs/superpowers/specs/
2026-08-18-motor-sizing-consistency-pass-design.md` ("Gravity"). The
design doc's shared-infrastructure `disabledWhen` capability also has no
consumer in this module (only `belt-pulley-drive-motor-sizing` uses it).

## Regression Evidence (Not a Re-Validation)

Every reference example `validation/index-table-motor-sizing/0.1.0.md`
records — AutomationDirect's own inertia/speed worked example (through
`executeModule`), its own disclosed torque deviation, and Oriental Motor's
own partial inertia/speed worked example (kernel-level) — re-passes
unchanged under `0.2.0`, confirmed by re-running the identical test suites
(`lib/modules/index-table-motor-sizing/0.2.0/math.test.ts`,
`package.test.ts`, `automationdirect-reference-example.test.ts`,
`oriental-motor-reference-example.test.ts`,
`independent-benchmark.test.ts`) against the new version's own sealed
package. None of those fixtures ever exceeds the inertia ratio, so none of
them exercises the changed check-status branch — their continued passing
confirms the repoint is behavior-neutral for every passing scenario. The
changed branch itself (exceeding the ratio) is covered by two new tests in
`package.test.ts`: one confirming `inertia_ratio_maximum` resolves to `10`
when unset and stays overridable to any other value, and one confirming
the exceeded-case check status is `"warning"`, not `"fail"`, and the
overall computation still completes (never blocked).

## Disclosed, Non-Sourced Default

The `10` figure in `motor_sizing.index_table.
inertia_ratio_recommended_maximum` is **founder judgment, not a
manufacturer-sourced value**. Neither of this module's own two primary
sources (Oriental Motor Co., Ltd.'s General Catalog Technical Reference,
AutomationDirect's SureServo Selection Appendix) states a recommended or
required inertia-ratio figure for an index table specifically — the
`0.1.0` Stage 2 contract's own choice of "required input, no default" for
`inertia_ratio_maximum` reflected that absence
(`context/modules/index-table-motor-sizing/stage-2-contract.md`). `0.2.0`
departs from that precedent deliberately, per explicit founder direction
(`docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`
"Context"), and discloses the departure here rather than implying a source
that does not exist. `0.1.0`'s own required-no-default parameter and check
behavior are unaffected — `0.2.0` is a new, separate module version, not
an edit to a released one.

## Reviewer

- Reviewer: not applicable — this addendum changes no physics and adds no
  new formula requiring independent validation; the underlying compute
  path is identical to `0.1.0`'s own already-reviewed physics (see
  `validation/index-table-motor-sizing/0.1.0.md` "Reviewer" for that
  review). The regression evidence above (all `0.1.0` reference examples
  re-passing unchanged) is the applicable check for this addendum's own
  single change.
- Review date: `2026-08-19`

## Sign-off

- [x] The single `0.2.0` change documented above with its own regression/
      disclosure evidence
- [x] Every `0.1.0` reference example re-passes unchanged under `0.2.0`
- [x] The recommended-default's own non-manufacturer-sourced status is
      disclosed plainly, not implied to be sourced
- [x] `0.1.0` confirmed untouched (`git status --short
      lib/modules/index-table-motor-sizing/0.1.0/` prints nothing)
- [x] Released and registered as `index-table-motor-sizing@0.2.0`
      2026-08-19 (`lib/modules/registry.generated.ts`)
```

- [ ] **Step 3: Verify prose renders sensibly**

Read both files back in full to confirm no orphaned headings or duplicated version notes.

- [ ] **Step 4: Commit**

```bash
git add lib/modules/index-table-motor-sizing/0.2.0/README.md validation/index-table-motor-sizing/0.2.0.md
git commit -m "$(cat <<'EOF'
docs: index-table-motor-sizing 0.2.0 README addendum and validation record

Documents the single 0.2.0 change (recommended inertia-ratio default)
as an addendum to the unchanged 0.1.0 physics, with the regression
evidence and the recommended default's own disclosed non-sourced
status recorded explicitly. Notes explicitly that this module has no
gravity port, so the design doc's "Gravity" section does not apply.
EOF
)"
```

---

### Task 10: Final verification and progress-tracker update

**Files:**
- Modify: `context/progress-tracker.md` (edit in place — do not append a dated narrative entry, per that file's own header rule)

- [ ] **Step 1: Full verification**

Run: `npm run lint`
Expected: `0` warnings/errors on every file this plan touched. (A bare repo-root `npm run lint` may still flag the already-documented, pre-existing stale `.worktrees/unit-4-1-release/.next/dev/types/` artifact — confirmed unrelated in prior sessions; if seen, verify by linting only the files this plan changed directly.)

Run: `npm run typecheck`
Expected: `0` errors.

Run: `npx vitest run --testTimeout=30000`
Expected: every previously-passing non-DB test still passes, plus this plan's own new tests (Task 6 Step 3). DB-gated tests report as skipped without `DATABASE_URL`/`NODE_EXTRA_CA_CERTS` set — expected, not a failure.

Run: `npm run build`
Expected: builds successfully, no new routes or errors (this module has no UI route of its own beyond the generic module workspace, which needs no new wiring for a new module version).

- [ ] **Step 2: Update `context/progress-tracker.md`**

Find the most recent paragraph in the "Active work" section (the `rack-pinion-motor-sizing@0.2.0` paragraph, ending "...the only one of the five also wiring `disabledWhen`).") and add this as the next paragraph immediately after it:

```markdown

**`index-table-motor-sizing@0.2.0` shipped 2026-08-19** — the fourth of
the five module-version bumps, and the simplest: this mechanism has no
`gravity` port to begin with (zero `motion.axis.* ` reuse, this project's
only Motor Sizing module with that property), so the only change is
`inertia_ratio_maximum` repointed at `motor_sizing.index_table.
inertia_ratio_recommended_maximum` (registry `1.15.0`, default `10`), with
the check's exceeded-case status downgraded from `fail` to `warning`. The
`R_Jmax` trace row's own `ref` is repointed at the same new parameter, so
the trace's source citation still matches what the value actually resolves
from. Every `0.1.0` reference example (AutomationDirect inertia/speed and
its own disclosed torque deviation, Oriental Motor partial inertia/speed)
re-passes unchanged under `0.2.0` — the regression proof. `0.1.0` stays
released, registered, and untouched
(`validation/index-table-motor-sizing/0.1.0.md`); `0.2.0`'s own addendum
record is `validation/index-table-motor-sizing/0.2.0.md`. One more
follow-on plan remains, not yet started: `belt-pulley-drive-motor-sizing`
`0.2.0` -> `0.3.0` (the only one of the five also wiring `disabledWhen`).
```

- [ ] **Step 3: Commit**

```bash
git add context/progress-tracker.md
git commit -m "$(cat <<'EOF'
docs: record index-table-motor-sizing 0.2.0 in the progress tracker
EOF
)"
```

---

## What comes after this plan

One more plan, for the last remaining Motor Sizing module:

1. `belt-pulley-drive-motor-sizing` `0.2.0` → `0.3.0` — gets all three
   consistency-pass changes (gravity drop, recommended inertia-ratio
   default, and the `disabledWhen` wiring for its own
   `motion_mode`/`target_velocity`/`travel_distance`/
   `constant_velocity_time`/`cycle_time` fields — the one consumer of the
   shared-infrastructure plan's `disabledWhen` capability). It starts from
   `0.2.0` (already shipped 2026-08-18), not `0.1.0`, since it already has
   the native motion-cycle work that release added.

Once that lands, the shared-infrastructure consistency pass
(`docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`)
is fully complete across all five Motor Sizing Tool modules.
