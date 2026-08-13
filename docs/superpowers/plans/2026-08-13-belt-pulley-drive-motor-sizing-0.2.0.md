# Belt-Pulley Drive Motor Sizing 0.2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release `belt-pulley-drive-motor-sizing@0.2.0` — a native repeating trapezoidal motion cycle (accelerate/run/decelerate/dwell), velocity-first or distance-first input, plus `deceleration_torque` and `effective_torque` (Trms) outputs — per the approved design at `docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md`, following Stages 2-6 of the New Module Workflow (`context/ai-workflow-rules.md`). Stage 1 is already done (see "Stage 1 confirmation" below).

**Architecture:** `0.2.0` is a brand-new, fully self-contained module-version directory (`lib/modules/belt-pulley-drive-motor-sizing/0.2.0/`) that duplicates every unchanged kernel function from `0.1.0` rather than importing across version directories (module conformance's own `import-boundary` check forbids importing another module package's internals, and this project's "reproduce, don't import" reuse policy — ADR-0011 — extends naturally to a version bump: nothing under `0.1.0/` is edited, imported, or otherwise touched). New registry parameters extend the existing `motor_sizing.belt_pulley.*` group (additive, same prefix) in a new registry version.

**Tech Stack:** TypeScript, Zod, Vitest, this codebase's own module SDK (`lib/engine`), `lib/engine/mechanics` (already-released generic rigid-body physics).

---

## Stage 1 confirmation (already done this session, recorded here for the record)

Oriental Motor's own "Motor Sizing Calculations" page (`jp.oriental_motor.motor_sizing_calculations@web-2026-08-08`, the same source revision already registered in `lib/standards/engineering-sources.ts` and already page-verified against `reference/source-material/Oriental_Motor Sizing Calculators.pdf` p. 4 for a different module) states, on pp. 5-6:

- "Common Formula for All Motors" acceleration torque: `Ta = (J0*i^2+JL)*(NM/t1)` (p. 5) — the same shape `lib/engine/mechanics`' `accelerationTorque`/`angularAccelerationFromSpeedRamp` already implement, generically, not belt/pulley-specific.
- "Calculation for the Effective Load Torque (Trms) for Servo Motors and BX Series Brushless Motors" (p. 6): `Trms = sqrt(((Ta+TL)^2*t1 + TL^2*t2 + (Td-TL)^2*t3) / tf)`, alongside a labeled Speed/Torque diagram showing exactly the four-phase pattern (`t1` accelerate, `t2` run, `t3` decelerate, `t4` dwell, `tf` total cycle) the design doc specifies. **This is a generic "for all motors" formula, not belt/pulley-specific — no worked numerical example with printed per-phase torque figures appears on this page.** This confirms the design doc's formula exactly and confirms the real, disclosed Stage 4 evidence gap it already anticipated (no published worked example; release with an algebraic-identity/independent-benchmark validation only, per the design doc's own pre-approved fallback).

No new source needs registering — this is the same source revision already cited by `ball-screw-motor-sizing@0.1.0` (`validation/source-index.md`), now additionally verified on pp. 5-6 rather than only p. 4.

---

### Task 1: Stage 2 contract addendum and source-note extension

**Files:**
- Modify: `context/modules/belt-pulley-drive-motor-sizing/stage-2-contract.md`
- Modify: `lib/standards/engineering-sources.ts:385-394`

- [ ] **Step 1: Append the 0.2.0 addendum to the Stage 2 contract**

Append to the end of `context/modules/belt-pulley-drive-motor-sizing/stage-2-contract.md`:

```markdown

---

## 0.2.0 Addendum — Native Motion Profile and Duty-Cycle Torque

- Work unit: follow-on to `0.1.0`, per
  `docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md`
  and ADR-0011's own "follow-on work" note (embed motion-profile math
  natively inside each mechanism module rather than cross-module-linking
  it).
- Status: **Done, 2026-08-13.**

### Resolving the design doc's three open questions

1. **Exact new parameter IDs and port keys.** Eight new
   `motor_sizing.belt_pulley.*` parameters, extending the existing
   released group (additive, same array in `definitions.ts`, no existing
   entry edited): `motion_mode` (enum input), `deceleration_time`
   (quantity input, both modes), `dwell_time` (quantity input, optional,
   both modes), `constant_velocity_time` (quantity, dual role — see item
   2), `cycle_time` (quantity, dual role), `travel_distance` (quantity,
   dual role), `deceleration_torque` (quantity output only),
   `effective_torque` (quantity output only). `target_velocity` and
   `acceleration_time` are already-released `0.1.0` parameters, reused
   unchanged; `target_velocity` gains a new *output* port in `0.2.0` (see
   item 2), `acceleration_time` stays input-only, required in both modes.

2. **Real output port, not trace-only, for the derived side of
   `motion_mode`.** Confirmed feasible against this SDK's own precedent:
   `example-relay@0.1.0` already declares one canonical parameter ID on
   both its input and output ports of the same module
   (`lib/application/projects/manage-module-instances.test.ts`'s own
   comment on this fixture). `0.2.0` follows that precedent: `target_velocity`,
   `travel_distance`, `constant_velocity_time`, and `cycle_time` each get
   BOTH an input port (`required: false` at the manifest level; the real
   per-mode requirement is enforced by a new `input-schema.ts`
   `superRefine` rule, the same conditional-requirement pattern
   `support-bearing@0.1.0`'s own `bearing.location` split already
   established) AND an output port reusing the identical parameter ID —
   so "the module always reports both the velocity-side and
   distance-side values" (design doc) regardless of which two the
   engineer actually supplied.

3. **Registry version.** `1.14.0` (bumped from `1.13.0`; `1.13.0` added
   to `PARAMETER_REGISTRY_SUPPORTED_VERSIONS` so
   `index-table-motor-sizing@0.1.0`'s own pinned manifest target stays
   served — the same displaced-current-version step every prior registry
   bump followed, most recently `1.7.0` before `1.8.0`).

### A fourth decision the design doc left implicit: cross-version reuse policy

`0.2.0`'s own kernel (`math.ts`) duplicates every unchanged pure function
from `0.1.0`'s own `math.ts` (inertia, drive force/load torque, operating
speed, momentary/required torque) rather than importing across version
directories. Two reasons: module conformance's own `import-boundary`
check (`lib/engine/module-sdk/conformance.ts`) restricts a module package
to importing only the engine's public surface and its own files, the same
restriction that already forces every *other* module to reproduce rather
than import a sibling's formula (ADR-0011 "Reuse policy") — nothing in
that check's own design carves out an exception for "a different version
of the same module ID," so the same restriction is treated as applying
here too, conservatively; and `0.1.0` is released and immutable
(`CLAUDE.md`), so an import dependency from `0.2.0` back onto it would be
a real coupling this project's own "self-contained per version" module
history has never established as intentional. Recorded here as a real
judgment call, not asserted without reasoning.

### Released Additive Contract

Registry version: `1.14.0`. New `motor_sizing.belt_pulley.*` (8, on top
of the 24 already released in `1.12.0`): `motion_mode`,
`deceleration_time`, `dwell_time`, `constant_velocity_time`, `cycle_time`,
`travel_distance`, `deceleration_torque`, `effective_torque`. Full
definitions: `lib/engine/parameters/definitions.ts` `motorSizingBeltPulley`
(appended entries).

### Method Sources

Adds no new source: `jp.oriental_motor.motor_sizing_calculations@web-2026-08-08`
(already registered, `lib/standards/engineering-sources.ts`) is now also
cited for pp. 5-6 (acceleration/effective-torque common formulas), not
only p. 4 as before — its own intake note is extended to record this.
```

- [ ] **Step 2: Extend the existing source-revision note**

In `lib/standards/engineering-sources.ts`, find the `jp.oriental_motor.motor_sizing_calculations@web-2026-08-08` revision entry (around line 385-394). Replace its `note` field value:

Replace:
```ts
    note:
      "Access-dated intake; page-verified against the cached PDF (reference/source-material/Oriental_Motor Sizing Calculators.pdf, p. 4, 'Load Torque Calculation - Ball Screw Drive').  Capture a fixed edition/archive before a released module cites it.",
```

With:
```ts
    note:
      "Access-dated intake; page-verified against the cached PDF (reference/source-material/Oriental_Motor Sizing Calculators.pdf, p. 4, 'Load Torque Calculation - Ball Screw Drive'). Capture a fixed edition/archive before a released module cites it. Additionally verified 2026-08-13/14 (belt-pulley-drive-motor-sizing 0.2.0) against the same cached PDF, pp. 5-6, 'Acceleration Torque' (Ta = (J0*i^2+JL)*(NM/t1), the common formula for all motors) and 'Calculation for the Effective Load Torque (Trms) for Servo Motors and BX Series Brushless Motors' (Trms = sqrt(((Ta+TL)^2*t1+TL^2*t2+(Td-TL)^2*t3)/tf)) -- both generic, not belt/pulley-specific, and both formulas only, no worked numerical example on this page.",
```

Note: read the file first to confirm the exact existing whitespace/line-wrap before this replace — `Edit`'s `old_string` must match byte-for-byte.

- [ ] **Step 3: Commit**

```bash
git add context/modules/belt-pulley-drive-motor-sizing/stage-2-contract.md lib/standards/engineering-sources.ts
git commit -m "docs: resolve belt-pulley-drive-motor-sizing 0.2.0 Stage 2 open questions"
```

---

### Task 2: Registry — release `1.14.0`

**Files:**
- Modify: `lib/engine/parameters/definitions.ts:59` (version), `:1-53` (header comment), `:2928` (append to `motorSizingBeltPulley`)
- Modify: `lib/engine/parameters/registered.ts:19-33`
- Test: `lib/engine/parameters/registry.test.ts` (existing, run only)

- [ ] **Step 1: Append the 8 new parameter definitions**

In `lib/engine/parameters/definitions.ts`, replace the closing of the `motorSizingBeltPulley` array:

Replace:
```ts
  defineParameter({
    id: "motor_sizing.belt_pulley.required_power",
    displayName: "Required motor power",
    symbol: "P_req",
    definition:
      "rotationalPower(required_torque, operating_speed) -- lib/engine/units' already-released P = T*omega.",
    valueType: "quantity",
    canonicalUnit: "W",
    displayUnits: ["W", "kW", "hp"],
    range: { min: 0, unit: "W" },
    qualifiers: { bound: "required" },
  }),
];
```

With:
```ts
  defineParameter({
    id: "motor_sizing.belt_pulley.required_power",
    displayName: "Required motor power",
    symbol: "P_req",
    definition:
      "rotationalPower(required_torque, operating_speed) -- lib/engine/units' already-released P = T*omega.",
    valueType: "quantity",
    canonicalUnit: "W",
    displayUnits: ["W", "kW", "hp"],
    range: { min: 0, unit: "W" },
    qualifiers: { bound: "required" },
  }),

  // 0.2.0 additions (registry 1.14.0, stage-2-contract.md "0.2.0
  // Addendum"): a native repeating trapezoidal motion cycle (accelerate/
  // run/decelerate/dwell), velocity-first or distance-first input, and
  // deceleration/effective (RMS) torque outputs -- the follow-on work
  // ADR-0011 itself named (embed motion-profile math natively inside each
  // mechanism module, not cross-module-linked). Source: jp.oriental_motor.
  // motor_sizing_calculations@web-2026-08-08, pp. 5-6, both generic "for
  // all motors" formulas.
  defineParameter({
    id: "motor_sizing.belt_pulley.motion_mode",
    displayName: "Motion input mode",
    symbol: "mode",
    definition:
      "Which two of {target_velocity, travel_distance, constant_velocity_time, cycle_time} the engineer supplies directly, and which two the kernel derives. 'velocity': supply target_velocity and constant_velocity_time, derive travel_distance and cycle_time. 'distance': supply travel_distance and cycle_time, derive target_velocity and constant_velocity_time. Regardless of mode, all four are always reported (belt-pulley-drive-motor-sizing-0.2.0-design.md 'Input Mode').",
    valueType: "enum",
    enumId: "belt_pulley_motion_mode",
    enumOptions: ["velocity", "distance"],
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.deceleration_time",
    displayName: "Deceleration time",
    symbol: "t3",
    definition:
      "Ramp time from target_velocity back to standstill -- symmetric to acceleration_time, required in both motion modes.",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: ["s", "min"],
    range: { min: 0, unit: "s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.dwell_time",
    displayName: "Dwell time",
    symbol: "t4",
    definition:
      "Idle time between the end of deceleration and the next cycle's own acceleration phase. Contributes zero torque but counts toward cycle_time, matching how a servo's own thermal/RMS rating averages over idle time. Zero is a structural 'no dwell modeled' default, not a guessed physical value.",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: ["s", "min"],
    range: { min: 0, unit: "s" },
    defaultPolicy: { kind: "constant", value: makeQuantity(0, "s") },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.constant_velocity_time",
    displayName: "Constant-velocity (run) time",
    symbol: "t2",
    definition:
      "Duration of the constant-velocity phase between acceleration and deceleration. A required input in motion_mode='velocity'; a derived, always-reported output otherwise (cycle_time - acceleration_time - deceleration_time - dwell_time). Zero is a valid boundary case (a triangular move, no constant-speed phase), not an error.",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: ["s", "min"],
    range: { min: 0, unit: "s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.cycle_time",
    displayName: "Total cycle time",
    symbol: "tf",
    definition:
      "Total repeating-cycle duration (acceleration_time + constant_velocity_time + deceleration_time + dwell_time). A required input in motion_mode='distance'; a derived, always-reported output otherwise.",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: ["s", "min"],
    range: { min: 0, unit: "s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.travel_distance",
    displayName: "Travel distance",
    symbol: "S",
    definition:
      "Carriage travel distance over one accelerate/run/decelerate move (S = target_velocity*(acceleration_time+deceleration_time)/2 + target_velocity*constant_velocity_time). A required input in motion_mode='distance'; a derived, always-reported output otherwise.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.deceleration_torque",
    displayName: "Deceleration torque",
    symbol: "Td",
    definition:
      "Torque to decelerate total_system_inertia over deceleration_time from the motor-shaft-equivalent of target_velocity to standstill (Td = J_total*alpha_decel, magnitude) -- symmetric to acceleration_torque.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.effective_torque",
    displayName: "Effective (RMS) torque",
    symbol: "Trms",
    definition:
      "Trms = sqrt(((acceleration_torque+load_torque)^2*acceleration_time + load_torque^2*constant_velocity_time + (deceleration_torque-load_torque)^2*deceleration_time) / cycle_time) -- Oriental Motor's own generic per-phase effective-load-torque formula for continuous/thermal motor rating (jp.oriental_motor.motor_sizing_calculations, p. 6), additive to momentary_torque, not a replacement for it.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
];
```

- [ ] **Step 2: Bump the registry version and supported-versions list**

In `lib/engine/parameters/definitions.ts`, replace:
```ts
export const PARAMETER_REGISTRY_VERSION = "1.13.0";
```
With:
```ts
export const PARAMETER_REGISTRY_VERSION = "1.14.0";
```

Append to the file's own top header comment block (after the existing v1.13 sentence, before the `import` line):
```ts
// v1.14 adds 8 new motor_sizing.belt_pulley.* parameters (motion_mode,
// deceleration_time, dwell_time, constant_velocity_time, cycle_time,
// travel_distance, deceleration_torque, effective_torque) for the
// belt-pulley-drive-motor-sizing 0.2.0 release (context/modules/
// belt-pulley-drive-motor-sizing/stage-2-contract.md "0.2.0 Addendum") --
// the first module-version bump in this project. Additive only; none of
// the 24 parameters 1.12.0 already released for this module's own 0.1.0
// are edited.
```

In `lib/engine/parameters/registered.ts`, replace:
```ts
export const PARAMETER_REGISTRY_SUPPORTED_VERSIONS = [
  "1.0.0",
  "1.1.0",
  "1.2.0",
  "1.3.0",
  "1.4.0",
  "1.5.0",
  "1.6.0",
  "1.7.0",
  "1.8.0",
  "1.9.0",
  "1.10.0",
  "1.11.0",
  "1.12.0",
] as const;
```
With:
```ts
export const PARAMETER_REGISTRY_SUPPORTED_VERSIONS = [
  "1.0.0",
  "1.1.0",
  "1.2.0",
  "1.3.0",
  "1.4.0",
  "1.5.0",
  "1.6.0",
  "1.7.0",
  "1.8.0",
  "1.9.0",
  "1.10.0",
  "1.11.0",
  "1.12.0",
  "1.13.0",
] as const;
```

- [ ] **Step 3: Run the registry tests and typecheck**

Run: `npx vitest run lib/engine/parameters/ && npm run typecheck`
Expected: PASS — the registry's own invariants (uniqueness, additive-only, hash) all still hold; `index-table-motor-sizing@0.1.0`'s own pinned `1.13.0` target stays served now that it is in `PARAMETER_REGISTRY_SUPPORTED_VERSIONS`.

- [ ] **Step 4: Lint, commit**

Run: `npm run lint -- lib/engine/parameters/definitions.ts lib/engine/parameters/registered.ts`
Expected: clean.

```bash
git add lib/engine/parameters/definitions.ts lib/engine/parameters/registered.ts
git commit -m "feat: release parameter registry 1.14.0 (belt-pulley-drive-motor-sizing 0.2.0)"
```

---

### Task 3: Scaffold the `0.2.0` package — manifest, values, test-helpers

**Files:**
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/manifest.ts`
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/values.ts`
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/test-helpers.ts`

- [ ] **Step 1: Create `manifest.ts`**

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/manifest.ts`:

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

import {
  asParameterId,
  type ModuleInputPort,
  type ModuleOutputPort,
  type ModuleManifest,
  type ModulePorts,
} from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "belt-pulley-drive-motor-sizing",
  version: "0.2.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.14.0, the version that released this
  // module's own 8 new motor_sizing.belt_pulley.* parameters
  // (stage-2-contract.md "0.2.0 Addendum"). Keep this literal -- never
  // import the mutable current-version constant (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.14.0",
  category: "motor-sizing.belt-pulley-drive",
  tags: ["motor-sizing", "belt-drive", "pulley", "servo-motor", "duty-cycle"],
  workflowRoles: [],
  validityEnvelopeSummary:
    "One belt-and-pulley linear drive: one motor-driven pulley plus one idler pulley of equal pitch diameter, one rigid carriage/table rigidly attached to the belt, direct-connected or through a single fixed gear ratio. A repeating trapezoidal motion cycle (accelerate/run/decelerate/dwell), entered either velocity-first (target_velocity + constant_velocity_time, distance and cycle time derived) or distance-first (travel_distance + cycle_time, velocity and run time derived) via motion_mode. Load torque is assumed constant across all four phases (this mechanism's own physics, not an approximation across a module boundary). Horizontal, vertical, or inclined orientation (0 <= incline_angle <= 90 deg). No belt tension, belt width/pitch, tooth-shear, or wrap-angle selection, and no motor catalog matching: outputs are required specs only, checked against one engineer-supplied required-torque safety factor (>= 1) and one engineer-supplied maximum inertia ratio -- effective_torque has no pass/fail check in 0.2.0 (no universal continuous-torque acceptance criterion found for this mechanism family).",
  sourceRevisionIds: [
    asSourceRevisionId(
      "jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004",
    ),
    asSourceRevisionId(
      "us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011",
    ),
    asSourceRevisionId("jp.oriental_motor.motor_sizing_calculations@web-2026-08-08"),
  ],
};

export const ports: ModulePorts = {
  inputs: [
    // Geometry, mass, environment (reused motion.axis.* directly, unchanged from 0.1.0).
    {
      key: "orientation",
      parameterId: asParameterId("motion.axis.orientation"),
      required: true,
    },
    {
      key: "incline_angle",
      parameterId: asParameterId("motion.axis.incline_angle"),
      required: true,
    },
    {
      key: "gravity",
      parameterId: asParameterId("motion.axis.gravity"),
      required: false,
    },
    {
      key: "friction_coefficient",
      parameterId: asParameterId("motion.axis.friction_coefficient"),
      required: true,
    },
    {
      key: "total_moving_mass",
      parameterId: asParameterId("motion.axis.total_moving_mass"),
      required: true,
    },

    // Belt/pulley geometry and drive terms (unchanged from 0.1.0).
    {
      key: "pulley_pitch_diameter",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.pulley_pitch_diameter",
      ),
      required: true,
    },
    {
      key: "pulley_mass",
      parameterId: asParameterId("motor_sizing.belt_pulley.pulley_mass"),
      required: true,
    },
    {
      key: "idler_pulley_mass",
      parameterId: asParameterId("motor_sizing.belt_pulley.idler_pulley_mass"),
      required: true,
    },
    {
      key: "belt_mass",
      parameterId: asParameterId("motor_sizing.belt_pulley.belt_mass"),
      required: false,
    },
    {
      key: "gear_ratio",
      parameterId: asParameterId("motor_sizing.belt_pulley.gear_ratio"),
      required: false,
    },
    {
      key: "mechanical_efficiency",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.mechanical_efficiency",
      ),
      required: true,
    },
    {
      key: "external_force",
      parameterId: asParameterId("motor_sizing.belt_pulley.external_force"),
      required: false,
    },

    // Motion: NEW in 0.2.0 -- a repeating trapezoidal cycle, velocity-first
    // or distance-first per motion_mode. target_velocity/travel_distance/
    // constant_velocity_time/cycle_time are each optional at the manifest
    // level; ./input-schema.ts's own superRefine enforces which two are
    // actually required per mode (stage-2-contract.md "0.2.0 Addendum"
    // item 2).
    {
      key: "motion_mode",
      parameterId: asParameterId("motor_sizing.belt_pulley.motion_mode"),
      required: true,
    },
    {
      key: "target_velocity",
      parameterId: asParameterId("motor_sizing.belt_pulley.target_velocity"),
      required: false,
    },
    {
      key: "travel_distance",
      parameterId: asParameterId("motor_sizing.belt_pulley.travel_distance"),
      required: false,
    },
    {
      key: "acceleration_time",
      parameterId: asParameterId("motor_sizing.belt_pulley.acceleration_time"),
      required: true,
    },
    {
      key: "deceleration_time",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.deceleration_time",
      ),
      required: true,
    },
    {
      key: "constant_velocity_time",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.constant_velocity_time",
      ),
      required: false,
    },
    {
      key: "cycle_time",
      parameterId: asParameterId("motor_sizing.belt_pulley.cycle_time"),
      required: false,
    },
    {
      key: "dwell_time",
      parameterId: asParameterId("motor_sizing.belt_pulley.dwell_time"),
      required: false,
    },

    // Motor input (unchanged from 0.1.0).
    {
      key: "motor_rotor_inertia",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.motor_rotor_inertia",
      ),
      required: true,
    },

    // Safety-factor and limit inputs (unchanged from 0.1.0).
    {
      key: "required_torque_safety_factor",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.required_torque_safety_factor",
      ),
      required: true,
    },
    {
      key: "inertia_ratio_maximum",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.inertia_ratio_maximum",
      ),
      required: true,
    },
  ] satisfies ModuleInputPort[],
  outputs: [
    // Inertia and torque (unchanged from 0.1.0).
    {
      key: "pulley_inertia",
      parameterId: asParameterId("motor_sizing.belt_pulley.pulley_inertia"),
    },
    {
      key: "belt_inertia",
      parameterId: asParameterId("motor_sizing.belt_pulley.belt_inertia"),
    },
    {
      key: "load_inertia",
      parameterId: asParameterId("motor_sizing.belt_pulley.load_inertia"),
    },
    {
      key: "reflected_load_inertia",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.reflected_load_inertia",
      ),
    },
    {
      key: "total_system_inertia",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.total_system_inertia",
      ),
    },
    {
      key: "inertia_ratio",
      parameterId: asParameterId("motor_sizing.belt_pulley.inertia_ratio"),
    },
    {
      key: "load_torque",
      parameterId: asParameterId("motor_sizing.belt_pulley.load_torque"),
    },
    {
      key: "acceleration_torque",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.acceleration_torque",
      ),
    },
    {
      key: "momentary_torque",
      parameterId: asParameterId("motor_sizing.belt_pulley.momentary_torque"),
    },
    {
      key: "required_torque",
      parameterId: asParameterId("motor_sizing.belt_pulley.required_torque"),
    },
    {
      key: "operating_speed",
      parameterId: asParameterId("motor_sizing.belt_pulley.operating_speed"),
    },
    {
      key: "required_power",
      parameterId: asParameterId("motor_sizing.belt_pulley.required_power"),
    },

    // NEW in 0.2.0: always-reported motion-profile values (dual-role with
    // the input ports of the same key above) and the two new torque outputs.
    {
      key: "target_velocity",
      parameterId: asParameterId("motor_sizing.belt_pulley.target_velocity"),
    },
    {
      key: "travel_distance",
      parameterId: asParameterId("motor_sizing.belt_pulley.travel_distance"),
    },
    {
      key: "constant_velocity_time",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.constant_velocity_time",
      ),
    },
    {
      key: "cycle_time",
      parameterId: asParameterId("motor_sizing.belt_pulley.cycle_time"),
    },
    {
      key: "deceleration_torque",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.deceleration_torque",
      ),
    },
    {
      key: "effective_torque",
      parameterId: asParameterId("motor_sizing.belt_pulley.effective_torque"),
    },
  ] satisfies ModuleOutputPort[],
};
```

- [ ] **Step 2: Create `values.ts`** (byte-identical to 0.1.0's own, this module's local `EngineeringValue` helpers)

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/values.ts`:

```ts
// Local EngineeringValue helpers for the belt-pulley-drive-motor-sizing
// module, mirroring every other module's own values.ts. Identical to
// 0.1.0's own copy -- duplicated, not imported, per stage-2-contract.md
// "0.2.0 Addendum" cross-version reuse policy.

import type {
  EngineeringValue,
  EnumValue,
  ModuleInput,
  Quantity,
} from "@/lib/engine";

type ModuleValues = ModuleInput["values"];

/** Reads a port value as a `Quantity`, or `undefined` when absent/mismatched. */
export function quantityAt(
  values: ModuleValues,
  key: string,
): Quantity | undefined {
  const value: EngineeringValue | undefined = values[key];
  return value?.kind === "quantity" ? value : undefined;
}

/** Reads a port value as an `EnumValue`, or `undefined` when absent/mismatched. */
export function enumAt(
  values: ModuleValues,
  key: string,
): EnumValue | undefined {
  const value: EngineeringValue | undefined = values[key];
  return value?.kind === "enum" ? value : undefined;
}
```

- [ ] **Step 3: Create `test-helpers.ts`** (byte-identical to 0.1.0's own)

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/test-helpers.ts`:

```ts
// Shared test-only helpers for the belt-pulley-drive-motor-sizing 0.2.0
// module test files. Not part of the module package itself. Identical to
// 0.1.0's own copy -- duplicated, not imported.

import type { EngineeringValue, Quantity } from "@/lib/engine";

/** Narrows an `EngineeringValue` to a `Quantity`; throws otherwise (test-only). */
export function asQuantity(value: EngineeringValue): Quantity {
  if (value.kind !== "quantity") {
    throw new Error(`Expected a quantity output, got "${value.kind}".`);
  }
  return value;
}

/** A raw, untrusted module input shape, as authored in test fixtures. */
export interface RawInput {
  readonly values: Record<string, unknown>;
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS (these three files have no consumers yet, so nothing else can break).

- [ ] **Step 5: Commit**

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.2.0/manifest.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/values.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/test-helpers.ts
git commit -m "feat: scaffold belt-pulley-drive-motor-sizing 0.2.0 manifest and ports"
```

---

### Task 4: `input-schema.ts` — the `motion_mode` conditional-requirement rule

**Files:**
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/input-schema.ts`
- Test: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/input-schema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/input-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { inputSchema } from "./input-schema";

const BASE_VALUES: Record<string, unknown> = {
  orientation: { v: 1, kind: "enum", enumId: "axis_orientation", value: "horizontal" },
  incline_angle: { v: 1, kind: "quantity", value: 0, unit: "rad" },
  friction_coefficient: { v: 1, kind: "quantity", value: 0.1, unit: "ratio" },
  total_moving_mass: { v: 1, kind: "quantity", value: 50, unit: "kg" },
  pulley_pitch_diameter: { v: 1, kind: "quantity", value: 0.08, unit: "m" },
  pulley_mass: { v: 1, kind: "quantity", value: 1, unit: "kg" },
  idler_pulley_mass: { v: 1, kind: "quantity", value: 1, unit: "kg" },
  mechanical_efficiency: { v: 1, kind: "quantity", value: 0.9, unit: "ratio" },
  acceleration_time: { v: 1, kind: "quantity", value: 0.5, unit: "s" },
  deceleration_time: { v: 1, kind: "quantity", value: 0.5, unit: "s" },
  motor_rotor_inertia: { v: 1, kind: "quantity", value: 5e-3, unit: "kg*m^2" },
  required_torque_safety_factor: { v: 1, kind: "quantity", value: 2, unit: "ratio" },
  inertia_ratio_maximum: { v: 1, kind: "quantity", value: 30, unit: "ratio" },
};

function velocityModeValues(): Record<string, unknown> {
  return {
    ...BASE_VALUES,
    motion_mode: { v: 1, kind: "enum", enumId: "belt_pulley_motion_mode", value: "velocity" },
    target_velocity: { v: 1, kind: "quantity", value: 0.5, unit: "m/s" },
    constant_velocity_time: { v: 1, kind: "quantity", value: 1, unit: "s" },
  };
}

function distanceModeValues(): Record<string, unknown> {
  return {
    ...BASE_VALUES,
    motion_mode: { v: 1, kind: "enum", enumId: "belt_pulley_motion_mode", value: "distance" },
    travel_distance: { v: 1, kind: "quantity", value: 1, unit: "m" },
    cycle_time: { v: 1, kind: "quantity", value: 3, unit: "s" },
  };
}

describe("belt-pulley-drive-motor-sizing 0.2.0 input-schema", () => {
  it("accepts velocity mode with target_velocity and constant_velocity_time present", () => {
    const result = inputSchema.safeParse({ values: velocityModeValues() });
    expect(result.success).toBe(true);
  });

  it("rejects velocity mode missing constant_velocity_time", () => {
    const values = velocityModeValues();
    delete values.constant_velocity_time;
    const result = inputSchema.safeParse({ values });
    expect(result.success).toBe(false);
  });

  it("rejects velocity mode missing target_velocity", () => {
    const values = velocityModeValues();
    delete values.target_velocity;
    const result = inputSchema.safeParse({ values });
    expect(result.success).toBe(false);
  });

  it("accepts distance mode with travel_distance and cycle_time present", () => {
    const result = inputSchema.safeParse({ values: distanceModeValues() });
    expect(result.success).toBe(true);
  });

  it("rejects distance mode missing cycle_time", () => {
    const values = distanceModeValues();
    delete values.cycle_time;
    const result = inputSchema.safeParse({ values });
    expect(result.success).toBe(false);
  });

  it("rejects distance mode missing travel_distance", () => {
    const values = distanceModeValues();
    delete values.travel_distance;
    const result = inputSchema.safeParse({ values });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/modules/belt-pulley-drive-motor-sizing/0.2.0/input-schema.test.ts`
Expected: FAILS — `./input-schema` does not exist yet.

- [ ] **Step 3: Implement the schema**

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/input-schema.ts`:

```ts
// Author-provided input schema for belt-pulley-drive-motor-sizing 0.2.0.
// Extends the generic `ModuleInputSchema` with a rule the generic port
// shape cannot express: motion_mode selects which two of {target_velocity,
// travel_distance, constant_velocity_time, cycle_time} are real inputs and
// which two are purely derived/reported (all four are optional at the
// manifest level so both modes can omit the other pair) --
// docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md
// "Input Mode", the same conditional-requirement pattern
// support-bearing@0.1.0's own bearing.location split already established.

import { z } from "zod";
import { ModuleInputSchema, type ModuleInput } from "@/lib/engine";

function require(
  input: ModuleInput,
  ctx: z.RefinementCtx,
  key: string,
  mode: string,
): void {
  if (input.values[key] === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `"${key}" is required when motion_mode is "${mode}".`,
      path: ["values", key],
    });
  }
}

export const inputSchema: z.ZodType<ModuleInput> = ModuleInputSchema.superRefine(
  (input, ctx) => {
    const motionMode = input.values.motion_mode;
    if (motionMode?.kind !== "enum") {
      return;
    }
    if (motionMode.value === "velocity") {
      require(input, ctx, "target_velocity", "velocity");
      require(input, ctx, "constant_velocity_time", "velocity");
    } else if (motionMode.value === "distance") {
      require(input, ctx, "travel_distance", "distance");
      require(input, ctx, "cycle_time", "distance");
    }
  },
);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/modules/belt-pulley-drive-motor-sizing/0.2.0/input-schema.test.ts`
Expected: PASS (all 6 tests).

- [ ] **Step 5: Lint, typecheck, commit**

Run: `npm run lint -- lib/modules/belt-pulley-drive-motor-sizing/0.2.0/input-schema.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/input-schema.test.ts && npm run typecheck`
Expected: both clean.

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.2.0/input-schema.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/input-schema.test.ts
git commit -m "feat: add motion_mode conditional-requirement input schema"
```

---

### Task 5: `math.ts` kernel — duplicate 0.1.0, add motion-profile and effective torque

**Files:**
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/math.ts`
- Test: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/math.test.ts`

- [ ] **Step 1: Create `math.ts`**

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/math.ts` — every function through `resolveRequiredTorque` is byte-identical to `0.1.0`'s own `math.ts` (duplicated per stage-2-contract.md's own cross-version reuse policy, Task 1), with three new functions appended: `resolveMotionFromVelocity`, `resolveMotionFromDistance`, `resolveEffectiveTorque`.

```ts
/**
 * Pure SI-number kernel for belt-pulley-drive-motor-sizing 0.2.0. Adds a
 * native repeating trapezoidal motion cycle (resolveMotionFromVelocity /
 * resolveMotionFromDistance) and effective (RMS) torque
 * (resolveEffectiveTorque) on top of everything 0.1.0 already computes --
 * see context/modules/belt-pulley-drive-motor-sizing/stage-2-contract.md
 * "0.2.0 Addendum" and
 * docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md.
 *
 * Every function through resolveRequiredTorque is duplicated, not
 * imported, from 0.1.0's own math.ts (stage-2-contract.md "0.2.0 Addendum"
 * cross-version reuse policy) -- 0.1.0 stays released and untouched.
 *
 * Formula sources: Oriental Motor Co., Ltd., General Catalog *Technical
 * Reference* (jp.oriental_motor.general_catalog_motor_fan_sizing@
 * f-tecref-2003-2004, p. F-3); AutomationDirect, *SureServo Selection
 * Appendix* (us.automationdirect.sureservo_selection_appendix@
 * 2nd-ed-rev-b-08-2011); Oriental Motor's own "Motor Sizing Calculations"
 * page (jp.oriental_motor.motor_sizing_calculations@web-2026-08-08, pp.
 * 5-6, "Acceleration Torque" and "Calculation for the Effective Load
 * Torque (Trms)") for the two new functions.
 *
 * Values become EngineeringValues only at the module-package boundary;
 * bare numbers remain internal here, mirroring every other module's own
 * math.ts.
 */

import {
  accelerationTorque,
  angularAccelerationFromSpeedRamp,
  linearMotionInertia,
  solidCylinderInertia,
} from "@/lib/engine";

export class BeltPulleyMotorSizingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BeltPulleyMotorSizingInputError";
  }
}

function fail(message: string): never {
  throw new BeltPulleyMotorSizingInputError(message);
}

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) fail(`${name} must be finite.`);
}

function assertPositive(name: string, value: number): void {
  assertFinite(name, value);
  if (value <= 0) fail(`${name} must be positive.`);
}

function assertNonNegative(name: string, value: number): void {
  assertFinite(name, value);
  if (value < 0) fail(`${name} must not be negative.`);
}

// --- 1. Inertia -----------------------------------------------------------

export interface PulleyInertiaInput {
  readonly pulleyMassKg: number;
  readonly idlerPulleyMassKg: number;
  readonly pulleyPitchDiameterM: number;
}

export interface PulleyInertiaResult {
  readonly inertiaKgM2: number;
}

export function resolvePulleyInertia(
  input: PulleyInertiaInput,
): PulleyInertiaResult {
  assertPositive("pulleyMassKg", input.pulleyMassKg);
  assertPositive("idlerPulleyMassKg", input.idlerPulleyMassKg);
  assertPositive("pulleyPitchDiameterM", input.pulleyPitchDiameterM);

  const drive = solidCylinderInertia({
    massKg: input.pulleyMassKg,
    outerDiameterM: input.pulleyPitchDiameterM,
  }).inertiaKgM2;
  const idler = solidCylinderInertia({
    massKg: input.idlerPulleyMassKg,
    outerDiameterM: input.pulleyPitchDiameterM,
  }).inertiaKgM2;

  return { inertiaKgM2: drive + idler };
}

export interface BeltInertiaInput {
  readonly beltMassKg: number;
  readonly pulleyPitchDiameterM: number;
}

export interface BeltInertiaResult {
  readonly inertiaKgM2: number;
}

export function resolveBeltInertia(input: BeltInertiaInput): BeltInertiaResult {
  assertNonNegative("beltMassKg", input.beltMassKg);
  assertPositive("pulleyPitchDiameterM", input.pulleyPitchDiameterM);

  if (input.beltMassKg === 0) {
    return { inertiaKgM2: 0 };
  }

  return {
    inertiaKgM2: linearMotionInertia({
      massKg: input.beltMassKg,
      travelPerRevolutionM: Math.PI * input.pulleyPitchDiameterM,
    }).inertiaKgM2,
  };
}

export interface LoadInertiaInput {
  readonly pulleyInertiaKgM2: number;
  readonly beltInertiaKgM2: number;
  readonly totalMovingMassKg: number;
  readonly pulleyPitchDiameterM: number;
}

export interface LoadInertiaResult {
  readonly loadInertiaKgM2: number;
}

export function resolveLoadInertia(input: LoadInertiaInput): LoadInertiaResult {
  assertNonNegative("pulleyInertiaKgM2", input.pulleyInertiaKgM2);
  assertNonNegative("beltInertiaKgM2", input.beltInertiaKgM2);
  assertPositive("totalMovingMassKg", input.totalMovingMassKg);
  assertPositive("pulleyPitchDiameterM", input.pulleyPitchDiameterM);

  const carriageInertiaKgM2 = linearMotionInertia({
    massKg: input.totalMovingMassKg,
    travelPerRevolutionM: Math.PI * input.pulleyPitchDiameterM,
  }).inertiaKgM2;

  return {
    loadInertiaKgM2:
      input.pulleyInertiaKgM2 + input.beltInertiaKgM2 + carriageInertiaKgM2,
  };
}

export interface ReflectedLoadInertiaInput {
  readonly loadInertiaKgM2: number;
  readonly gearRatio: number;
}

export interface ReflectedLoadInertiaResult {
  readonly reflectedLoadInertiaKgM2: number;
}

export function resolveReflectedLoadInertia(
  input: ReflectedLoadInertiaInput,
): ReflectedLoadInertiaResult {
  assertNonNegative("loadInertiaKgM2", input.loadInertiaKgM2);
  assertPositive("gearRatio", input.gearRatio);

  return {
    reflectedLoadInertiaKgM2: input.loadInertiaKgM2 / input.gearRatio ** 2,
  };
}

export interface TotalSystemInertiaInput {
  readonly motorRotorInertiaKgM2: number;
  readonly reflectedLoadInertiaKgM2: number;
}

export interface TotalSystemInertiaResult {
  readonly totalSystemInertiaKgM2: number;
}

export function resolveTotalSystemInertia(
  input: TotalSystemInertiaInput,
): TotalSystemInertiaResult {
  assertPositive("motorRotorInertiaKgM2", input.motorRotorInertiaKgM2);
  assertNonNegative("reflectedLoadInertiaKgM2", input.reflectedLoadInertiaKgM2);

  return {
    totalSystemInertiaKgM2:
      input.motorRotorInertiaKgM2 + input.reflectedLoadInertiaKgM2,
  };
}

export interface InertiaRatioInput {
  readonly reflectedLoadInertiaKgM2: number;
  readonly motorRotorInertiaKgM2: number;
}

export interface InertiaRatioResult {
  readonly inertiaRatio: number;
}

export function resolveInertiaRatio(
  input: InertiaRatioInput,
): InertiaRatioResult {
  assertNonNegative("reflectedLoadInertiaKgM2", input.reflectedLoadInertiaKgM2);
  assertPositive("motorRotorInertiaKgM2", input.motorRotorInertiaKgM2);

  return {
    inertiaRatio: input.reflectedLoadInertiaKgM2 / input.motorRotorInertiaKgM2,
  };
}

// --- 2. Force and load torque ----------------------------------------------

export interface DriveForceInput {
  readonly externalForceN: number;
  readonly totalMovingMassKg: number;
  readonly gravityMps2: number;
  readonly inclineAngleRad: number;
  readonly frictionCoefficient: number;
}

export interface DriveForceResult {
  readonly forceN: number;
}

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

export interface LoadTorqueInput {
  readonly forceN: number;
  readonly pulleyPitchDiameterM: number;
  readonly mechanicalEfficiency: number;
  readonly gearRatio: number;
}

export interface LoadTorqueResult {
  readonly loadTorqueNm: number;
}

export function resolveLoadTorque(input: LoadTorqueInput): LoadTorqueResult {
  assertFinite("forceN", input.forceN);
  assertPositive("pulleyPitchDiameterM", input.pulleyPitchDiameterM);
  assertFinite("mechanicalEfficiency", input.mechanicalEfficiency);
  if (input.mechanicalEfficiency <= 0 || input.mechanicalEfficiency > 1) {
    fail("mechanicalEfficiency must be greater than 0 and at most 1.");
  }
  assertPositive("gearRatio", input.gearRatio);

  return {
    loadTorqueNm:
      (input.forceN * input.pulleyPitchDiameterM) /
      (2 * input.mechanicalEfficiency * input.gearRatio),
  };
}

// --- 3. Operating speed and acceleration torque ----------------------------

export interface OperatingSpeedInput {
  readonly targetVelocityMps: number;
  readonly pulleyPitchDiameterM: number;
  readonly gearRatio: number;
}

export interface OperatingSpeedResult {
  readonly operatingSpeedRadPerS: number;
}

export function resolveOperatingSpeed(
  input: OperatingSpeedInput,
): OperatingSpeedResult {
  assertPositive("targetVelocityMps", input.targetVelocityMps);
  assertPositive("pulleyPitchDiameterM", input.pulleyPitchDiameterM);
  assertPositive("gearRatio", input.gearRatio);

  const pulleySpeedRadPerS =
    input.targetVelocityMps / (input.pulleyPitchDiameterM / 2);

  return { operatingSpeedRadPerS: pulleySpeedRadPerS * input.gearRatio };
}

// --- 4. Momentary and required torque ---------------------------------------

export interface MomentaryTorqueInput {
  readonly accelerationTorqueNm: number;
  readonly loadTorqueNm: number;
}

export interface MomentaryTorqueResult {
  readonly momentaryTorqueNm: number;
}

export function resolveMomentaryTorque(
  input: MomentaryTorqueInput,
): MomentaryTorqueResult {
  assertNonNegative("accelerationTorqueNm", input.accelerationTorqueNm);
  assertNonNegative("loadTorqueNm", input.loadTorqueNm);

  return {
    momentaryTorqueNm: input.accelerationTorqueNm + input.loadTorqueNm,
  };
}

export interface RequiredTorqueInput {
  readonly computedTorqueNm: number;
  readonly safetyFactor: number;
}

export interface RequiredTorqueResult {
  readonly requiredTorqueNm: number;
}

export function resolveRequiredTorque(
  input: RequiredTorqueInput,
): RequiredTorqueResult {
  assertNonNegative("computedTorqueNm", input.computedTorqueNm);
  assertFinite("safetyFactor", input.safetyFactor);
  if (input.safetyFactor < 1) {
    fail("safetyFactor must be at least 1.");
  }

  return {
    requiredTorqueNm: input.computedTorqueNm * input.safetyFactor,
  };
}

// --- 5. Motion profile (NEW in 0.2.0) ---------------------------------------

export interface MotionFromVelocityInput {
  /** Commanded steady-state carriage velocity, in m/s. Must be > 0. */
  readonly targetVelocityMps: number;
  /** Acceleration time, in s. Must be > 0. */
  readonly accelerationTimeS: number;
  /** Deceleration time, in s. Must be > 0. */
  readonly decelerationTimeS: number;
  /** Constant-velocity (run) time, in s. Must be >= 0 (0 is a valid triangular-move boundary case). */
  readonly constantVelocityTimeS: number;
  /** Dwell time, in s. Must be >= 0. */
  readonly dwellTimeS: number;
}

export interface MotionFromVelocityResult {
  readonly travelDistanceM: number;
  readonly cycleTimeS: number;
}

/**
 * Velocity-first motion derivation: `S = V*(t1+t3)/2 + V*t2`,
 * `tf = t1+t2+t3+t4` (belt-pulley-drive-motor-sizing-0.2.0-design.md
 * "Input Mode").
 */
export function resolveMotionFromVelocity(
  input: MotionFromVelocityInput,
): MotionFromVelocityResult {
  assertPositive("targetVelocityMps", input.targetVelocityMps);
  assertPositive("accelerationTimeS", input.accelerationTimeS);
  assertPositive("decelerationTimeS", input.decelerationTimeS);
  assertNonNegative("constantVelocityTimeS", input.constantVelocityTimeS);
  assertNonNegative("dwellTimeS", input.dwellTimeS);

  const travelDistanceM =
    (input.targetVelocityMps *
      (input.accelerationTimeS + input.decelerationTimeS)) /
      2 +
    input.targetVelocityMps * input.constantVelocityTimeS;
  const cycleTimeS =
    input.accelerationTimeS +
    input.constantVelocityTimeS +
    input.decelerationTimeS +
    input.dwellTimeS;

  return { travelDistanceM, cycleTimeS };
}

export interface MotionFromDistanceInput {
  /** Carriage travel distance, in m. Must be > 0. */
  readonly travelDistanceM: number;
  /** Acceleration time, in s. Must be > 0. */
  readonly accelerationTimeS: number;
  /** Deceleration time, in s. Must be > 0. */
  readonly decelerationTimeS: number;
  /** Total repeating-cycle duration, in s. Must be > 0. */
  readonly cycleTimeS: number;
  /** Dwell time, in s. Must be >= 0. */
  readonly dwellTimeS: number;
}

export interface MotionFromDistanceResult {
  readonly targetVelocityMps: number;
  readonly constantVelocityTimeS: number;
}

/**
 * Distance-first motion derivation: `t2 = tf - t1 - t3 - t4`,
 * `V = S / (t2 + (t1+t3)/2)`
 * (belt-pulley-drive-motor-sizing-0.2.0-design.md "Input Mode"). Throws
 * `BeltPulleyMotorSizingInputError` -- a feasibility check, not an
 * acceptance check (the design doc's own wording) -- when the requested
 * cycle_time is too short for the given accel/decel times to cover the
 * travel distance (`t2 < 0`). `t2 = 0` is a valid boundary case (a
 * triangular move), not an error.
 */
export function resolveMotionFromDistance(
  input: MotionFromDistanceInput,
): MotionFromDistanceResult {
  assertPositive("travelDistanceM", input.travelDistanceM);
  assertPositive("accelerationTimeS", input.accelerationTimeS);
  assertPositive("decelerationTimeS", input.decelerationTimeS);
  assertPositive("cycleTimeS", input.cycleTimeS);
  assertNonNegative("dwellTimeS", input.dwellTimeS);

  const constantVelocityTimeS =
    input.cycleTimeS -
    input.accelerationTimeS -
    input.decelerationTimeS -
    input.dwellTimeS;
  if (constantVelocityTimeS < 0) {
    fail(
      "cycle_time is too short for the given acceleration_time, deceleration_time, and dwell_time to fit within it (derived constant_velocity_time would be negative).",
    );
  }

  const targetVelocityMps =
    input.travelDistanceM /
    (constantVelocityTimeS +
      (input.accelerationTimeS + input.decelerationTimeS) / 2);

  return { targetVelocityMps, constantVelocityTimeS };
}

// --- 6. Effective (RMS) torque (NEW in 0.2.0) -------------------------------

export interface EffectiveTorqueInput {
  /** Acceleration torque, in N*m. Must be >= 0. */
  readonly accelerationTorqueNm: number;
  /** Load torque, in N*m. Must be >= 0. */
  readonly loadTorqueNm: number;
  /** Deceleration torque, in N*m. Must be >= 0. */
  readonly decelerationTorqueNm: number;
  /** Acceleration time, in s. Must be > 0. */
  readonly accelerationTimeS: number;
  /** Constant-velocity time, in s. Must be >= 0. */
  readonly constantVelocityTimeS: number;
  /** Deceleration time, in s. Must be > 0. */
  readonly decelerationTimeS: number;
  /** Total cycle time, in s. Must be > 0. */
  readonly cycleTimeS: number;
}

export interface EffectiveTorqueResult {
  readonly effectiveTorqueNm: number;
}

/**
 * `Trms = sqrt(((Ta+TL)^2*t1 + TL^2*t2 + (Td-TL)^2*t3) / tf)` -- Oriental
 * Motor's own generic per-phase effective-load-torque formula
 * (jp.oriental_motor.motor_sizing_calculations, p. 6). Dwell time
 * contributes zero torque but counts toward `tf` (already folded into
 * `cycleTimeS`) -- matching how a servo's own thermal/RMS rating averages
 * over idle time too.
 */
export function resolveEffectiveTorque(
  input: EffectiveTorqueInput,
): EffectiveTorqueResult {
  assertNonNegative("accelerationTorqueNm", input.accelerationTorqueNm);
  assertNonNegative("loadTorqueNm", input.loadTorqueNm);
  assertNonNegative("decelerationTorqueNm", input.decelerationTorqueNm);
  assertPositive("accelerationTimeS", input.accelerationTimeS);
  assertNonNegative("constantVelocityTimeS", input.constantVelocityTimeS);
  assertPositive("decelerationTimeS", input.decelerationTimeS);
  assertPositive("cycleTimeS", input.cycleTimeS);

  const accelTerm =
    (input.accelerationTorqueNm + input.loadTorqueNm) ** 2 *
    input.accelerationTimeS;
  const runTerm = input.loadTorqueNm ** 2 * input.constantVelocityTimeS;
  const decelTerm =
    (input.decelerationTorqueNm - input.loadTorqueNm) ** 2 *
    input.decelerationTimeS;

  return {
    effectiveTorqueNm: Math.sqrt(
      (accelTerm + runTerm + decelTerm) / input.cycleTimeS,
    ),
  };
}

// Re-exported for callers that need lib/engine/mechanics directly without
// importing it themselves (compute.ts, math.test.ts).
export { accelerationTorque, angularAccelerationFromSpeedRamp };
```

- [ ] **Step 2: Write `math.test.ts`** — every 0.1.0 test case, unchanged (proving the duplicated functions still behave identically), plus new tests for the three new functions

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/math.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BeltPulleyMotorSizingInputError } from "./math";
import {
  accelerationTorque,
  angularAccelerationFromSpeedRamp,
  resolveBeltInertia,
  resolveDriveForce,
  resolveEffectiveTorque,
  resolveInertiaRatio,
  resolveLoadInertia,
  resolveLoadTorque,
  resolveMomentaryTorque,
  resolveMotionFromDistance,
  resolveMotionFromVelocity,
  resolveOperatingSpeed,
  resolvePulleyInertia,
  resolveReflectedLoadInertia,
  resolveRequiredTorque,
  resolveTotalSystemInertia,
} from "./math";

const G = 9.80665;

// --- 1. Inertia --------------------------------------------------------------

describe("resolvePulleyInertia", () => {
  it("returns (1/8)*(M_drive+M_idler)*D^2, matching lib/engine/mechanics directly", () => {
    const { inertiaKgM2 } = resolvePulleyInertia({
      pulleyMassKg: 1,
      idlerPulleyMassKg: 1.5,
      pulleyPitchDiameterM: 0.1,
    });
    expect(inertiaKgM2).toBeCloseTo(
      (1 * 0.1 ** 2) / 8 + (1.5 * 0.1 ** 2) / 8,
      15,
    );
  });

  it("rejects a non-positive pulley mass or diameter", () => {
    expect(() =>
      resolvePulleyInertia({
        pulleyMassKg: 0,
        idlerPulleyMassKg: 1,
        pulleyPitchDiameterM: 0.1,
      }),
    ).toThrow(BeltPulleyMotorSizingInputError);
  });
});

describe("resolveBeltInertia", () => {
  it("returns M_belt*(D/2)^2 for a nonzero belt mass", () => {
    const { inertiaKgM2 } = resolveBeltInertia({
      beltMassKg: 3,
      pulleyPitchDiameterM: 0.1,
    });
    expect(inertiaKgM2).toBeCloseTo(3 * (0.1 / 2) ** 2, 12);
  });

  it("returns exactly 0 when belt mass is 0", () => {
    const { inertiaKgM2 } = resolveBeltInertia({
      beltMassKg: 0,
      pulleyPitchDiameterM: 0.1,
    });
    expect(inertiaKgM2).toBe(0);
  });
});

describe("resolveLoadInertia / resolveReflectedLoadInertia / resolveTotalSystemInertia / resolveInertiaRatio", () => {
  it("composes pulley + belt + carriage, reflects by i^2, adds motor rotor inertia, and ratios", () => {
    const { loadInertiaKgM2 } = resolveLoadInertia({
      pulleyInertiaKgM2: 1e-4,
      beltInertiaKgM2: 2e-5,
      totalMovingMassKg: 50,
      pulleyPitchDiameterM: 0.08,
    });
    expect(loadInertiaKgM2).toBeCloseTo(1e-4 + 2e-5 + 50 * (0.08 / 2) ** 2, 12);

    const { reflectedLoadInertiaKgM2 } = resolveReflectedLoadInertia({
      loadInertiaKgM2: 0.08,
      gearRatio: 4,
    });
    expect(reflectedLoadInertiaKgM2).toBeCloseTo(0.08 / 16, 12);

    const { totalSystemInertiaKgM2 } = resolveTotalSystemInertia({
      motorRotorInertiaKgM2: 1e-4,
      reflectedLoadInertiaKgM2,
    });
    expect(totalSystemInertiaKgM2).toBeCloseTo(1e-4 + 0.08 / 16, 12);

    const { inertiaRatio } = resolveInertiaRatio({
      reflectedLoadInertiaKgM2,
      motorRotorInertiaKgM2: 1e-4,
    });
    expect(inertiaRatio).toBeCloseTo(0.08 / 16 / 1e-4, 6);
  });
});

// --- 2. Force and load torque -------------------------------------------------

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

    const { loadTorqueNm } = resolveLoadTorque({
      forceN: 100,
      pulleyPitchDiameterM: 0.08,
      mechanicalEfficiency: 0.9,
      gearRatio: 2,
    });
    expect(loadTorqueNm).toBeCloseTo((100 * 0.08) / (2 * 0.9 * 2), 9);
  });

  it("rejects mechanical efficiency outside (0, 1]", () => {
    expect(() =>
      resolveLoadTorque({
        forceN: 10,
        pulleyPitchDiameterM: 0.1,
        mechanicalEfficiency: 1.1,
        gearRatio: 1,
      }),
    ).toThrow(BeltPulleyMotorSizingInputError);
  });
});

// --- 3. Operating speed and acceleration torque -------------------------------

describe("resolveOperatingSpeed", () => {
  it("computes omega_pulley = V/(D/2), then scales by gear ratio", () => {
    const { operatingSpeedRadPerS } = resolveOperatingSpeed({
      targetVelocityMps: 0.5,
      pulleyPitchDiameterM: 0.1,
      gearRatio: 1,
    });
    expect(operatingSpeedRadPerS).toBeCloseTo(0.5 / 0.05, 9);
  });
});

describe("operating speed + angularAccelerationFromSpeedRamp + accelerationTorque, combined", () => {
  it("computes a positive acceleration torque for a real accelerate-to-speed ramp", () => {
    const { operatingSpeedRadPerS } = resolveOperatingSpeed({
      targetVelocityMps: 0.5,
      pulleyPitchDiameterM: 0.08,
      gearRatio: 1,
    });
    const { angularAccelerationRadPerS2 } = angularAccelerationFromSpeedRamp({
      angularVelocityChangeRadPerS: operatingSpeedRadPerS,
      rampTimeS: 2,
    });
    const { torqueNm } = accelerationTorque({
      inertiaKgM2: 0.02,
      angularAccelerationRadPerS2,
    });
    expect(torqueNm).toBeCloseTo(0.02 * (operatingSpeedRadPerS / 2), 12);
  });
});

// --- 4. Momentary and required torque -------------------------------------------

describe("resolveMomentaryTorque / resolveRequiredTorque", () => {
  it("T1 = Ta+TL; T_req = T1*Sf", () => {
    expect(
      resolveMomentaryTorque({ accelerationTorqueNm: 5, loadTorqueNm: 12.2 })
        .momentaryTorqueNm,
    ).toBeCloseTo(17.2, 9);
    expect(
      resolveRequiredTorque({ computedTorqueNm: 17.2, safetyFactor: 2.5 })
        .requiredTorqueNm,
    ).toBeCloseTo(43, 9);
  });

  it("rejects a safety factor below 1", () => {
    expect(() =>
      resolveRequiredTorque({ computedTorqueNm: 17.2, safetyFactor: 0.9 }),
    ).toThrow(BeltPulleyMotorSizingInputError);
  });
});

// --- 5. Motion profile (NEW) ----------------------------------------------------

describe("resolveMotionFromVelocity", () => {
  it("S = V*(t1+t3)/2 + V*t2; tf = t1+t2+t3+t4", () => {
    const { travelDistanceM, cycleTimeS } = resolveMotionFromVelocity({
      targetVelocityMps: 2,
      accelerationTimeS: 1,
      decelerationTimeS: 1,
      constantVelocityTimeS: 3,
      dwellTimeS: 0.5,
    });
    expect(travelDistanceM).toBeCloseTo((2 * (1 + 1)) / 2 + 2 * 3, 12);
    expect(cycleTimeS).toBeCloseTo(1 + 3 + 1 + 0.5, 12);
  });

  it("handles constantVelocityTimeS = 0 (a triangular move) as a valid boundary case, not an error", () => {
    expect(() =>
      resolveMotionFromVelocity({
        targetVelocityMps: 2,
        accelerationTimeS: 1,
        decelerationTimeS: 1,
        constantVelocityTimeS: 0,
        dwellTimeS: 0,
      }),
    ).not.toThrow();
  });

  it("rejects a non-positive target velocity or accel/decel time", () => {
    expect(() =>
      resolveMotionFromVelocity({
        targetVelocityMps: 0,
        accelerationTimeS: 1,
        decelerationTimeS: 1,
        constantVelocityTimeS: 1,
        dwellTimeS: 0,
      }),
    ).toThrow(BeltPulleyMotorSizingInputError);
  });
});

describe("resolveMotionFromDistance", () => {
  it("t2 = tf-t1-t3-t4; V = S/(t2+(t1+t3)/2) -- round-trips resolveMotionFromVelocity", () => {
    const forward = resolveMotionFromVelocity({
      targetVelocityMps: 2,
      accelerationTimeS: 1,
      decelerationTimeS: 1,
      constantVelocityTimeS: 3,
      dwellTimeS: 0.5,
    });
    const backward = resolveMotionFromDistance({
      travelDistanceM: forward.travelDistanceM,
      accelerationTimeS: 1,
      decelerationTimeS: 1,
      cycleTimeS: forward.cycleTimeS,
      dwellTimeS: 0.5,
    });
    expect(backward.targetVelocityMps).toBeCloseTo(2, 9);
    expect(backward.constantVelocityTimeS).toBeCloseTo(3, 9);
  });

  it("t2 = 0 is a valid boundary case (a triangular move), not an error", () => {
    const result = resolveMotionFromDistance({
      travelDistanceM: 1,
      accelerationTimeS: 1,
      decelerationTimeS: 1,
      cycleTimeS: 2,
      dwellTimeS: 0,
    });
    expect(result.constantVelocityTimeS).toBeCloseTo(0, 12);
    expect(result.targetVelocityMps).toBeCloseTo(1, 9);
  });

  it("throws BeltPulleyMotorSizingInputError (a feasibility check) when cycle_time is too short (derived t2 < 0)", () => {
    expect(() =>
      resolveMotionFromDistance({
        travelDistanceM: 1,
        accelerationTimeS: 1,
        decelerationTimeS: 1,
        cycleTimeS: 1,
        dwellTimeS: 0,
      }),
    ).toThrow(BeltPulleyMotorSizingInputError);
  });

  it("rejects a non-positive travel distance, accel/decel time, or cycle time", () => {
    expect(() =>
      resolveMotionFromDistance({
        travelDistanceM: 0,
        accelerationTimeS: 1,
        decelerationTimeS: 1,
        cycleTimeS: 3,
        dwellTimeS: 0,
      }),
    ).toThrow(BeltPulleyMotorSizingInputError);
  });
});

// --- 6. Effective (RMS) torque (NEW) ---------------------------------------------

describe("resolveEffectiveTorque", () => {
  it("Trms = sqrt(((Ta+TL)^2*t1 + TL^2*t2 + (Td-TL)^2*t3) / tf)", () => {
    const Ta = 5;
    const TL = 2;
    const Td = 4;
    const t1 = 1;
    const t2 = 3;
    const t3 = 1;
    const t4 = 0.5;
    const tf = t1 + t2 + t3 + t4;
    const { effectiveTorqueNm } = resolveEffectiveTorque({
      accelerationTorqueNm: Ta,
      loadTorqueNm: TL,
      decelerationTorqueNm: Td,
      accelerationTimeS: t1,
      constantVelocityTimeS: t2,
      decelerationTimeS: t3,
      cycleTimeS: tf,
    });
    const expected = Math.sqrt(
      ((Ta + TL) ** 2 * t1 + TL ** 2 * t2 + (Td - TL) ** 2 * t3) / tf,
    );
    expect(effectiveTorqueNm).toBeCloseTo(expected, 12);
  });

  it("equals momentary_torque's own peak component when run time is 0 and accel/decel are symmetric (Ta=Td, no run phase)", () => {
    const { effectiveTorqueNm } = resolveEffectiveTorque({
      accelerationTorqueNm: 5,
      loadTorqueNm: 2,
      decelerationTorqueNm: 5,
      accelerationTimeS: 1,
      constantVelocityTimeS: 0,
      decelerationTimeS: 1,
      cycleTimeS: 2,
    });
    // With t2=0 and Td=Ta: Trms = sqrt(((Ta+TL)^2*1 + (Ta-TL)^2*1)/2).
    const expected = Math.sqrt(((5 + 2) ** 2 * 1 + (5 - 2) ** 2 * 1) / 2);
    expect(effectiveTorqueNm).toBeCloseTo(expected, 12);
  });

  it("increases when dwell time (folded into cycleTimeS) increases with everything else held fixed", () => {
    const shortCycle = resolveEffectiveTorque({
      accelerationTorqueNm: 5,
      loadTorqueNm: 2,
      decelerationTorqueNm: 5,
      accelerationTimeS: 1,
      constantVelocityTimeS: 1,
      decelerationTimeS: 1,
      cycleTimeS: 3,
    });
    const longCycle = resolveEffectiveTorque({
      accelerationTorqueNm: 5,
      loadTorqueNm: 2,
      decelerationTorqueNm: 5,
      accelerationTimeS: 1,
      constantVelocityTimeS: 1,
      decelerationTimeS: 1,
      cycleTimeS: 6,
    });
    // A longer tf with the same numerator (dwell adds zero torque but
    // extends tf) lowers Trms -- more idle time to average over.
    expect(longCycle.effectiveTorqueNm).toBeLessThan(
      shortCycle.effectiveTorqueNm,
    );
  });

  it("rejects a non-positive acceleration_time, deceleration_time, or cycle_time", () => {
    expect(() =>
      resolveEffectiveTorque({
        accelerationTorqueNm: 5,
        loadTorqueNm: 2,
        decelerationTorqueNm: 5,
        accelerationTimeS: 0,
        constantVelocityTimeS: 1,
        decelerationTimeS: 1,
        cycleTimeS: 3,
      }),
    ).toThrow(BeltPulleyMotorSizingInputError);
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run lib/modules/belt-pulley-drive-motor-sizing/0.2.0/math.test.ts`
Expected: PASS (all tests).

- [ ] **Step 4: Lint, typecheck, commit**

Run: `npm run lint -- lib/modules/belt-pulley-drive-motor-sizing/0.2.0/math.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/math.test.ts && npm run typecheck`
Expected: both clean.

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.2.0/math.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/math.test.ts
git commit -m "feat: add belt-pulley-drive-motor-sizing 0.2.0 kernel (motion profile, effective torque)"
```

---

### Task 6: `compute.ts` — wire the motion-mode branch and new outputs

**Files:**
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/compute.ts`
- Depends on: `checks.ts` and `trace.ts` from Task 7 (write this file's imports now; Task 7 makes them resolve)

- [ ] **Step 1: Create `compute.ts`**

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/compute.ts`:

```ts
// Pure, deterministic compute function for belt-pulley-drive-motor-sizing
// 0.2.0. Branches on motion_mode to resolve the repeating trapezoidal
// motion cycle (velocity-first or distance-first), then computes
// everything 0.1.0 already computes plus deceleration_torque and
// effective_torque -- see
// docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md.

import {
  accelerationTorque,
  angularAccelerationFromSpeedRamp,
  makeQuantity,
  rotationalPower,
  type ModuleComputation,
  type ModuleInput,
  type Quantity,
} from "@/lib/engine";
import {
  resolveBeltInertia,
  resolveDriveForce,
  resolveEffectiveTorque,
  resolveInertiaRatio,
  resolveLoadInertia,
  resolveLoadTorque,
  resolveMomentaryTorque,
  resolveMotionFromDistance,
  resolveMotionFromVelocity,
  resolveOperatingSpeed,
  resolvePulleyInertia,
  resolveReflectedLoadInertia,
  resolveRequiredTorque,
  resolveTotalSystemInertia,
} from "./math";
import { buildChecks } from "./checks";
import { buildTrace } from "./trace";
import { enumAt, quantityAt } from "./values";

export function compute(input: ModuleInput): ModuleComputation {
  const values = input.values;

  const inclineAngle = quantityAt(values, "incline_angle");
  const gravity = quantityAt(values, "gravity");
  const frictionCoefficient = quantityAt(values, "friction_coefficient");
  const totalMovingMass = quantityAt(values, "total_moving_mass");
  const pulleyPitchDiameter = quantityAt(values, "pulley_pitch_diameter");
  const pulleyMass = quantityAt(values, "pulley_mass");
  const idlerPulleyMass = quantityAt(values, "idler_pulley_mass");
  const beltMass = quantityAt(values, "belt_mass");
  const gearRatio = quantityAt(values, "gear_ratio");
  const mechanicalEfficiency = quantityAt(values, "mechanical_efficiency");
  const externalForce = quantityAt(values, "external_force");
  const orientation = enumAt(values, "orientation");
  const motionMode = enumAt(values, "motion_mode");
  const accelerationTime = quantityAt(values, "acceleration_time");
  const decelerationTime = quantityAt(values, "deceleration_time");
  const dwellTime = quantityAt(values, "dwell_time");
  const motorRotorInertia = quantityAt(values, "motor_rotor_inertia");
  const requiredTorqueSafetyFactor = quantityAt(
    values,
    "required_torque_safety_factor",
  );
  const inertiaRatioMaximum = quantityAt(values, "inertia_ratio_maximum");

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

  // --- Motion profile (NEW in 0.2.0): velocity-first or distance-first ----

  let targetVelocityMps: number;
  let travelDistanceM: number;
  let constantVelocityTimeS: number;
  let cycleTimeS: number;

  if (motionMode.value === "velocity") {
    const targetVelocity = quantityAt(values, "target_velocity");
    const constantVelocityTime = quantityAt(values, "constant_velocity_time");
    if (targetVelocity === undefined || constantVelocityTime === undefined) {
      throw new Error(
        "belt-pulley-drive-motor-sizing requires target_velocity and constant_velocity_time when motion_mode is \"velocity\".",
      );
    }
    const derived = resolveMotionFromVelocity({
      targetVelocityMps: targetVelocity.value,
      accelerationTimeS: accelerationTime.value,
      decelerationTimeS: decelerationTime.value,
      constantVelocityTimeS: constantVelocityTime.value,
      dwellTimeS: dwellTime.value,
    });
    targetVelocityMps = targetVelocity.value;
    constantVelocityTimeS = constantVelocityTime.value;
    travelDistanceM = derived.travelDistanceM;
    cycleTimeS = derived.cycleTimeS;
  } else {
    const travelDistance = quantityAt(values, "travel_distance");
    const cycleTime = quantityAt(values, "cycle_time");
    if (travelDistance === undefined || cycleTime === undefined) {
      throw new Error(
        "belt-pulley-drive-motor-sizing requires travel_distance and cycle_time when motion_mode is \"distance\".",
      );
    }
    const derived = resolveMotionFromDistance({
      travelDistanceM: travelDistance.value,
      accelerationTimeS: accelerationTime.value,
      decelerationTimeS: decelerationTime.value,
      cycleTimeS: cycleTime.value,
      dwellTimeS: dwellTime.value,
    });
    targetVelocityMps = derived.targetVelocityMps;
    constantVelocityTimeS = derived.constantVelocityTimeS;
    travelDistanceM = travelDistance.value;
    cycleTimeS = cycleTime.value;
  }

  // --- Inertia (unchanged from 0.1.0) --------------------------------------

  const { inertiaKgM2: pulleyInertiaKgM2 } = resolvePulleyInertia({
    pulleyMassKg: pulleyMass.value,
    idlerPulleyMassKg: idlerPulleyMass.value,
    pulleyPitchDiameterM: pulleyPitchDiameter.value,
  });
  const { inertiaKgM2: beltInertiaKgM2 } = resolveBeltInertia({
    beltMassKg: beltMass.value,
    pulleyPitchDiameterM: pulleyPitchDiameter.value,
  });
  const { loadInertiaKgM2 } = resolveLoadInertia({
    pulleyInertiaKgM2,
    beltInertiaKgM2,
    totalMovingMassKg: totalMovingMass.value,
    pulleyPitchDiameterM: pulleyPitchDiameter.value,
  });
  const { reflectedLoadInertiaKgM2 } = resolveReflectedLoadInertia({
    loadInertiaKgM2,
    gearRatio: gearRatio.value,
  });
  const { totalSystemInertiaKgM2 } = resolveTotalSystemInertia({
    motorRotorInertiaKgM2: motorRotorInertia.value,
    reflectedLoadInertiaKgM2,
  });
  const { inertiaRatio } = resolveInertiaRatio({
    reflectedLoadInertiaKgM2,
    motorRotorInertiaKgM2: motorRotorInertia.value,
  });

  // --- Drive force and load torque (unchanged from 0.1.0) -------------------

  const { forceN } = resolveDriveForce({
    externalForceN: externalForce.value,
    totalMovingMassKg: totalMovingMass.value,
    gravityMps2: gravity.value,
    inclineAngleRad: inclineAngle.value,
    frictionCoefficient: frictionCoefficient.value,
  });
  const { loadTorqueNm } = resolveLoadTorque({
    forceN,
    pulleyPitchDiameterM: pulleyPitchDiameter.value,
    mechanicalEfficiency: mechanicalEfficiency.value,
    gearRatio: gearRatio.value,
  });

  // --- Operating speed, acceleration torque, deceleration torque -----------

  const { operatingSpeedRadPerS } = resolveOperatingSpeed({
    targetVelocityMps,
    pulleyPitchDiameterM: pulleyPitchDiameter.value,
    gearRatio: gearRatio.value,
  });
  const { angularAccelerationRadPerS2: accelRadPerS2 } =
    angularAccelerationFromSpeedRamp({
      angularVelocityChangeRadPerS: operatingSpeedRadPerS,
      rampTimeS: accelerationTime.value,
    });
  const { torqueNm: accelerationTorqueNm } = accelerationTorque({
    inertiaKgM2: totalSystemInertiaKgM2,
    angularAccelerationRadPerS2: accelRadPerS2,
  });
  // Deceleration torque (NEW in 0.2.0): the same alpha=omega/t, T=J*alpha
  // shape as acceleration_torque, over deceleration_time instead of
  // acceleration_time -- symmetric magnitude, not a signed value.
  const { angularAccelerationRadPerS2: decelRadPerS2 } =
    angularAccelerationFromSpeedRamp({
      angularVelocityChangeRadPerS: operatingSpeedRadPerS,
      rampTimeS: decelerationTime.value,
    });
  const { torqueNm: decelerationTorqueNm } = accelerationTorque({
    inertiaKgM2: totalSystemInertiaKgM2,
    angularAccelerationRadPerS2: decelRadPerS2,
  });

  // --- Momentary and required torque (unchanged from 0.1.0) -----------------

  const { momentaryTorqueNm } = resolveMomentaryTorque({
    accelerationTorqueNm,
    loadTorqueNm,
  });
  const { requiredTorqueNm } = resolveRequiredTorque({
    computedTorqueNm: momentaryTorqueNm,
    safetyFactor: requiredTorqueSafetyFactor.value,
  });

  // --- Effective (RMS) torque (NEW in 0.2.0) ---------------------------------

  const { effectiveTorqueNm } = resolveEffectiveTorque({
    accelerationTorqueNm,
    loadTorqueNm,
    decelerationTorqueNm,
    accelerationTimeS: accelerationTime.value,
    constantVelocityTimeS: constantVelocityTimeS,
    decelerationTimeS: decelerationTime.value,
    cycleTimeS: cycleTimeS,
  });

  const requiredTorque = makeQuantity(requiredTorqueNm, "N*m");
  const operatingSpeed = makeQuantity(operatingSpeedRadPerS, "rad/s");
  const requiredPower = rotationalPower(requiredTorque, operatingSpeed);

  const outputs: Record<string, Quantity> = {
    pulley_inertia: makeQuantity(pulleyInertiaKgM2, "kg*m^2"),
    belt_inertia: makeQuantity(beltInertiaKgM2, "kg*m^2"),
    load_inertia: makeQuantity(loadInertiaKgM2, "kg*m^2"),
    reflected_load_inertia: makeQuantity(reflectedLoadInertiaKgM2, "kg*m^2"),
    total_system_inertia: makeQuantity(totalSystemInertiaKgM2, "kg*m^2"),
    inertia_ratio: makeQuantity(inertiaRatio, "ratio"),
    load_torque: makeQuantity(loadTorqueNm, "N*m"),
    acceleration_torque: makeQuantity(accelerationTorqueNm, "N*m"),
    momentary_torque: makeQuantity(momentaryTorqueNm, "N*m"),
    required_torque: requiredTorque,
    operating_speed: operatingSpeed,
    required_power: requiredPower,
    target_velocity: makeQuantity(targetVelocityMps, "m/s"),
    travel_distance: makeQuantity(travelDistanceM, "m"),
    constant_velocity_time: makeQuantity(constantVelocityTimeS, "s"),
    cycle_time: makeQuantity(cycleTimeS, "s"),
    deceleration_torque: makeQuantity(decelerationTorqueNm, "N*m"),
    effective_torque: makeQuantity(effectiveTorqueNm, "N*m"),
  };

  return {
    outputs,
    trace: buildTrace({
      orientation,
      inclineAngle,
      gravity,
      frictionCoefficient,
      totalMovingMass,
      pulleyPitchDiameter,
      pulleyMass,
      idlerPulleyMass,
      beltMass,
      gearRatio,
      mechanicalEfficiency,
      externalForce,
      motionMode,
      accelerationTime,
      decelerationTime,
      dwellTime,
      motorRotorInertia,
      requiredTorqueSafetyFactor,
      inertiaRatioMaximum,
      pulleyInertiaKgM2,
      beltInertiaKgM2,
      loadInertiaKgM2,
      reflectedLoadInertiaKgM2,
      totalSystemInertiaKgM2,
      inertiaRatio,
      forceN,
      loadTorqueNm,
      targetVelocityMps,
      travelDistanceM,
      constantVelocityTimeS,
      cycleTimeS,
      operatingSpeedRadPerS,
      accelerationTorqueNm,
      decelerationTorqueNm,
      effectiveTorqueNm,
      momentaryTorqueNm,
      requiredTorqueNm,
      requiredPowerW: requiredPower.value,
    }),
    checks: buildChecks({
      inertiaRatio,
      inertiaRatioMaximum: inertiaRatioMaximum.value,
    }),
    warnings: [],
    assumptions: [
      {
        id: "self-contained-reproduction",
        statement:
          "This module reproduces, rather than links to, Oriental Motor Co., Ltd.'s own formulas (ADR-0011 'Reuse policy') -- it has no calculation-level dependency on any other module, and duplicates rather than imports 0.1.0's own unchanged kernel functions (stage-2-contract.md '0.2.0 Addendum' cross-version reuse policy).",
      },
      {
        id: "equal-pulley-diameters",
        statement:
          "Both the drive and idler pulleys share one pitch diameter -- no source found gives an unequal-diameter belt-drive formula.",
      },
      {
        id: "efficiency-applied-to-load-torque",
        statement:
          "Mechanical efficiency divides load_torque, following Oriental Motor's own convention and every already-released Motor Sizing Tool sibling.",
      },
      {
        id: "repeating-trapezoidal-cycle-constant-load",
        statement:
          "A repeating accelerate/run/decelerate/dwell cycle with load_torque assumed constant across all four phases -- orientation, mass, and friction do not change mid-cycle in this module's own force-balance model, so this is genuinely true for this mechanism's own physics, not an approximation across a module boundary the way drive-train@0.1.0's own closed-cycle RMS-acceleration approximation is (docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md 'Motion Profile Model').",
      },
      {
        id: "effective-torque-no-check",
        statement:
          "effective_torque is a reported value, not a pass/fail check in 0.2.0 -- no source found gives a universal continuous-torque acceptance criterion for this mechanism family.",
      },
      {
        id: "no-catalog-matching",
        statement:
          "No candidate motor's own rated/peak torque is taken as an input (ADR-0011 'Output scope'). required_torque, effective_torque, and required_power are reported required-spec values, not pass/fail checks -- the engineer takes them to a catalog.",
      },
    ],
    validity: [],
  };
}
```

- [ ] **Step 2: Typecheck** (expect errors — `./checks` and `./trace` don't exist yet)

Run: `npm run typecheck`
Expected: FAILS — `Cannot find module './checks'` and `Cannot find module './trace'`. Task 7 fixes this.

- [ ] **Step 3: Commit** (staged only, not a standalone working commit — Task 7 completes the package)

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.2.0/compute.ts
git commit -m "feat: wire belt-pulley-drive-motor-sizing 0.2.0 compute (motion mode, deceleration/effective torque)"
```

---

### Task 7: `checks.ts`, `trace.ts`, `ui.ts`, `report.ts`

**Files:**
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/checks.ts` (unchanged copy)
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/report.ts` (unchanged copy)
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/trace.ts` (extended)
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/ui.ts` (extended)

- [ ] **Step 1: Create `checks.ts`** (byte-identical to 0.1.0's own — design doc: "The existing inertia-ratio check is unchanged. No new pass/fail check is added for effective_torque in 0.2.0")

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/checks.ts`:

```ts
// Acceptance checks for belt-pulley-drive-motor-sizing 0.2.0. Unchanged
// from 0.1.0: the inertia ratio against an engineer-supplied maximum is
// still the only real check -- no source found gives a universal
// continuous-torque acceptance criterion for effective_torque
// (docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md
// "Checks"). Duplicated, not imported, per stage-2-contract.md "0.2.0
// Addendum" cross-version reuse policy.

import { makeQuantity, type CheckResult } from "@/lib/engine";

export interface ChecksInput {
  readonly inertiaRatio: number;
  readonly inertiaRatioMaximum: number;
}

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
      observed: makeQuantity(input.inertiaRatio, "ratio"),
      allowable: makeQuantity(input.inertiaRatioMaximum, "ratio"),
      margin: makeQuantity(
        input.inertiaRatioMaximum - input.inertiaRatio,
        "ratio",
      ),
    },
  ];
}
```

- [ ] **Step 2: Create `report.ts`** (byte-identical to 0.1.0's own — generic section shape needs no change)

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/report.ts`:

```ts
// Generic report schema for belt-pulley-drive-motor-sizing 0.2.0. Declares
// the sections a report renders from the stored trace and computation
// (Unit 5.2); it never reimplements formulas. Unchanged shape from
// 0.1.0 -- new outputs and trace steps render inside the same sections.

import type { ModuleReportSchema } from "@/lib/engine";

export const reportSchema: ModuleReportSchema = {
  sections: [
    { id: "inputs", title: "Inputs", include: "inputs" },
    { id: "calc", title: "Calculation", include: "trace" },
    { id: "checks", title: "Checks", include: "checks" },
    {
      id: "results",
      title: "Required motor specification",
      include: "outputs",
    },
    { id: "assumptions", title: "Assumptions", include: "assumptions" },
  ],
};
```

- [ ] **Step 3: Create `trace.ts`**

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/trace.ts`:

```ts
// Calculation trace for belt-pulley-drive-motor-sizing 0.2.0. Extends
// 0.1.0's own trace contract shape with a motion-profile-derivation step
// and an effective-(RMS)-torque step; the inertia and drive-force/
// load-torque steps are unchanged. Cites
// jp.oriental_motor.general_catalog_motor_fan_sizing,
// us.automationdirect.sureservo_selection_appendix, and (new in 0.2.0)
// jp.oriental_motor.motor_sizing_calculations.

import { asSourceRevisionId } from "@/lib/standards";
import {
  buildCalculationTrace,
  makeQuantity,
  type CalculationTrace,
  type EnumValue,
  type Quantity,
} from "@/lib/engine";

const ORIENTAL_MOTOR_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004",
    ),
    clause: "Wire Belt Mechanism, Rack and Pinion Mechanism (p. F-3)",
    label: "F = FA + m(sina + mu*cosa); TL = F*D/(2*eta*i)",
  },
];

const AUTOMATIONDIRECT_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011",
    ),
    clause: "Belt Drive (or Rack & Pinion) Equations (Table 1, p. B-6)",
    label:
      "T_run = (F_total*r)/i; J_total = J_motor+J_gear+((J_pulleys+J_belt+J_W)/i^2)",
  },
];

const ORIENTAL_MOTOR_SIZING_CALCULATIONS_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.oriental_motor.motor_sizing_calculations@web-2026-08-08",
    ),
    clause:
      "Acceleration Torque; Calculation for the Effective Load Torque (Trms) for Servo Motors and BX Series Brushless Motors (pp. 5-6)",
    label:
      "Ta = (J0*i^2+JL)*(NM/t1); Trms = sqrt(((Ta+TL)^2*t1+TL^2*t2+(Td-TL)^2*t3)/tf)",
  },
];

export interface TraceInput {
  readonly orientation: EnumValue;
  readonly inclineAngle: Quantity;
  readonly gravity: Quantity;
  readonly frictionCoefficient: Quantity;
  readonly totalMovingMass: Quantity;
  readonly pulleyPitchDiameter: Quantity;
  readonly pulleyMass: Quantity;
  readonly idlerPulleyMass: Quantity;
  readonly beltMass: Quantity;
  readonly gearRatio: Quantity;
  readonly mechanicalEfficiency: Quantity;
  readonly externalForce: Quantity;
  readonly motionMode: EnumValue;
  readonly accelerationTime: Quantity;
  readonly decelerationTime: Quantity;
  readonly dwellTime: Quantity;
  readonly motorRotorInertia: Quantity;
  readonly requiredTorqueSafetyFactor: Quantity;
  readonly inertiaRatioMaximum: Quantity;
  readonly pulleyInertiaKgM2: number;
  readonly beltInertiaKgM2: number;
  readonly loadInertiaKgM2: number;
  readonly reflectedLoadInertiaKgM2: number;
  readonly totalSystemInertiaKgM2: number;
  readonly inertiaRatio: number;
  readonly forceN: number;
  readonly loadTorqueNm: number;
  readonly targetVelocityMps: number;
  readonly travelDistanceM: number;
  readonly constantVelocityTimeS: number;
  readonly cycleTimeS: number;
  readonly operatingSpeedRadPerS: number;
  readonly accelerationTorqueNm: number;
  readonly decelerationTorqueNm: number;
  readonly effectiveTorqueNm: number;
  readonly momentaryTorqueNm: number;
  readonly requiredTorqueNm: number;
  readonly requiredPowerW: number;
}

export function buildTrace(input: TraceInput): CalculationTrace {
  const inertiaStep = {
    node: "step" as const,
    id: "geometry-and-inertia",
    title: "Pulley, belt, and load inertia, reflected and totaled",
    methodId: "motor_sizing.belt_pulley.inertia",
    expression:
      "J_pulleys = (1/8)*(M_drive+M_idler)*D^2; J_belt = M_belt*(D/2)^2; J_W = J_pulleys+J_belt+M*(D/2)^2; J_L = J_W/i^2; J_total = J_M+J_L; R_J = J_L/J_M",
    inputs: [
      {
        label: "D",
        value: input.pulleyPitchDiameter,
        ref: "motor_sizing.belt_pulley.pulley_pitch_diameter",
      },
      {
        label: "M_drive",
        value: input.pulleyMass,
        ref: "motor_sizing.belt_pulley.pulley_mass",
      },
      {
        label: "M_idler",
        value: input.idlerPulleyMass,
        ref: "motor_sizing.belt_pulley.idler_pulley_mass",
      },
      {
        label: "M_belt",
        value: input.beltMass,
        ref: "motor_sizing.belt_pulley.belt_mass",
      },
      {
        label: "M",
        value: input.totalMovingMass,
        ref: "motion.axis.total_moving_mass",
      },
      {
        label: "i",
        value: input.gearRatio,
        ref: "motor_sizing.belt_pulley.gear_ratio",
      },
      {
        label: "J_M",
        value: input.motorRotorInertia,
        ref: "motor_sizing.belt_pulley.motor_rotor_inertia",
      },
    ],
    outputs: [
      {
        label: "J_pulleys",
        value: makeQuantity(input.pulleyInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.belt_pulley.pulley_inertia",
      },
      {
        label: "J_belt",
        value: makeQuantity(input.beltInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.belt_pulley.belt_inertia",
      },
      {
        label: "J_W",
        value: makeQuantity(input.loadInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.belt_pulley.load_inertia",
      },
      {
        label: "J_L",
        value: makeQuantity(input.reflectedLoadInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.belt_pulley.reflected_load_inertia",
      },
      {
        label: "J_total",
        value: makeQuantity(input.totalSystemInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.belt_pulley.total_system_inertia",
      },
      {
        label: "R_J",
        value: makeQuantity(input.inertiaRatio, "ratio"),
        ref: "motor_sizing.belt_pulley.inertia_ratio",
      },
    ],
    sources: [...ORIENTAL_MOTOR_SOURCE, ...AUTOMATIONDIRECT_SOURCE],
    notes: [
      "Both pulleys share one pitch diameter and rotate at the same angular speed as the drive shaft (no belt slip), so their inertias add directly.",
      "belt_inertia is 0 when belt_mass is 0, its own structural default.",
    ],
  };

  const loadTorqueStep = {
    node: "step" as const,
    id: "drive-force-and-load-torque",
    title: "Orientation-aware drive force and load torque",
    methodId: "motor_sizing.belt_pulley.load_torque",
    expression: "F = F_A + M*g*(sin(theta)+mu*cos(theta)); T_L = F*D/(2*eta*i)",
    inputs: [
      {
        label: "theta",
        value: input.inclineAngle,
        ref: "motion.axis.incline_angle",
      },
      { label: "g", value: input.gravity, ref: "motion.axis.gravity" },
      {
        label: "mu",
        value: input.frictionCoefficient,
        ref: "motion.axis.friction_coefficient",
      },
      {
        label: "F_A",
        value: input.externalForce,
        ref: "motor_sizing.belt_pulley.external_force",
      },
      {
        label: "eta",
        value: input.mechanicalEfficiency,
        ref: "motor_sizing.belt_pulley.mechanical_efficiency",
      },
    ],
    outputs: [
      {
        label: "T_L",
        value: makeQuantity(input.loadTorqueNm, "N*m"),
        ref: "motor_sizing.belt_pulley.load_torque",
      },
    ],
    sources: ORIENTAL_MOTOR_SOURCE,
    notes: [
      `Orientation: ${String(input.orientation.value)}.`,
      "Load torque is assumed constant across all four motion phases (accelerate/run/decelerate/dwell) -- this mechanism's own physics, not an approximation across a module boundary.",
    ],
  };

  const motionProfileStep = {
    node: "step" as const,
    id: "motion-profile",
    title: "Repeating trapezoidal motion cycle (velocity-first or distance-first)",
    methodId: "motor_sizing.belt_pulley.motion_profile",
    expression:
      "velocity mode: S = V*(t1+t3)/2 + V*t2, tf = t1+t2+t3+t4; distance mode: t2 = tf-t1-t3-t4, V = S/(t2+(t1+t3)/2)",
    inputs: [
      {
        label: "t1",
        value: input.accelerationTime,
        ref: "motor_sizing.belt_pulley.acceleration_time",
      },
      {
        label: "t3",
        value: input.decelerationTime,
        ref: "motor_sizing.belt_pulley.deceleration_time",
      },
      {
        label: "t4",
        value: input.dwellTime,
        ref: "motor_sizing.belt_pulley.dwell_time",
      },
    ],
    outputs: [
      {
        label: "V",
        value: makeQuantity(input.targetVelocityMps, "m/s"),
        ref: "motor_sizing.belt_pulley.target_velocity",
      },
      {
        label: "S",
        value: makeQuantity(input.travelDistanceM, "m"),
        ref: "motor_sizing.belt_pulley.travel_distance",
      },
      {
        label: "t2",
        value: makeQuantity(input.constantVelocityTimeS, "s"),
        ref: "motor_sizing.belt_pulley.constant_velocity_time",
      },
      {
        label: "tf",
        value: makeQuantity(input.cycleTimeS, "s"),
        ref: "motor_sizing.belt_pulley.cycle_time",
      },
      {
        label: "N_op",
        value: makeQuantity(input.operatingSpeedRadPerS, "rad/s"),
        ref: "motor_sizing.belt_pulley.operating_speed",
      },
    ],
    sources: ORIENTAL_MOTOR_SIZING_CALCULATIONS_SOURCE,
    notes: [
      `motion_mode: ${String(input.motionMode.value)} -- the other side (velocity/distance and run-time/cycle-time) is derived, not supplied, and always reported regardless of mode.`,
    ],
  };

  const torqueStep = {
    node: "step" as const,
    id: "acceleration-and-deceleration-torque",
    title: "Acceleration and deceleration torque",
    methodId: "motor_sizing.belt_pulley.acceleration_torque",
    expression:
      "alpha_accel = omega_motor/t1; T_A = J_total*alpha_accel; alpha_decel = omega_motor/t3; T_D = J_total*alpha_decel",
    inputs: [],
    outputs: [
      {
        label: "T_A",
        value: makeQuantity(input.accelerationTorqueNm, "N*m"),
        ref: "motor_sizing.belt_pulley.acceleration_torque",
      },
      {
        label: "T_D",
        value: makeQuantity(input.decelerationTorqueNm, "N*m"),
        ref: "motor_sizing.belt_pulley.deceleration_torque",
      },
    ],
    sources: AUTOMATIONDIRECT_SOURCE,
    notes: [
      "T_D is symmetric to T_A -- the same alpha=omega/t, T=J*alpha shape, over deceleration_time instead of acceleration_time.",
    ],
  };

  const requiredTorqueStep = {
    node: "step" as const,
    id: "momentary-and-required-torque",
    title: "Momentary torque and required motor rating",
    methodId: "motor_sizing.belt_pulley.required_torque",
    expression: "T1 = T_A+T_L; T_req = T1*Sf; P_req = T_req*N_op",
    inputs: [
      {
        label: "Sf",
        value: input.requiredTorqueSafetyFactor,
        ref: "motor_sizing.belt_pulley.required_torque_safety_factor",
      },
    ],
    outputs: [
      {
        label: "T1",
        value: makeQuantity(input.momentaryTorqueNm, "N*m"),
        ref: "motor_sizing.belt_pulley.momentary_torque",
      },
      {
        label: "T_req",
        value: makeQuantity(input.requiredTorqueNm, "N*m"),
        ref: "motor_sizing.belt_pulley.required_torque",
      },
      {
        label: "P_req",
        value: makeQuantity(input.requiredPowerW, "W"),
        ref: "motor_sizing.belt_pulley.required_power",
      },
    ],
    sources: ORIENTAL_MOTOR_SOURCE,
    notes: [
      "T_req is governed by the acceleration phase (T1 = T_A+T_L), additive to, not replaced by, effective_torque below.",
    ],
  };

  const effectiveTorqueStep = {
    node: "step" as const,
    id: "effective-torque",
    title: "Effective (RMS) torque over the repeating cycle",
    methodId: "motor_sizing.belt_pulley.effective_torque",
    expression: "Trms = sqrt(((T_A+T_L)^2*t1 + T_L^2*t2 + (T_D-T_L)^2*t3) / tf)",
    inputs: [],
    outputs: [
      {
        label: "Trms",
        value: makeQuantity(input.effectiveTorqueNm, "N*m"),
        ref: "motor_sizing.belt_pulley.effective_torque",
      },
    ],
    sources: ORIENTAL_MOTOR_SIZING_CALCULATIONS_SOURCE,
    notes: [
      "Dwell time (t4) contributes zero torque to the numerator but counts toward tf, matching how a servo's own thermal/RMS rating averages over idle time too.",
      "No pass/fail check is applied to effective_torque in 0.2.0 -- no source found gives a universal continuous-torque acceptance criterion for this mechanism family.",
    ],
  };

  const inertiaRatioCheckStep = {
    node: "step" as const,
    id: "inertia-ratio-check",
    title: "Inertia ratio against the engineer-supplied maximum",
    methodId: "motor_sizing.belt_pulley.inertia_ratio",
    expression: "R_J <= R_Jmax",
    inputs: [
      {
        label: "R_Jmax",
        value: input.inertiaRatioMaximum,
        ref: "motor_sizing.belt_pulley.inertia_ratio_maximum",
      },
    ],
    outputs: [
      {
        label: "R_J",
        value: makeQuantity(input.inertiaRatio, "ratio"),
        ref: "motor_sizing.belt_pulley.inertia_ratio",
      },
    ],
    sources: [],
    notes: [
      "The one real catalog-free pass/fail check in 0.2.0, unchanged from 0.1.0.",
    ],
  };

  return buildCalculationTrace([
    {
      node: "section",
      id: "inertia",
      title: "Inertia",
      children: [inertiaStep],
    },
    {
      node: "section",
      id: "motion-and-torque",
      title: "Motion profile, drive force, load torque, and acceleration/deceleration torque",
      children: [loadTorqueStep, motionProfileStep, torqueStep],
    },
    {
      node: "section",
      id: "required-rating",
      title: "Required motor rating",
      children: [requiredTorqueStep, effectiveTorqueStep, inertiaRatioCheckStep],
    },
    {
      node: "section",
      id: "validity-and-assumptions",
      title: "Validity and assumptions",
      children: [
        {
          node: "step",
          id: "scope-notes",
          title: "Scope and assumptions",
          methodId: "motor_sizing.belt_pulley.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            "Both pulleys share one pitch diameter -- no source found gives an unequal-diameter belt-drive formula.",
            "A repeating accelerate/run/decelerate/dwell cycle with load_torque assumed constant across all four phases.",
            "No belt tension, belt width/pitch, tooth-shear, or wrap-angle selection -- a hardware-selection question out of this module's own scope.",
            "No candidate motor's own rated/peak torque is taken as an input -- required_torque, effective_torque, and required_power are reported required-spec values, not pass/fail checks.",
          ],
        },
      ],
    },
  ]);
}
```

- [ ] **Step 4: Create `ui.ts`**

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/ui.ts`:

```ts
// Generic UI schema for belt-pulley-drive-motor-sizing 0.2.0. Selects and
// groups input ports for the generic module workspace (Unit 3.3); it
// encodes no computation. All four motion-mode-dependent fields
// (target_velocity, travel_distance, constant_velocity_time, cycle_time)
// are listed -- the real per-mode requirement is enforced server-side by
// ./input-schema.ts, the same "all fields shown, validation enforces
// requirement" precedent support-bearing@0.1.0's own bearing.location
// split already established for its UI.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
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
    {
      id: "pulleys-and-belt",
      title: "Pulleys, belt, and drive",
      fields: [
        { portKey: "pulley_pitch_diameter" },
        { portKey: "pulley_mass" },
        { portKey: "idler_pulley_mass" },
        { portKey: "belt_mass" },
        { portKey: "gear_ratio" },
        { portKey: "mechanical_efficiency" },
        { portKey: "external_force" },
      ],
    },
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
    {
      id: "motor-and-safety-factors",
      title: "Candidate motor and safety factors",
      fields: [
        { portKey: "motor_rotor_inertia" },
        { portKey: "required_torque_safety_factor" },
        { portKey: "inertia_ratio_maximum" },
      ],
    },
  ],
};
```

- [ ] **Step 5: Typecheck** (expect an error — `./package` doesn't exist yet, but nothing imports it; `compute.ts`'s own imports of `./checks` and `./trace` now resolve)

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Lint, commit**

Run: `npm run lint -- lib/modules/belt-pulley-drive-motor-sizing/0.2.0/checks.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/report.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/trace.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/ui.ts`
Expected: clean.

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.2.0/checks.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/report.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/trace.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/ui.ts
git commit -m "feat: add belt-pulley-drive-motor-sizing 0.2.0 checks, trace, ui, report"
```

---

### Task 8: `validation.ts` and the draft `package.ts`

Written now in final form: this session already knows exactly what Tasks 9-12 below will prove (the independent-benchmark and reference-example evidence), so there is no separate "draft, then finalize" step the way some earlier modules' own sessions needed — see `stage-2-contract.md` "0.2.0 Addendum".

**Files:**
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/validation.ts`
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/package.ts` (Stage 3 draft name — Task 14 renames it to `index.ts` at Stage 6 release, the same convention every prior module followed)

- [ ] **Step 1: Create `validation.ts`**

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/validation.ts`:

```ts
// Validation record for belt-pulley-drive-motor-sizing 0.2.0.

import { asSourceRevisionId } from "@/lib/standards";
import type { ValidationRecord } from "@/lib/engine";

export const validation: ValidationRecord = {
  moduleId: "belt-pulley-drive-motor-sizing",
  moduleVersion: "0.2.0",
  methods: [
    "Oriental Motor Co., Ltd.'s own combined wire-belt/rack-and-pinion sizing method (moment of inertia of two pulleys plus a translating belt, orientation-aware drive force, load torque, operating speed), unchanged from 0.1.0",
    "A native repeating trapezoidal motion cycle (accelerate/run/decelerate/dwell), velocity-first or distance-first, and Oriental Motor's own generic per-phase effective (RMS) torque formula for continuous/thermal motor rating (jp.oriental_motor.motor_sizing_calculations, pp. 5-6) -- new in 0.2.0",
  ],
  sourceRevisionIds: [
    asSourceRevisionId(
      "jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004",
    ),
    asSourceRevisionId(
      "us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011",
    ),
    asSourceRevisionId(
      "jp.oriental_motor.motor_sizing_calculations@web-2026-08-08",
    ),
  ],
  referenceExamples: [
    {
      id: "automationdirect-belt-drive-pulley-inertia",
      description:
        "AutomationDirect's own 'Belt Drive - Example Calculations' worked example (pp. B-11-B-13), reformulated into 0.2.0's own velocity-mode motion inputs (acceleration_time=1.0s, deceleration_time=1.0s, constant_velocity_time=2.0s, dwell_time=0s -- the source's own printed 4.0s move time split into its own stated 1.0s/2.0s/1.0s accel/run/decel phases, cycle_time reproducing the source's own printed 4.0s exactly). Carried over unchanged from 0.1.0: pulley_inertia matches the source's own printed figure within 0.2% (no efficiency term either convention applies to this figure).",
      tolerance:
        "0.2% (pulley geometry/density rounding, not a formula disagreement) -- same as 0.1.0.",
    },
    {
      id: "automationdirect-belt-drive-load-and-reflected-inertia-with-disclosed-adjustment",
      description:
        "The same worked example's own carriage-only load inertia and reflected-to-motor inertia, carried over unchanged from 0.1.0: both reproduce the source's own printed figures within 0.1% only after AutomationDirect's own disclosed 1/e efficiency-on-inertia convention (not this module's own convention) is reapplied at the test level -- see 0.1.0's own validation record for the full account, unchanged by this release.",
      tolerance:
        "0.1% after the disclosed 1/e adjustment; ~25% (1/0.8) unadjusted, by design -- same as 0.1.0.",
    },
    {
      id: "belt-pulley-0.2.0-symmetric-decel-torque-internal-consistency",
      description:
        "New in 0.2.0: with acceleration_time == deceleration_time (both 1.0s, matching the AutomationDirect example's own stated symmetric accel/decel), deceleration_torque and acceleration_torque are asserted equal (same total_system_inertia, same operating_speed, same ramp time on both sides of the formula) -- an internal-consistency check, not a claim against a published figure: the source gives no printed deceleration-torque figure at all.",
      tolerance: "Exact (floating-point precision) -- an algebraic identity given equal ramp times, not a tolerance band.",
    },
  ],
  independentBenchmark:
    "independent-benchmark.test.ts carries forward 0.1.0's own force/load-torque cross-check (resolveDriveForce+resolveLoadTorque vs. a single combined reimplementation) and adds a new one for effective_torque: resolveEffectiveTorque's own closed-form Trms is cross-checked against a structurally different direct per-phase computation (Trms = sqrt(sum(T_i^2*t_i)/tf) applied to an explicit four-phase list [accel, run, decel, dwell] with dwell torque fixed at zero) -- algebraically the identical formula, built from an explicit phase list rather than the closed-form expression, the same 'structurally separate reimplementation, proved identical' pattern drive-train@0.1.0's own closed-cycle-benchmark.ts already establishes. A deterministic property sweep (torque magnitudes and phase durations varied, including the t2=0 triangular-move boundary) confirms algebraic identity to floating-point precision.",
  reviewer:
    "Solo validation -- independent-benchmark substitute, the same reviewer-substitute role this document already plays for every prior Motor Sizing Tool module (context/ai-workflow-rules.md Stage 4: 'When no second engineer is available, the documented independent benchmark comparison serves as the review substitute').",
  reviewDate: "2026-08-14",
  supportedUseLimits: [
    "Both pulleys must share one pitch diameter -- no source found this session gives an unequal-diameter belt-drive formula.",
    "No belt tension, belt width/pitch, tooth-shear, or wrap-angle selection, and no motor catalog matching.",
    "load_torque, momentary_torque, required_torque, reflected_load_inertia, and inertia_ratio are NOT claimed to reproduce AutomationDirect's own printed figures at face value, for the same reasons already disclosed in 0.1.0's own validation record (efficiency-convention difference; a confirmed source-internal arithmetic slip) -- see 'deviations' below.",
    "effective_torque has no published worked numerical example to reproduce -- Oriental Motor's own source page (pp. 5-6) states the formula generically, for all motors, with no belt/pulley-specific figures. Validated only via the algebraic-identity independent benchmark above, per the design doc's own pre-approved fallback (docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md 'Evidence Disposition'). A disclosed, open Stage 4 evidence gap -- to be closed against a real project's own duty-cycle results later, never a synthetic fixture.",
    "Load torque is assumed constant across all four motion phases -- true for this mechanism's own force-balance model (orientation/mass/friction do not change mid-cycle), not an approximation the way drive-train@0.1.0's own closed-cycle RMS-acceleration assumption is across a module boundary.",
  ],
  deviations: [
    "AutomationDirect's own worked example has a confirmed arithmetic slip, disclosed and not reproduced (carried over unchanged from 0.1.0): its own friction force is computed as 0.05 x 100 = 5.0 lb though the stated table+workpiece weight is 90 lb (correct: 4.5 lb). This module's own kernel computes friction from the actual supplied mass, so it does not reproduce the source's own printed T_run/T_motor totals that follow from it.",
    "The two primary sources place mechanical efficiency on opposite sides of the calculation (carried over unchanged from 0.1.0): Oriental Motor divides load torque by eta; AutomationDirect divides the carriage's own inertia by e. This module follows Oriental Motor's own convention, matching every already-released Motor Sizing Tool sibling.",
  ],
};
```

- [ ] **Step 2: Create `package.ts`** (draft name — not `index.ts` yet, so `npm run registry:generate` does not discover it before Stage 6)

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/package.ts`:

```ts
// The belt-pulley-drive-motor-sizing 0.2.0 package draft. Assembles the
// manifest, ports, compute, UI, report, and validation record into a
// single `ModulePackage` and seals it. Named `package.ts`, not `index.ts`,
// so `npm run registry:generate` does not discover it yet -- Task 14
// renames it to `index.ts` at Stage 6 release, the same convention every
// prior module followed (see e.g. drive-train@0.1.0's own README.md
// "Stage 6").

import {
  sealModulePackage,
  type ModulePackage,
} from "@/lib/engine";
import { manifest, ports } from "./manifest";
import { inputSchema } from "./input-schema";
import { compute } from "./compute";
import { uiSchema } from "./ui";
import { reportSchema } from "./report";
import { validation } from "./validation";

export const beltPulleyDriveMotorSizingModule: ModulePackage =
  sealModulePackage({
    manifest,
    ports,
    inputSchema,
    compute,
    uiSchema,
    reportSchema,
    validation,
  });

export default beltPulleyDriveMotorSizingModule;
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Lint, commit**

Run: `npm run lint -- lib/modules/belt-pulley-drive-motor-sizing/0.2.0/validation.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/package.ts`
Expected: clean.

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.2.0/validation.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/package.ts
git commit -m "feat: assemble belt-pulley-drive-motor-sizing 0.2.0 package draft"
```

---

### Task 9: `package.test.ts` — conformance and `executeModule` coverage

**Files:**
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/package.test.ts`

- [ ] **Step 1: Compute a provisional source-immutability hash**

Run: `npm run module:source-hash -- belt-pulley-drive-motor-sizing 0.2.0`
Record the printed `expectedSourceHash` value — call it `<HASH>` below. (This is provisional: Task 14 recomputes and replaces it once `package.ts` is renamed to `index.ts`, since the hash covers this directory's own `.ts` filenames too — the same "recompute after a deliberate change to this directory's own files" step every prior module's own `package.test.ts` comment already documents.)

- [ ] **Step 2: Create `package.test.ts`**

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/package.test.ts`, substituting the real `<HASH>` value from Step 1:

```ts
import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { beltPulleyDriveMotorSizingModule } from "./package";
import { asQuantity, type RawInput } from "./test-helpers";

/**
 * A minimal, valid velocity-mode scenario exercising every required port.
 * Round engineering numbers, not a published worked example -- see
 * automationdirect-reference-example.test.ts for that.
 */
function baselineInput(): RawInput {
  return {
    values: {
      orientation: {
        v: 1,
        kind: "enum",
        enumId: "axis_orientation",
        value: "horizontal",
      },
      incline_angle: makeQuantity(0, "rad"),
      friction_coefficient: makeQuantity(0.1, "ratio"),
      total_moving_mass: makeQuantity(50, "kg"),
      pulley_pitch_diameter: makeQuantity(0.08, "m"),
      pulley_mass: makeQuantity(1, "kg"),
      idler_pulley_mass: makeQuantity(1, "kg"),
      belt_mass: makeQuantity(0.5, "kg"),
      gear_ratio: makeQuantity(1, "ratio"),
      mechanical_efficiency: makeQuantity(0.9, "ratio"),
      external_force: makeQuantity(0, "N"),
      motion_mode: {
        v: 1,
        kind: "enum",
        enumId: "belt_pulley_motion_mode",
        value: "velocity",
      },
      target_velocity: makeQuantity(0.5, "m/s"),
      acceleration_time: makeQuantity(0.5, "s"),
      deceleration_time: makeQuantity(0.5, "s"),
      constant_velocity_time: makeQuantity(1, "s"),
      dwell_time: makeQuantity(0, "s"),
      motor_rotor_inertia: makeQuantity(5e-3, "kg*m^2"),
      required_torque_safety_factor: makeQuantity(2, "ratio"),
      inertia_ratio_maximum: makeQuantity(30, "ratio"),
    },
  };
}

/** Same scenario, motion_mode="distance" with an equivalent travel_distance/cycle_time. */
function distanceModeInput(): RawInput {
  const input = baselineInput();
  delete (input.values as Record<string, unknown>).target_velocity;
  delete (input.values as Record<string, unknown>).constant_velocity_time;
  input.values.motion_mode = {
    v: 1,
    kind: "enum",
    enumId: "belt_pulley_motion_mode",
    value: "distance",
  };
  // Equivalent to baselineInput(): V=0.5 m/s, t1=t3=0.5s, t2=1s ->
  // S = 0.5*(0.5+0.5)/2 + 0.5*1 = 0.75 m; tf = 0.5+1+0.5+0 = 2 s.
  input.values.travel_distance = makeQuantity(0.75, "m");
  input.values.cycle_time = makeQuantity(2, "s");
  return input;
}

/** Same scenario, vertical orientation. */
function verticalInput(): RawInput {
  const input = baselineInput();
  input.values.orientation = {
    v: 1,
    kind: "enum",
    enumId: "axis_orientation",
    value: "vertical",
  };
  input.values.incline_angle = makeQuantity(Math.PI / 2, "rad");
  return input;
}

// Pinned by `npm run module:source-hash -- belt-pulley-drive-motor-sizing
// 0.2.0` -- see lib/engine/module-sdk/conformance.ts's
// "source-immutability" check. Recomputed in Task 14 after package.ts is
// renamed to index.ts (the hash covers this directory's own filenames).
const EXPECTED_SOURCE_HASH = "<HASH>";

describe("belt-pulley-drive-motor-sizing 0.2.0 module conformance", () => {
  const report = runModuleConformance(beltPulleyDriveMotorSizingModule, {
    sampleInputs: [baselineInput(), distanceModeInput(), verticalInput()],
    sources: readModuleSources(import.meta.dirname),
    expectedSourceHash: EXPECTED_SOURCE_HASH,
  });

  it("passes package-validation", () => {
    const check = report.checks.find((c) => c.id === "package-validation");
    expect(check?.status).toBe("pass");
  });

  it("passes import-boundary as a real check", () => {
    const check = report.checks.find((c) => c.id === "import-boundary");
    expect(check?.status).toBe("pass");
  });

  it("runs the source-immutability check and it passes (not skipped)", () => {
    const check = report.checks.find((c) => c.id === "source-immutability");
    expect(check).toBeDefined();
    expect(check?.status, check?.detail).toBe("pass");
  });

  it("every sample input executes: inputs/outputs validate, trace is complete", () => {
    const check = report.checks.find((c) => c.id === "execution");
    expect(check?.status).toBe("pass");
  });

  it("passes overall conformance", () => {
    expect(report.ok, JSON.stringify(report.checks, null, 2)).toBe(true);
  });
});

describe("belt-pulley-drive-motor-sizing 0.2.0 executeModule", () => {
  it("computes a baseline velocity-mode scenario without error", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
    expect(asQuantity(result.outputs.load_torque).value).toBeGreaterThan(0);
    expect(
      asQuantity(result.outputs.acceleration_torque).value,
    ).toBeGreaterThan(0);
    expect(
      asQuantity(result.outputs.deceleration_torque).value,
    ).toBeGreaterThan(0);
    expect(asQuantity(result.outputs.effective_torque).value).toBeGreaterThan(
      0,
    );
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("pass");
  });

  it("velocity mode derives travel_distance and cycle_time matching the closed form", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
    // V=0.5, t1=t3=0.5, t2=1, t4=0 -> S=0.5*(1)/2+0.5*1=0.75; tf=2.
    expect(asQuantity(result.outputs.travel_distance).value).toBeCloseTo(
      0.75,
      12,
    );
    expect(asQuantity(result.outputs.cycle_time).value).toBeCloseTo(2, 12);
  });

  it("distance mode derives target_velocity and constant_velocity_time matching the equivalent velocity-mode scenario", () => {
    const velocityResult = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
    const distanceResult = executeModule(
      beltPulleyDriveMotorSizingModule,
      distanceModeInput(),
    );
    expect(
      asQuantity(distanceResult.outputs.target_velocity).value,
    ).toBeCloseTo(asQuantity(velocityResult.outputs.target_velocity).value, 9);
    expect(
      asQuantity(distanceResult.outputs.constant_velocity_time).value,
    ).toBeCloseTo(
      asQuantity(velocityResult.outputs.constant_velocity_time).value,
      9,
    );
    // Every downstream torque/power output agrees too -- the two modes are
    // just two ways of specifying the identical physical motion.
    expect(
      asQuantity(distanceResult.outputs.effective_torque).value,
    ).toBeCloseTo(asQuantity(velocityResult.outputs.effective_torque).value, 9);
  });

  it("deceleration_torque equals acceleration_torque when acceleration_time equals deceleration_time (symmetric ramp)", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
    expect(asQuantity(result.outputs.deceleration_torque).value).toBeCloseTo(
      asQuantity(result.outputs.acceleration_torque).value,
      12,
    );
  });

  it("throws a feasibility error when distance mode's cycle_time is too short for the accel/decel times", () => {
    const input = distanceModeInput();
    input.values.cycle_time = makeQuantity(0.5, "s"); // shorter than t1+t3=1.0s
    expect(() => executeModule(beltPulleyDriveMotorSizingModule, input)).toThrow();
  });

  it("rejects velocity mode missing constant_velocity_time (input-schema coverage)", () => {
    const input = baselineInput();
    delete (input.values as Record<string, unknown>).constant_velocity_time;
    expect(() => executeModule(beltPulleyDriveMotorSizingModule, input)).toThrow();
  });

  it("a vertical scenario has a larger load_torque than the equivalent horizontal one", () => {
    const horizontal = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
    const vertical = executeModule(
      beltPulleyDriveMotorSizingModule,
      verticalInput(),
    );
    expect(asQuantity(vertical.outputs.load_torque).value).toBeGreaterThan(
      asQuantity(horizontal.outputs.load_torque).value,
    );
  });

  it("effective_torque is bounded between load_torque and momentary_torque for a symmetric cycle with a nonzero run phase", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
    const trms = asQuantity(result.outputs.effective_torque).value;
    const momentary = asQuantity(result.outputs.momentary_torque).value;
    const loadTorque = asQuantity(result.outputs.load_torque).value;
    expect(trms).toBeGreaterThanOrEqual(loadTorque);
    expect(trms).toBeLessThanOrEqual(momentary);
  });

  it("serializes and deserializes outputs without semantic loss (round trip)", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
    const roundTripped = JSON.parse(JSON.stringify(result.outputs));
    expect(roundTripped.effective_torque.value).toBeCloseTo(
      asQuantity(result.outputs.effective_torque).value,
      12,
    );
    expect(roundTripped.effective_torque.unit).toBe(
      asQuantity(result.outputs.effective_torque).unit,
    );
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run lib/modules/belt-pulley-drive-motor-sizing/0.2.0/package.test.ts`
Expected: PASS (all tests). If "effective_torque is bounded between load_torque and momentary_torque" fails, double check the formula transcription in `math.ts`'s own `resolveEffectiveTorque` against Task 5 — this bound holds algebraically whenever `T_D` is between `T_L` and `T_A+T_L`, which is true for this scenario's own numbers; a failure here means a real kernel bug, not a bad test.

- [ ] **Step 4: Lint, typecheck, commit**

Run: `npm run lint -- lib/modules/belt-pulley-drive-motor-sizing/0.2.0/package.test.ts && npm run typecheck`
Expected: both clean.

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.2.0/package.test.ts
git commit -m "feat: add belt-pulley-drive-motor-sizing 0.2.0 conformance and executeModule tests"
```

---

### Task 10: Independent benchmark — force/load-torque (carried over) and Trms (new)

**Files:**
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/independent-benchmark.ts`
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/independent-benchmark.test.ts`

- [ ] **Step 1: Create `independent-benchmark.ts`**

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/independent-benchmark.ts`:

```ts
// Two independent-benchmark reimplementations for
// belt-pulley-drive-motor-sizing 0.2.0. Test-only: not part of the module
// package itself.
//
// 1. resolveOrientalMotorLoadTorque -- carried over unchanged from 0.1.0:
//    Oriental Motor's own combined "Wire Belt Mechanism, Rack and Pinion
//    Mechanism" load-torque formula, reimplemented as a single expression.
//
// 2. resolvePhaseRmsTorque -- NEW in 0.2.0: Oriental Motor's own effective
//    (RMS) torque formula (jp.oriental_motor.motor_sizing_calculations,
//    p. 6), reimplemented as a direct per-phase computation over an
//    explicit four-phase list [accel, run, decel, dwell] with dwell
//    torque fixed at zero, rather than the closed-form expression
//    ./math.ts's own resolveEffectiveTorque uses -- the same
//    "structurally separate reimplementation, proved identical" pattern
//    drive-train@0.1.0's own closed-cycle-benchmark.ts already
//    establishes for its own RMS-torque formula.

export interface OrientalMotorLoadTorqueInput {
  readonly totalMovingMassKg: number;
  readonly gravityMps2: number;
  readonly inclineAngleRad: number;
  readonly frictionCoefficient: number;
  readonly externalForceN: number;
  readonly pulleyPitchDiameterM: number;
  readonly mechanicalEfficiency: number;
  readonly gearRatio: number;
}

export interface OrientalMotorLoadTorqueResult {
  readonly forceN: number;
  readonly loadTorqueNm: number;
}

/** `F = FA + m*g*(sin(theta)+mu*cos(theta))`; `TL = F*D/(2*eta*i)`. */
export function resolveOrientalMotorLoadTorque(
  input: OrientalMotorLoadTorqueInput,
): OrientalMotorLoadTorqueResult {
  const forceN =
    input.externalForceN +
    input.totalMovingMassKg *
      input.gravityMps2 *
      (Math.sin(input.inclineAngleRad) +
        input.frictionCoefficient * Math.cos(input.inclineAngleRad));

  const loadTorqueNm =
    (forceN * input.pulleyPitchDiameterM) /
    (2 * input.mechanicalEfficiency * input.gearRatio);

  return { forceN, loadTorqueNm };
}

export interface RmsTorquePhase {
  /** Constant torque during this phase, in N*m. Signed -- the formula squares it. */
  readonly torqueNm: number;
  /** Duration of this phase, in s. Must be > 0. */
  readonly durationS: number;
}

/**
 * `Trms = sqrt(sum(T_i^2*t_i) / sum(t_i))` -- the general per-phase
 * effective-torque shape, applied directly to an explicit phase list
 * rather than derived from `resolveEffectiveTorque`'s own closed-form
 * three-term expression. Never calls, and does not depend on, `./math.ts`.
 */
export function resolvePhaseRmsTorque(phases: readonly RmsTorquePhase[]): number {
  const totalDurationS = phases.reduce((sum, phase) => sum + phase.durationS, 0);
  const weightedSquareSum = phases.reduce(
    (sum, phase) => sum + phase.torqueNm ** 2 * phase.durationS,
    0,
  );
  return Math.sqrt(weightedSquareSum / totalDurationS);
}
```

- [ ] **Step 2: Write the failing test**

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/independent-benchmark.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveDriveForce, resolveEffectiveTorque, resolveLoadTorque } from "./math";
import {
  resolveOrientalMotorLoadTorque,
  resolvePhaseRmsTorque,
  type RmsTorquePhase,
} from "./independent-benchmark";

const G = 9.80665;

describe("independent benchmark: force/load-torque (carried over from 0.1.0)", () => {
  it("agrees with this module's own two-function kernel across a property sweep", () => {
    const masses = [10, 50, 200];
    const inclines = [0, Math.PI / 6, Math.PI / 2];
    const frictions = [0, 0.1, 0.3];
    const externalForces = [-20, 0, 50];
    const diameters = [0.05, 0.08, 0.2];
    const efficiencies = [0.7, 0.9, 1.0];
    const gearRatios = [1, 5, 10];

    for (const mass of masses) {
      for (const incline of inclines) {
        for (const friction of frictions) {
          for (const externalForce of externalForces) {
            for (const diameter of diameters) {
              for (const efficiency of efficiencies) {
                for (const gearRatio of gearRatios) {
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
                    externalForceN: externalForce,
                    pulleyPitchDiameterM: diameter,
                    mechanicalEfficiency: efficiency,
                    gearRatio,
                  }).loadTorqueNm;
                  expect(kernel).toBeCloseTo(benchmark, 9);
                }
              }
            }
          }
        }
      }
    }
  });
});

describe("independent benchmark: effective (RMS) torque (new in 0.2.0)", () => {
  function directPhaseTrms(
    Ta: number,
    TL: number,
    Td: number,
    t1: number,
    t2: number,
    t3: number,
    t4: number,
  ): number {
    const phases: RmsTorquePhase[] = [
      { torqueNm: Ta + TL, durationS: t1 },
      { torqueNm: TL, durationS: t2 },
      { torqueNm: Td - TL, durationS: t3 },
      { torqueNm: 0, durationS: t4 },
    ].filter((phase) => phase.durationS > 0);
    return resolvePhaseRmsTorque(phases);
  }

  it("agrees with resolveEffectiveTorque's own closed form across a property sweep, including t2=0 and t4=0 boundary cases", () => {
    const accelTorques = [1, 5, 20];
    const loadTorques = [0, 2, 10];
    const decelTorques = [1, 5, 20];
    const accelTimes = [0.2, 1, 3];
    const runTimes = [0, 1, 5];
    const decelTimes = [0.2, 1, 3];
    const dwellTimes = [0, 0.5, 2];

    for (const Ta of accelTorques) {
      for (const TL of loadTorques) {
        for (const Td of decelTorques) {
          for (const t1 of accelTimes) {
            for (const t2 of runTimes) {
              for (const t3 of decelTimes) {
                for (const t4 of dwellTimes) {
                  const tf = t1 + t2 + t3 + t4;
                  const closedForm = resolveEffectiveTorque({
                    accelerationTorqueNm: Ta,
                    loadTorqueNm: TL,
                    decelerationTorqueNm: Td,
                    accelerationTimeS: t1,
                    constantVelocityTimeS: t2,
                    decelerationTimeS: t3,
                    cycleTimeS: tf,
                  }).effectiveTorqueNm;
                  const direct = directPhaseTrms(Ta, TL, Td, t1, t2, t3, t4);
                  expect(closedForm).toBeCloseTo(direct, 9);
                }
              }
            }
          }
        }
      }
    }
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run lib/modules/belt-pulley-drive-motor-sizing/0.2.0/independent-benchmark.test.ts`
Expected: PASS. (The two sweeps together run several thousand assertions; if this is slow, that is expected and not a failure — Vitest's own default timeout is per-test, not per-assertion, and both `it` blocks complete in well under a second in practice for loops of this size.)

- [ ] **Step 4: Lint, typecheck, commit**

Run: `npm run lint -- lib/modules/belt-pulley-drive-motor-sizing/0.2.0/independent-benchmark.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/independent-benchmark.test.ts && npm run typecheck`
Expected: both clean.

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.2.0/independent-benchmark.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/independent-benchmark.test.ts
git commit -m "feat: add belt-pulley-drive-motor-sizing 0.2.0 independent benchmarks"
```

---

### Task 11: AutomationDirect reference example, reformulated for `motion_mode`

**Files:**
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/automationdirect-reference-example.ts`
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/automationdirect-reference-example.test.ts`

- [ ] **Step 1: Create the fixture**

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/automationdirect-reference-example.ts`:

```ts
// AutomationDirect's own "Belt Drive - Example Calculations" worked
// example (us.automationdirect.sureservo_selection_appendix@
// 2nd-ed-rev-b-08-2011, pp. B-11-B-13), reformulated for 0.2.0's own
// motion_mode="velocity" inputs. Geometry/mass/friction/efficiency
// figures are identical to 0.1.0's own copy of this fixture; the single
// printed 4.0s move time with 1.0s/1.0s accel/decel is now split
// explicitly into acceleration_time=1.0s, deceleration_time=1.0s,
// constant_velocity_time=2.0s (4.0 - 1.0 - 1.0), dwell_time=0s -- the
// source's own printed move time is unchanged, just decomposed into
// 0.2.0's own four-phase shape.

import { makeQuantity } from "@/lib/engine";
import type { RawInput } from "./test-helpers";

const LB_TO_KG = 0.45359237;
const IN_TO_M = 0.0254;
const LBF_IN_S2_TO_KG_M2 = 4.4482216152605 * IN_TO_M;
const LBF_IN_TO_NM = LBF_IN_S2_TO_KG_M2;

const TABLE_AND_WORKPIECE_WEIGHT_LB = 90;
const FRICTION_COEFFICIENT = 0.05;
const MECHANICAL_EFFICIENCY = 0.8;
const PULLEY_DIAMETER_IN = 2.0;
const PULLEY_THICKNESS_IN = 0.75;
const ALUMINUM_DENSITY_LB_PER_IN3 = 0.098;
const GEAR_RATIO = 10;
const STROKE_IN = 50;
const MOVE_TIME_S = 4.0;
const ACCEL_TIME_S = 1.0;
const DECEL_TIME_S = 1.0;
const CONSTANT_VELOCITY_TIME_S = MOVE_TIME_S - ACCEL_TIME_S - DECEL_TIME_S;

const pulleyDiameterM = PULLEY_DIAMETER_IN * IN_TO_M;
const pulleyRadiusM = pulleyDiameterM / 2;
const pulleyVolumeM3 =
  (Math.PI / 4) * pulleyDiameterM ** 2 * (PULLEY_THICKNESS_IN * IN_TO_M);
const aluminumDensityKgPerM3 =
  ALUMINUM_DENSITY_LB_PER_IN3 * (LB_TO_KG / IN_TO_M ** 3);
const PULLEY_MASS_KG = aluminumDensityKgPerM3 * pulleyVolumeM3;

const TOTAL_MOVING_MASS_KG = TABLE_AND_WORKPIECE_WEIGHT_LB * LB_TO_KG;

const TARGET_VELOCITY_MPS =
  (STROKE_IN / (MOVE_TIME_S - ACCEL_TIME_S)) * IN_TO_M;

export const AUTOMATIONDIRECT_BELT_DRIVE_REFERENCE_EXAMPLE: RawInput = {
  values: {
    orientation: {
      v: 1,
      kind: "enum",
      enumId: "axis_orientation",
      value: "horizontal",
    },
    incline_angle: makeQuantity(0, "rad"),
    friction_coefficient: makeQuantity(FRICTION_COEFFICIENT, "ratio"),
    total_moving_mass: makeQuantity(TOTAL_MOVING_MASS_KG, "kg"),
    pulley_pitch_diameter: makeQuantity(pulleyDiameterM, "m"),
    pulley_mass: makeQuantity(PULLEY_MASS_KG, "kg"),
    idler_pulley_mass: makeQuantity(PULLEY_MASS_KG, "kg"),
    belt_mass: makeQuantity(0, "kg"),
    gear_ratio: makeQuantity(GEAR_RATIO, "ratio"),
    mechanical_efficiency: makeQuantity(MECHANICAL_EFFICIENCY, "ratio"),
    external_force: makeQuantity(0, "N"),
    motion_mode: {
      v: 1,
      kind: "enum",
      enumId: "belt_pulley_motion_mode",
      value: "velocity",
    },
    target_velocity: makeQuantity(TARGET_VELOCITY_MPS, "m/s"),
    acceleration_time: makeQuantity(ACCEL_TIME_S, "s"),
    deceleration_time: makeQuantity(DECEL_TIME_S, "s"),
    constant_velocity_time: makeQuantity(CONSTANT_VELOCITY_TIME_S, "s"),
    dwell_time: makeQuantity(0, "s"),
    // Not printed by the source as a standalone figure -- see 0.1.0's own
    // automationdirect-reference-example.test.ts header comment for why
    // this value is derived from the printed inertia_ratio=9.6 rather
    // than claimed as a source figure. Carried over unchanged.
    motor_rotor_inertia: makeQuantity(3.4372e-5, "kg*m^2"),
    required_torque_safety_factor: makeQuantity(1, "ratio"),
    inertia_ratio_maximum: makeQuantity(1e6, "ratio"),
  },
};

export const PRINTED_PULLEY_INERTIA_LB_IN_S2 = 0.000598;
export const PRINTED_PULLEY_INERTIA_KGM2 =
  PRINTED_PULLEY_INERTIA_LB_IN_S2 * LBF_IN_S2_TO_KG_M2;

export const PRINTED_LOAD_INERTIA_WITH_EFFICIENCY_LB_IN_S2 = 0.29145;
export const PRINTED_LOAD_INERTIA_WITH_EFFICIENCY_KGM2 =
  PRINTED_LOAD_INERTIA_WITH_EFFICIENCY_LB_IN_S2 * LBF_IN_S2_TO_KG_M2;

export const PRINTED_REFLECTED_INERTIA_WITH_EFFICIENCY_LB_IN_S2 = 0.00292;
export const PRINTED_REFLECTED_INERTIA_WITH_EFFICIENCY_KGM2 =
  PRINTED_REFLECTED_INERTIA_WITH_EFFICIENCY_LB_IN_S2 * LBF_IN_S2_TO_KG_M2;

export {
  PULLEY_MASS_KG,
  TOTAL_MOVING_MASS_KG,
  TARGET_VELOCITY_MPS,
  pulleyDiameterM,
  pulleyRadiusM,
  LBF_IN_TO_NM,
};
```

- [ ] **Step 2: Write the test**

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/automationdirect-reference-example.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { executeModule } from "@/lib/engine";
import { beltPulleyDriveMotorSizingModule } from "./package";
import { asQuantity } from "./test-helpers";
import {
  AUTOMATIONDIRECT_BELT_DRIVE_REFERENCE_EXAMPLE,
  PRINTED_PULLEY_INERTIA_KGM2,
} from "./automationdirect-reference-example";

describe("belt-pulley-drive-motor-sizing 0.2.0: AutomationDirect belt-drive reference example", () => {
  it("reproduces the source's own printed pulley_inertia within 0.2% (carried over unchanged from 0.1.0)", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      AUTOMATIONDIRECT_BELT_DRIVE_REFERENCE_EXAMPLE,
    );
    const pulleyInertia = asQuantity(result.outputs.pulley_inertia).value;
    expect(pulleyInertia).toBeCloseTo(PRINTED_PULLEY_INERTIA_KGM2, 5);
  });

  it("reproduces the source's own printed 4.0s move time as cycle_time, decomposed into 1.0s/2.0s/1.0s/0s", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      AUTOMATIONDIRECT_BELT_DRIVE_REFERENCE_EXAMPLE,
    );
    expect(asQuantity(result.outputs.cycle_time).value).toBeCloseTo(4.0, 9);
    expect(
      asQuantity(result.outputs.constant_velocity_time).value,
    ).toBeCloseTo(2.0, 9);
  });

  it("deceleration_torque equals acceleration_torque -- the source's own symmetric 1.0s/1.0s accel/decel", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      AUTOMATIONDIRECT_BELT_DRIVE_REFERENCE_EXAMPLE,
    );
    expect(asQuantity(result.outputs.deceleration_torque).value).toBeCloseTo(
      asQuantity(result.outputs.acceleration_torque).value,
      9,
    );
  });

  it("computes a positive, finite effective_torque -- not claimed against a printed figure (no worked Trms example in this source; see validation.ts)", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      AUTOMATIONDIRECT_BELT_DRIVE_REFERENCE_EXAMPLE,
    );
    const trms = asQuantity(result.outputs.effective_torque).value;
    expect(Number.isFinite(trms)).toBe(true);
    expect(trms).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run lib/modules/belt-pulley-drive-motor-sizing/0.2.0/automationdirect-reference-example.test.ts`
Expected: PASS.

- [ ] **Step 4: Lint, typecheck, commit**

Run: `npm run lint -- lib/modules/belt-pulley-drive-motor-sizing/0.2.0/automationdirect-reference-example.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/automationdirect-reference-example.test.ts && npm run typecheck`
Expected: both clean.

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.2.0/automationdirect-reference-example.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/automationdirect-reference-example.test.ts
git commit -m "feat: add belt-pulley-drive-motor-sizing 0.2.0 AutomationDirect reference example"
```

---

### Task 12: `cross-module-links.test.ts` — including `0.1.0` as a sibling upstream

**Files:**
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/cross-module-links.test.ts`

This file adds two upstream modules 0.1.0's own version of this file did not have: `belt-pulley-drive-motor-sizing@0.1.0` itself (now a coexisting sibling version, released after 0.1.0's own file was written, so its own outputs need sweeping against 0.2.0's inputs too) and `index-table-motor-sizing@0.1.0` (released after 0.1.0's own file was written).

- [ ] **Step 1: Create the test file**

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/cross-module-links.test.ts`:

```ts
// Cross-module link compatibility tests for belt-pulley-drive-motor-sizing
// 0.2.0 (code-standards.md "Module Testing"; ai-workflow-rules.md Stage 5).
// Includes belt-pulley-drive-motor-sizing@0.1.0 itself as an upstream --
// the first time this project sweeps one module version's own outputs
// against a later version of the SAME module's own inputs -- since the
// two coexist as separate registered packages (0.1.0 stays released,
// immutable, and un-superseded).

import { describe, expect, it } from "vitest";
import {
  asNodeId,
  asScopeId,
  evaluateLinkCompatibility,
  type GraphNode,
  type ModuleInputPort,
  type ModuleOutputPort,
} from "@/lib/engine";
import { manifest, ports } from "./manifest";
import { ports as axisLoadCasesPorts } from "../../axis-load-cases/0.1.0/manifest";
import { ports as ballScrewPorts } from "../../ball-screw/0.1.0/manifest";
import { ports as motionProfilePorts } from "../../motion-profile/0.1.0/manifest";
import { ports as linearGuidePorts } from "../../linear-guide/0.1.0/manifest";
import { ports as couplingPorts } from "../../coupling/0.1.0/manifest";
import { ports as supportBearingPorts } from "../../support-bearing/0.1.0/manifest";
import { ports as driveTrainPorts } from "../../drive-train/0.1.0/manifest";
import { ports as ballScrewMotorSizingPorts } from "../../ball-screw-motor-sizing/0.1.0/manifest";
import { ports as directDriveConveyorMotorSizingPorts } from "../../direct-drive-conveyor-motor-sizing/0.1.0/manifest";
import { ports as rackPinionMotorSizingPorts } from "../../rack-pinion-motor-sizing/0.1.0/manifest";
import { ports as indexTableMotorSizingPorts } from "../../index-table-motor-sizing/0.1.0/manifest";
import { ports as beltPulleyDriveMotorSizing010Ports } from "../0.1.0/manifest";

const SCOPE = asScopeId("test-scope");

function outputNode(
  port: ModuleOutputPort,
  moduleInstanceId: string,
): GraphNode {
  return {
    id: asNodeId(`${moduleInstanceId}.${port.key}`),
    kind: "module_output",
    parameterId: port.parameterId,
    scopeId: SCOPE,
    moduleInstanceId,
    ...(port.loadCase !== undefined && { loadCase: port.loadCase }),
  };
}

function inputNode(port: ModuleInputPort, moduleInstanceId: string): GraphNode {
  return {
    id: asNodeId(`${moduleInstanceId}.${port.key}`),
    kind: "module_input",
    parameterId: port.parameterId,
    scopeId: SCOPE,
    moduleInstanceId,
    ...(port.loadCase !== undefined && { loadCase: port.loadCase }),
  };
}

function findPort<T extends { key: string }>(
  candidatePorts: readonly T[],
  key: string,
): T {
  const found = candidatePorts.find((p) => p.key === key);
  if (found === undefined) {
    throw new Error(`Port "${key}" not found in the supplied port list.`);
  }
  return found;
}

const UPSTREAM_MODULES: ReadonlyArray<{
  readonly label: string;
  readonly outputs: readonly ModuleOutputPort[];
}> = [
  { label: "axis-load-cases", outputs: axisLoadCasesPorts.outputs },
  { label: "ball-screw", outputs: ballScrewPorts.outputs },
  { label: "motion-profile", outputs: motionProfilePorts.outputs },
  { label: "linear-guide", outputs: linearGuidePorts.outputs },
  { label: "coupling", outputs: couplingPorts.outputs },
  { label: "support-bearing", outputs: supportBearingPorts.outputs },
  { label: "drive-train", outputs: driveTrainPorts.outputs },
  {
    label: "ball-screw-motor-sizing",
    outputs: ballScrewMotorSizingPorts.outputs,
  },
  {
    label: "direct-drive-conveyor-motor-sizing",
    outputs: directDriveConveyorMotorSizingPorts.outputs,
  },
  {
    label: "rack-pinion-motor-sizing",
    outputs: rackPinionMotorSizingPorts.outputs,
  },
  {
    label: "index-table-motor-sizing",
    outputs: indexTableMotorSizingPorts.outputs,
  },
  {
    label: "belt-pulley-drive-motor-sizing-0.1.0",
    outputs: beltPulleyDriveMotorSizing010Ports.outputs,
  },
];

// axis-load-cases@0.1.0's own resolved total_moving_mass output shares the
// identical motion.axis.total_moving_mass parameter ID this module also
// reuses -- the same real, incidental compatible pair 0.1.0's own sweep
// already found and documented for itself.
const KNOWN_COMPATIBLE_PAIRS: ReadonlySet<string> = new Set([
  "axis-load-cases.total_moving_mass->total_moving_mass",
]);

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
          const pairKey = `${upstream.label}.${outputKey}->${inputKey}`;
          if (KNOWN_COMPATIBLE_PAIRS.has(pairKey)) continue;

          const result = evaluateLinkCompatibility(source, sink);
          expect(
            result.compatible,
            `expected ${upstream.label} output "${source.id}" to be incompatible with input "${sink.id}", but evaluateLinkCompatibility reported compatible (reasons: ${JSON.stringify(result.reasons)}) -- if this is a new, real, intentional compatibility, add it to KNOWN_COMPATIBLE_PAIRS and a confirming test; if not, something changed unexpectedly`,
          ).toBe(false);
        }
      }
    });
  }

  it("confirms the one documented exception really is compatible: axis-load-cases' own resolved total_moving_mass output feeds this module's total_moving_mass input", () => {
    const source = outputNode(
      findPort(axisLoadCasesPorts.outputs, "total_moving_mass"),
      "axis-load-cases-1",
    );
    const sink = inputNode(
      findPort(ports.inputs, "total_moving_mass"),
      "belt-pulley-drive-motor-sizing-0.2.0-1",
    );
    const result = evaluateLinkCompatibility(source, sink);
    expect(result.compatible).toBe(true);
    expect(result.reasons).toEqual([]);
  });
});

describe("belt-pulley-drive-motor-sizing 0.2.0 workflow role: deliberately none", () => {
  it("declares no workflowRoles -- this module is not part of the linear-axis@1 workflow, and no other guided workflow exists for the motor-sizing.* family yet (ADR-0011)", () => {
    expect(manifest.workflowRoles).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run lib/modules/belt-pulley-drive-motor-sizing/0.2.0/cross-module-links.test.ts`
Expected: PASS. If the `belt-pulley-drive-motor-sizing-0.1.0` sweep unexpectedly finds a compatible pair, inspect it directly — 0.1.0's own 12 output parameter IDs are all computed-result quantities (`load_torque`, `momentary_torque`, etc.) that do not appear among 0.2.0's own input port list, so this is expected to pass with zero new entries in `KNOWN_COMPATIBLE_PAIRS`; if it does not, that is real information about an unexpected parameter-ID collision, not a test bug to work around.

- [ ] **Step 3: Lint, typecheck, commit**

Run: `npm run lint -- lib/modules/belt-pulley-drive-motor-sizing/0.2.0/cross-module-links.test.ts && npm run typecheck`
Expected: both clean.

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.2.0/cross-module-links.test.ts
git commit -m "feat: add belt-pulley-drive-motor-sizing 0.2.0 cross-module link sweep"
```

---

### Task 13: Stage 6 release — rename to `index.ts`, pin the final source hash, register

**Files:**
- Rename: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/package.ts` → `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/index.ts`
- Modify: every file in `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/` that imports `from "./package"`
- Modify: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/package.test.ts` (final `EXPECTED_SOURCE_HASH`)
- Regenerate: `lib/modules/registry.generated.ts`

- [ ] **Step 1: Rename the draft package file**

Run (PowerShell): `Move-Item "lib/modules/belt-pulley-drive-motor-sizing/0.2.0/package.ts" "lib/modules/belt-pulley-drive-motor-sizing/0.2.0/index.ts"`

- [ ] **Step 2: Update every import of `./package` to `./index`**

In `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/package.test.ts`, replace:
```ts
import { beltPulleyDriveMotorSizingModule } from "./package";
```
With:
```ts
import { beltPulleyDriveMotorSizingModule } from "./index";
```

In `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/automationdirect-reference-example.test.ts`, replace:
```ts
import { beltPulleyDriveMotorSizingModule } from "./package";
```
With:
```ts
import { beltPulleyDriveMotorSizingModule } from "./index";
```

Update `index.ts`'s own header comment (the file just renamed) — replace:
```ts
// The belt-pulley-drive-motor-sizing 0.2.0 package draft. Assembles the
// manifest, ports, compute, UI, report, and validation record into a
// single `ModulePackage` and seals it. Named `package.ts`, not `index.ts`,
// so `npm run registry:generate` does not discover it yet -- Task 14
// renames it to `index.ts` at Stage 6 release, the same convention every
// prior module followed (see e.g. drive-train@0.1.0's own README.md
// "Stage 6").
```
With:
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

- [ ] **Step 3: Recompute and pin the final source-immutability hash**

Run: `npm run module:source-hash -- belt-pulley-drive-motor-sizing 0.2.0`

In `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/package.test.ts`, replace the provisional value from Task 9 with this freshly printed one:
```ts
const EXPECTED_SOURCE_HASH = "<HASH>";
```
(substituting the real printed value)

- [ ] **Step 4: Run the full module test suite for this directory**

Run: `npx vitest run lib/modules/belt-pulley-drive-motor-sizing/0.2.0/`
Expected: PASS — every test file in the directory (`input-schema.test.ts`, `math.test.ts`, `package.test.ts`, `independent-benchmark.test.ts`, `automationdirect-reference-example.test.ts`, `cross-module-links.test.ts`).

- [ ] **Step 5: Register the package**

Run: `npm run registry:generate`
Expected: `lib/modules/registry.generated.ts` is regenerated with a new `"belt-pulley-drive-motor-sizing@0.2.0"` entry, alongside the untouched `"belt-pulley-drive-motor-sizing@0.1.0"` entry.

Run: `npx vitest run lib/modules/registry.generated.test.ts` (if this file exists — otherwise run `npm run typecheck` to confirm the regenerated file compiles)
Expected: PASS.

- [ ] **Step 6: Full typecheck, lint, commit**

Run: `npm run typecheck && npm run lint -- lib/modules/belt-pulley-drive-motor-sizing/0.2.0/index.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/package.test.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/automationdirect-reference-example.test.ts lib/modules/registry.generated.ts`
Expected: both clean.

```bash
git add lib/modules/belt-pulley-drive-motor-sizing/0.2.0/index.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/package.test.ts lib/modules/belt-pulley-drive-motor-sizing/0.2.0/automationdirect-reference-example.test.ts lib/modules/registry.generated.ts
git commit -m "feat: release belt-pulley-drive-motor-sizing@0.2.0"
```

---

### Task 14: Validation record, source-index rows, README

**Files:**
- Create: `validation/belt-pulley-drive-motor-sizing/0.2.0.md`
- Modify: `validation/source-index.md`
- Create: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/README.md`

- [ ] **Step 1: Write the validation record**

Create `validation/belt-pulley-drive-motor-sizing/0.2.0.md`, using the real `packageContentHash` and `EXPECTED_SOURCE_HASH` values Task 13 printed:

```markdown
# Module Validation Record — `belt-pulley-drive-motor-sizing` 0.2.0

Completed against `validation/module-validation-template.md` (Unit 0.5).
This record documents Stage 4 (Validation) and Stage 6 (Release) of the New
Module Workflow (`context/ai-workflow-rules.md`) for
`belt-pulley-drive-motor-sizing` 0.2.0 — the first module-version bump in
this project, following `docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md`
and ADR-0011's own "follow-on work" note (embed motion-profile math
natively inside each mechanism module, rather than cross-module-linking
it). `0.1.0` stays released, registered, and untouched
(`lib/modules/belt-pulley-drive-motor-sizing/0.1.0/`) — nothing in this
release edits it.

**A disclosed, open evidence gap, not a defect.** Oriental Motor's own
"Motor Sizing Calculations" page states the effective (RMS) torque formula
generically, for all motors — not belt/pulley-specific — with no worked
numerical example carrying printed per-phase torque figures. Per the
design doc's own pre-approved fallback, `effective_torque` is validated
via an algebraic-identity independent benchmark only; the missing
published example is recorded here as an open gap, to be closed against a
real project's own duty-cycle results later, never a synthetic fixture.

## Module Identity

- Module ID: `belt-pulley-drive-motor-sizing`
- Version validated: `0.2.0`
- Package content hash: `<CONTENT_HASH>` (`ModuleManifest.contentHash`,
  sealed by `sealModulePackage` in
  `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/index.ts`)
- Module source-immutability hash: `<HASH>` (`npm run module:source-hash
  -- belt-pulley-drive-motor-sizing 0.2.0`; pinned in
  `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/package.test.ts`)
- Parameter-registry version this module's ports were released against:
  `1.14.0` (`lib/modules/belt-pulley-drive-motor-sizing/0.2.0/manifest.ts`)
- Validation date: `2026-08-14` (Stage 4); release date: `2026-08-14`
  (Stage 6)

## Purpose and Supported Applications

Everything `0.1.0` already computes (inertia, drive force, load torque,
momentary/required torque, operating speed, required power), plus: a
native repeating trapezoidal motion cycle (accelerate/run/decelerate/
dwell), entered either velocity-first or distance-first via `motion_mode`,
and two new outputs — `deceleration_torque` (symmetric to
`acceleration_torque`) and `effective_torque` (Trms, for continuous/
thermal motor rating). `required_torque` stays governed by the
acceleration phase alone; `effective_torque` is additive, not a
replacement.

## Validity Envelope and Assumptions

- Everything `0.1.0` already assumes (one belt-and-pulley linear drive,
  two equal-diameter pulleys, a rigid carriage, no belt tension/tooth-
  shear/wrap-angle selection, no motor catalog matching).
- Load torque is assumed constant across all four motion phases — true
  for this mechanism's own force-balance model (orientation/mass/friction
  do not change mid-cycle), not an approximation across a module boundary.
- Self-contained: duplicates, rather than imports, `0.1.0`'s own unchanged
  kernel functions (`context/modules/belt-pulley-drive-motor-sizing/
  stage-2-contract.md` "0.2.0 Addendum" cross-version reuse policy).

## Sources and Methods Used

| Source revision | Classification | Used for |
| --- | --- | --- |
| `jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004` | `manufacturer_method` | Primary formula source for inertia/force/load-torque, unchanged from 0.1.0. |
| `us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011` | `manufacturer_method` | Reference example, reformulated for `motion_mode="velocity"` (Task 11). |
| `jp.oriental_motor.motor_sizing_calculations@web-2026-08-08` | `manufacturer_method` | New in 0.2.0: primary formula source for acceleration/deceleration torque (pp. 5-6, "Common Formula for All Motors") and effective (RMS) torque (p. 6). Generic, not belt/pulley-specific; no worked numerical example. |

## Reference Examples (Published Worked Examples)

Carried over from `0.1.0` (unchanged geometry/mass): `pulley_inertia`
matches the source's own printed figure within `0.2%`; `load_inertia` and
the reflected-to-motor inertia match within `0.1%` after reapplying
AutomationDirect's own disclosed `1/e` convention; `load_torque`/
`momentary_torque`/`required_torque` are not reproduced (efficiency
convention plus a confirmed source-internal arithmetic slip, both
disclosed in `0.1.0`'s own record).

**New in 0.2.0:** the source's own printed `4.0 s` move time (with `1.0 s`
accel/decel) decomposes exactly into `acceleration_time=1.0s`,
`deceleration_time=1.0s`, `constant_velocity_time=2.0s`, `dwell_time=0s`
— `cycle_time` reproduces the source's own printed `4.0 s` exactly.
`deceleration_torque` equals `acceleration_torque` (an internal-consistency
check given the source's own symmetric accel/decel times, not a claim
against a printed figure — none exists). `effective_torque` computes to a
positive, finite value bounded between `load_torque` and `momentary_torque`
but is **not** claimed to match any printed figure — the source gives none
(see "Unsupported Conditions").

## Independent Method or Tool Comparison

**Satisfied (2026-08-14).** Two independent benchmarks:

1. Carried over from `0.1.0`: the force/load-torque single-expression
   reimplementation, a 300+-scenario property sweep, algebraic identity to
   floating-point precision.
2. **New in 0.2.0:** `resolveEffectiveTorque`'s own closed-form Trms
   cross-checked against a structurally different direct per-phase
   computation (`Trms = sqrt(sum(T_i^2*t_i)/tf)` over an explicit
   four-phase list, dwell torque fixed at zero) — the same "structurally
   separate reimplementation, proved identical" pattern
   `drive-train@0.1.0`'s own `closed-cycle-benchmark.ts` already
   establishes. A deterministic property sweep (torque magnitudes and
   phase durations varied, including the `t2=0` triangular-move and
   `t4=0` no-dwell boundary cases) confirms algebraic identity to
   floating-point precision.

## Tolerances and Deviations

Carried over unchanged from `0.1.0`: the efficiency-convention
disagreement between Oriental Motor and AutomationDirect, and the
confirmed arithmetic slip in AutomationDirect's own friction-force line —
see `validation/belt-pulley-drive-motor-sizing/0.1.0.md` for the full
account.

## Unsupported Conditions

- Everything `0.1.0` already excludes (unequal pulley diameters, belt
  tension/tooth-shear/wrap-angle selection, motor catalog matching).
- `effective_torque` has no published worked numerical example — Oriental
  Motor's own source page states the formula generically, for all motors,
  with no belt/pulley-specific figures. Validated only via the
  algebraic-identity independent benchmark above. A disclosed, open Stage
  4 evidence gap, to be closed against a real project's own duty-cycle
  results later, never a synthetic fixture.
- No `linear-axis@1` or other guided-workflow role — standalone, same as
  `0.1.0` (ADR-0011).

## Boundary and Invalid-Input Coverage

- [x] Boundary and invalid-input tests — `math.test.ts` (the `t2<0`
      feasibility error, the `t2=0` triangular-move boundary case),
      `input-schema.test.ts` (per-mode conditional requirement),
      `package.test.ts`
- [x] Dimensional / unit tests — `package.test.ts`
- [x] Serialization round-trip tests — `package.test.ts`, plus the generic
      module conformance suite (`runModuleConformance`)
- [x] Property or monotonicity tests where physically valid —
      `math.test.ts` (velocity-mode/distance-mode round-trip identity;
      `resolveEffectiveTorque` boundary cases); `package.test.ts`
      (velocity mode and distance mode agree on every downstream output
      for an equivalent scenario; `effective_torque` is bounded between
      `load_torque` and `momentary_torque`)
- [x] Trace snapshot tests for stable step IDs — `package.test.ts`
      (`execution` check, via `runModuleConformance`)
- [x] Module conformance suite — `package.test.ts` (`package-validation`,
      `import-boundary`, `source-immutability`, `execution` all pass;
      "passes overall conformance")
- [x] Cross-module link compatibility tests — `cross-module-links.test.ts`
      (an exhaustive sweep against all Milestone-4 and Motor Sizing Tool
      modules, plus `belt-pulley-drive-motor-sizing@0.1.0` itself as a
      coexisting sibling version — the first such version-to-version
      sweep in this project)
- [x] Guided-workflow integration tests — not applicable;
      `workflowRoles: []`, confirmed by `cross-module-links.test.ts`

Test file paths: `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/
input-schema.test.ts`, `math.test.ts`, `package.test.ts`,
`independent-benchmark.test.ts`, `automationdirect-reference-example.test.ts`,
`cross-module-links.test.ts`.

## Reviewer

- Reviewer: solo validation, independent-benchmark substitute
- Review date: `2026-08-14`
- Review scope: not applicable (solo validation)

### Solo validation reviewer-substitute rule

No second engineer was available. Per the documented solo-validation
policy (`context/ai-workflow-rules.md` Stage 4), the two independent
benchmarks above serve as the review substitute, the same role this
pattern already played for `0.1.0` and every prior Motor Sizing Tool
module.

`lib/modules/belt-pulley-drive-motor-sizing/0.2.0/validation.ts` records
`reviewer` as `"Solo validation -- independent-benchmark substitute"` and
`reviewDate` as `"2026-08-14"`.

## Supported Use Limits (Summary)

Everything `0.1.0` already supports, plus a repeating trapezoidal motion
cycle (velocity-first or distance-first), `deceleration_torque`, and
`effective_torque` — the last validated via algebraic-identity independent
benchmark only, no published worked example (a disclosed, open gap).
Released and registered as `belt-pulley-drive-motor-sizing@0.2.0`
2026-08-14 — coexisting with, not superseding, `0.1.0`.

## Sign-off

- [x] All reference examples pass within stated tolerance (partial
      reproduction, precisely quantified and disclosed — carried over
      from `0.1.0`, plus the new `cycle_time`/`deceleration_torque`
      reproductions above)
- [x] Independent comparison completed and recorded (two benchmarks)
- [x] Unsupported conditions documented
- [x] Reviewer (solo reviewer-substitute) recorded
- [x] Test coverage checklist above complete
- [x] `validation/source-index.md` updated with every source revision used
      above

- Validation performed: `2026-08-14`; released: `2026-08-14`
- Reviewer: solo validation, independent-benchmark substitute (see
  "Reviewer" above)
- Release status: **released and registered as
  `belt-pulley-drive-motor-sizing@0.2.0` 2026-08-14**
  (`lib/modules/registry.generated.ts`) — `0.1.0` stays registered,
  immutable, and un-superseded. No workflow role (deliberate, ADR-0011);
  cross-module link compatibility confirmed
  (`cross-module-links.test.ts`).
```

- [ ] **Step 2: Add `validation/source-index.md` rows**

Append two new rows to `validation/source-index.md` (following its own existing table row format — see the file's own last rows for the exact column order):

```markdown
| `jp.oriental_motor.motor_sizing_calculations@web-2026-08-08` | Motor Sizing Calculations | `manufacturer_method` | web page, accessed 2026-08-08; additionally verified pp. 5-6, 2026-08-13/14 | `belt-pulley-drive-motor-sizing@0.2.0` | `validation/belt-pulley-drive-motor-sizing/0.2.0.md` | Primary formula source for acceleration/deceleration torque and effective (RMS) torque (pp. 5-6, "Common Formula for All Motors" / "Calculation for the Effective Load Torque (Trms)"). Generic, not belt/pulley-specific; no worked numerical example. |
| `us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011` | SureServo Selection Appendix | `manufacturer_method` | 2nd Edition, Rev. B, 08/2011 | `belt-pulley-drive-motor-sizing@0.2.0` | `validation/belt-pulley-drive-motor-sizing/0.2.0.md` | Same reference example as 0.1.0's own row, reformulated for motion_mode="velocity": the source's own printed 4.0s move time decomposes exactly into 1.0s/2.0s/1.0s/0s accel/run/decel/dwell. |
```

- [ ] **Step 3: Write the module README**

Create `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/README.md`:

```markdown
# Belt-Pulley Drive Motor Sizing Module `0.2.0` (`belt-pulley-drive-motor-sizing`)

The first module-version bump in this project, following
`docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md`
and ADR-0011's own "follow-on work" note. `0.1.0` stays released,
registered, and untouched (`lib/modules/belt-pulley-drive-motor-sizing/0.1.0/`).

Adds, on top of everything `0.1.0` already computes: a native repeating
trapezoidal motion cycle (accelerate/run/decelerate/dwell), entered either
velocity-first (`target_velocity` + `constant_velocity_time`) or
distance-first (`travel_distance` + `cycle_time`) via `motion_mode`, plus
`deceleration_torque` (symmetric to `acceleration_torque`) and
`effective_torque` (Trms, for continuous/thermal motor rating).
`required_torque` stays governed by the acceleration phase alone;
`effective_torque` is additive, not a replacement.

Full specification: `context/modules/belt-pulley-drive-motor-sizing/
stage-2-contract.md` "0.2.0 Addendum".

## Status

- Stage 1: **done** (this session — Oriental Motor's own Trms formula
  confirmed against the cached PDF, pp. 5-6; generic, not belt/pulley-
  specific; no worked example).
- Stage 2 (parameter contract): **done** — registry `1.14.0` releases 8
  new `motor_sizing.belt_pulley.*` parameters.
- Stage 3 (compute and trace): **done** — self-contained; duplicates
  0.1.0's own unchanged kernel functions rather than importing them
  (`stage-2-contract.md` "0.2.0 Addendum" cross-version reuse policy).
- Stage 4 (validation): **done** — see `validation/belt-pulley-drive-
  motor-sizing/0.2.0.md`. `effective_torque` has a disclosed, open gap
  (no published worked example), validated via algebraic-identity
  independent benchmark only.
- Stage 5 (generic surfaces, workflow role/link integration,
  conformance): **done**.
- Stage 6 (release): **done** — registered as
  `belt-pulley-drive-motor-sizing@0.2.0`
  (`lib/modules/registry.generated.ts`).

## Cross-version reuse policy

`0.2.0`'s own kernel duplicates every unchanged pure function from
`0.1.0`'s own `math.ts` rather than importing across version directories
— module conformance's own `import-boundary` check restricts a module
package to its own files plus the engine's public surface, and this
project's "reproduce, don't import" reuse policy (ADR-0011) is treated as
extending to a version bump, conservatively, since nothing in that
check's own design carves out an exception for "a different version of
the same module ID."

## Not in scope for `0.2.0`

- Unequal drive/idler pulley diameters, belt tension/width/pitch,
  tooth-shear, or wrap-angle selection, motor catalog matching — same as
  `0.1.0`.
- A pass/fail check on `effective_torque` — no source found gives a
  universal continuous-torque acceptance criterion for this mechanism
  family.
- Any change to `0.1.0`, any other Motor Sizing Tool module, or
  `motion-profile@0.1.0`/`drive-train@0.1.0` (design doc's own "Out of
  Scope").
```

- [ ] **Step 4: Lint, commit**

Run: `npm run lint -- lib/modules/belt-pulley-drive-motor-sizing/0.2.0/README.md validation/belt-pulley-drive-motor-sizing/0.2.0.md validation/source-index.md` (Markdown files may not be covered by the JS/TS lint config — if `eslint` reports "no files matching," that is expected; skip straight to the commit)

```bash
git add validation/belt-pulley-drive-motor-sizing/0.2.0.md validation/source-index.md lib/modules/belt-pulley-drive-motor-sizing/0.2.0/README.md
git commit -m "docs: add belt-pulley-drive-motor-sizing 0.2.0 validation record and README"
```

---

### Task 15: Full verification and progress-tracker sync

**Files:**
- Modify: `context/progress-tracker.md`

- [ ] **Step 1: Run the full verification suite**

Run: `npm run verify`
Expected: `format:check`, `lint`, `typecheck`, `test`, and `build` all pass. Per this machine's own documented environment notes (`context/progress-tracker.md` "Environment notes"): `format:check`/`lint` may flag the same pre-existing CRLF-vs-LF set and the stale `.worktrees/unit-4-1-release/.next/dev/types/` artifact — confirm every file this plan touched is not among either pre-existing set (it should not be; run `npx prettier --check <each file this plan touched>` directly to confirm if `format:check`'s repo-wide output is too noisy to eyeball). If any live-database test times out against Vitest's 5s default, rerun just that file with a longer `--testTimeout` before concluding it is a real failure — Neon free-tier latency, not a code defect, has caused this before on this machine (see "Environment notes").

- [ ] **Step 2: Confirm no other released module, parameter, run, or baseline was touched**

Run: `git diff --stat main` (or the appropriate base branch) and manually confirm the changed-file list contains only: `context/modules/belt-pulley-drive-motor-sizing/stage-2-contract.md`, `lib/standards/engineering-sources.ts`, `lib/engine/parameters/definitions.ts`, `lib/engine/parameters/registered.ts`, `lib/modules/belt-pulley-drive-motor-sizing/0.2.0/*`, `lib/modules/registry.generated.ts`, `validation/belt-pulley-drive-motor-sizing/0.2.0.md`, `validation/source-index.md`, and this plan's own doc updates. Nothing under `lib/modules/belt-pulley-drive-motor-sizing/0.1.0/`, any other module's own directory, `lib/modules/motion-profile/`, or `lib/modules/drive-train/` should appear (design doc's own "Out of Scope").

- [ ] **Step 3: Update the progress tracker**

In `context/progress-tracker.md`, edit the "Active work" section in place (per `ai-workflow-rules.md` "Documentation Synchronization": edit in place, never append a dated narrative entry) to add a short record that `belt-pulley-drive-motor-sizing@0.2.0` shipped, referencing the design doc and this plan. Follow the file's own existing terse, evidence-cited style. Also update the "Last updated" header narrative the same way item 1 below expects, matching the exact style the module-instance-management release used for its own header addition.

- [ ] **Step 4: Final commit**

```bash
git add context/progress-tracker.md
git commit -m "docs: record belt-pulley-drive-motor-sizing 0.2.0 in the progress tracker"
```

---

## Notes for the executing agent

- Task 8's `validation.ts` and Task 14's validation-record markdown are
  written in final form ahead of the tests that prove their claims
  (Tasks 9-12) — this is a deliberate departure from strict TDD ordering,
  justified because this session already worked out every formula and
  evidence-disposition decision during planning (Stage 1 confirmation,
  above) and there is no ambiguity left for the tests to resolve. If any
  test in Tasks 9-12 fails in a way that contradicts a claim already
  written into `validation.ts`, fix the claim (or the code, if the claim
  was right and the code is wrong) before moving on — do not leave a
  passing test suite next to a validation record that overclaims.
- `EXPECTED_SOURCE_HASH` is set twice: a provisional value in Task 9 (so
  `package.test.ts` can be written and run before the Stage 6 rename), and
  the final value in Task 13 (after `package.ts` becomes `index.ts`, which
  changes the hash). This mirrors the exact "recompute after a deliberate
  change to this directory's own files" step every prior module's own
  `package.test.ts` comment already documents — it is not a mistake to
  "fix" by pinning the hash only once.
- Every new/duplicated kernel function in `math.ts` (Task 5) must be
  checked against the Stage 1 confirmation's own formula transcription
  (this plan's own "Stage 1 confirmation" section) before trusting a
  passing test — a test can pass against a self-consistent but wrong
  transcription. Cross-check `resolveEffectiveTorque`'s own expression
  against `reference/source-material/Oriental_Motor Sizing Calculators.pdf`
  p. 6 directly if anything looks off.
- Do not combine Task 2 (parameter registry) with any other task's commit
  — `ai-workflow-rules.md`'s Split Rules call out a schema/parameter
  change and new engineering formulas as needing separate commits, the
  same isolation the module-instance-management plan's own Task 2 (Prisma
  schema) enforced for the same reason: independently revertable.
- `0.1.0` is released and immutable (`CLAUDE.md`) — no task in this plan
  touches any file under `lib/modules/belt-pulley-drive-motor-sizing/0.1.0/`,
  `validation/belt-pulley-drive-motor-sizing/0.1.0.md`, or any
  already-released parameter definition. If a step here appears to require
  editing one of those, stop and re-read the design doc's own "Versioning
  and Migration" section rather than proceeding.

