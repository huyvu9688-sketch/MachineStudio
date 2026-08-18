# Motor Sizing Tool Family — Gravity, Motion-Mode UI, and Inertia-Ratio Defaults

## Decision

A consistency pass across all five Motor Sizing Tool family modules
(`ball-screw-motor-sizing`, `direct-drive-conveyor-motor-sizing`,
`rack-pinion-motor-sizing`, `index-table-motor-sizing`,
`belt-pulley-drive-motor-sizing`), founder-directed after using the running
app on `belt-pulley-drive-motor-sizing@0.2.0`. Three changes, applied
consistently everywhere they're physically applicable:

1. **Gravity stops being an input.** `motion.axis.gravity` is deleted from
   every affected module's port list; the module's own `math.ts` uses a
   local `9.80665 m/s^2` constant instead. No engineering scenario in this
   product's scope needs a different value, and the parameter already
   defaulted to exactly this figure everywhere — this removes an input that
   never needed to be one.
2. **A new generic UI capability — `disabledWhen`** — lets a module's input
   schema declare that one field should render disabled whenever another
   enum-valued field holds a specific value. `belt-pulley-drive-motor-sizing`
   is the first (and, as of this design, only) consumer: `motion_mode`
   selects whether `{target_velocity, constant_velocity_time}` or
   `{travel_distance, cycle_time}` is the real input pair.
3. **Inertia-ratio maximum gets a recommended default.** Every module's
   existing `inertia_ratio_maximum` input (required, no default, because no
   manufacturer source ever agreed on one value) is joined by a new sibling
   parameter carrying a founder-directed default of `10`, editable, with
   guidance text. The existing computed `inertia_ratio` output and its
   pass/fail check are unchanged in shape; only the check's exceeded-case
   status changes from `fail` to `warning`.

Each of the five modules gets exactly one new version
(`0.1.0` → `0.2.0` for four of them; `0.2.0` → `0.3.0` for
`belt-pulley-drive-motor-sizing`, which already has two released versions).
No released version of any module is edited, deprecated, or hidden
(`ai-workflow-rules.md` "Protected Files"; `CLAUDE.md` invariants).

## Context

Raised directly by the founder after using
`belt-pulley-drive-motor-sizing@0.2.0`: gravity should be fixed rather than
an editable input; the velocity/distance motion-mode toggle should visibly
disable the fields it doesn't use, not just silently ignore them at
validation time; and the inertia-ratio check should offer a sensible,
editable recommended default instead of forcing blank entry every time,
modeled after common servo-industry guidance (5:1 for high-precision/
fast-response, 10:1 for general automation, 20:1 for moderate performance,
up to 30:1+ where a manufacturer allows it). The founder also asked about a
previously-discussed motion-profile chart, which a full search of `context/`,
`docs/`, `components/`, and `validation/` found no trace of — it was never
specced or built in this codebase. That is out of scope here (see "Out of
Scope") and will get its own separate design pass.

Two things investigated during scoping turned out to be bigger than they
first looked, and shaped this design directly:

- **The inertia-ratio question already has a precedent, and the precedent
  went the other way.** `drive-train@0.1.0`'s own Stage 1 spec surveyed five
  sources for a maximum load/rotor inertia ratio and found five disagreeing
  conventions (2:1 to 100:1, depending on control technology and
  positioning objective) — Stage 2 explicitly chose "required input, no
  default" because no source met this project's evidence bar. Shipping a
  default of `10` here is a deliberate, disclosed departure from that
  precedent: it is the founder's own engineering judgment, not a
  manufacturer-sourced figure, and every module's validation record must
  say so plainly rather than imply a source that doesn't exist.
- **Parameter registry immutability rules out editing the existing
  `inertia_ratio_maximum` parameters.**
  `lib/engine/parameters/README.md`: *"Released parameter IDs are
  immutable... never edit a released definition in place."* There is only
  one live registry object (`PARAMETER_REGISTRY`, currently `1.14.0`) — a
  version number is a compatibility checkpoint, not a separate historical
  snapshot, so editing an existing definition's `defaultPolicy` in place
  would silently change behavior for every module (including already-
  released ones) that references that ID. The fix already has a name in
  this codebase's own conventions: mint a new parameter ID for the new
  behavior, leave the old one exactly as released. This project has never
  actually deprecated a parameter yet (`replacedBy` is unused everywhere),
  so there's no obligation to mark the old IDs deprecated — they simply
  stay valid and unused by the new module versions.

## Gravity

Affected: `ball-screw-motor-sizing`, `direct-drive-conveyor-motor-sizing`,
`rack-pinion-motor-sizing`, `belt-pulley-drive-motor-sizing` (all four
currently declare a `gravity` port mapped to `motion.axis.gravity`,
`required: false`, relying on the registry's own
`defaultPolicy: { kind: "constant", value: 9.80665 m/s^2 }`).
`index-table-motor-sizing` has no such port today (confirmed — it is this
project's only Motor Sizing module with zero `motion.axis.*` reuse) and is
untouched by this section.

For each of the four affected modules' new version:

- Remove the `gravity` entry from `ports.inputs` in `manifest.ts`.
- Remove the `{ portKey: "gravity" }` row from `ui.ts`.
- Add a local constant in `math.ts` (e.g. `const STANDARD_GRAVITY_M_PER_S2 =
  9.80665;`) and use it everywhere the removed input used to flow in.
- No change to `motion.axis.gravity` itself in the parameter registry — it
  keeps serving every other module that still uses it as a real input
  (e.g. `axis-load-cases`, `ball-screw`, `linear-guide`).

This is behavior-neutral for the overwhelming common case (nobody was
overriding gravity), so each module's existing published-reference-example
test must still pass unchanged after the swap — that unchanged pass is the
actual regression proof, not a new derivation.

## Generic UI capability: `disabledWhen`

New optional field, `lib/engine/module-sdk/types.ts`:

```ts
export interface ModuleUiField {
  readonly portKey: string;
  readonly label?: string;
  readonly help?: string;
  /**
   * Disables this field's control (and Save action) in the generic
   * renderer whenever the named enum port currently holds `equals`.
   * Deliberately minimal — one condition, enum-equality only — because
   * that is the only case any released module needs today.
   */
  readonly disabledWhen?: {
    readonly portKey: string;
    readonly equals: string;
  };
}
```

Matching addition to `ModuleUiFieldSchema` in `schemas.ts`
(`z.strictObject` — the nested condition needs its own strict sub-schema).

**Conformance.** `lib/engine/module-sdk/validate.ts` gains a check
alongside the existing "UI field references unknown input port" rule:
`disabledWhen.portKey` must reference a declared input port, and that port
must be of `enum` kind. A module that gets this wrong fails conformance the
same way an unknown `portKey` does today.

**Resolution.** The view-builder that already resolves each field's current
value for `ModuleInputFieldView` (feeding `module-input-workspace.tsx`)
reads the driving port's *currently-saved* resolved value (whatever
`motion_mode` currently is on that module instance) and sets a new
`disabled: boolean` on the dependent field's view. If the driving port has
no resolved value yet (a brand-new instance, `motion_mode` never saved),
`disabled` is `false` for every field — showing everything normally is
safer than guessing which pair applies.

**Rendering.** `ModuleInputFieldRow` in `module-input-workspace.tsx`: when
`field.disabled` is true, render the field's control(s) and Save button
with the native `disabled` attribute (greyed by existing form-control
styling, which already has a disabled state) and skip rendering its
`LinkSuggestionPanel` (offering to link a value into a field the current
mode doesn't use isn't meaningful). The field's label, help text, and any
previously-saved value stay visible — only interaction is blocked. This
requires no client-side reactivity: the existing per-field
`useActionState`-backed form already causes a full server re-render after
every save, which is when a `motion_mode` change actually takes effect for
the other fields' disabled state.

**Consumer.** `belt-pulley-drive-motor-sizing@0.3.0`'s `ui.ts`:

```ts
{ portKey: "target_velocity", disabledWhen: { portKey: "motion_mode", equals: "distance" } },
{ portKey: "constant_velocity_time", disabledWhen: { portKey: "motion_mode", equals: "distance" } },
{ portKey: "travel_distance", disabledWhen: { portKey: "motion_mode", equals: "velocity" } },
{ portKey: "cycle_time", disabledWhen: { portKey: "motion_mode", equals: "velocity" } },
```

`input-schema.ts`'s existing `superRefine` requirement logic is unchanged —
`disabledWhen` is a UI presentation hint only; the actual required/optional
enforcement per mode still happens server-side exactly as it does today.

No other module adopts `disabledWhen` in this design (none of the other
four mechanisms have a mutually-exclusive input-mode toggle today).

## Inertia-ratio recommended default

**New registry version `1.15.0`** (current is `1.14.0`) adds five new
parameters, one per mechanism namespace, none replacing or editing an
existing ID:

- `motor_sizing.ball_screw.inertia_ratio_recommended_maximum`
- `motor_sizing.direct_drive_conveyor.inertia_ratio_recommended_maximum`
- `motor_sizing.rack_pinion.inertia_ratio_recommended_maximum`
- `motor_sizing.index_table.inertia_ratio_recommended_maximum`
- `motor_sizing.belt_pulley.inertia_ratio_recommended_maximum`

Each: `valueType: "quantity"`, `canonicalUnit: "ratio"`, `range: { min: 0,
unit: "ratio" }`, `defaultPolicy: { kind: "constant", value: makeQuantity(10,
"ratio") }`, `displayName: "Recommended maximum inertia ratio"`, and a
`definition` string stating both the guidance and its own provenance
plainly, e.g.:

> "Suggested maximum load-to-rotor inertia ratio, editable. Founder-directed
> default (10:1, general industrial automation), not a manufacturer-sourced
> value — use the motor manufacturer's own published limit when available.
> Typical servo-industry ranges: ~5:1 for high-precision/fast-response
> applications, ~10:1 for general automation, ~20:1 for moderate-performance
> applications, and up to 30:1 or higher where a specific manufacturer
> permits it."

Each affected module's new version swaps its `inertia_ratio_maximum` port
to reference the corresponding new `*_recommended_maximum` parameter ID
instead (port key stays `inertia_ratio_maximum` for compute/UI stability;
only the `parameterId` it maps to changes), and updates its own
`ui.ts` label/help to match ("Recommended maximum inertia ratio" / "Use the
motor manufacturer's limit when available."). The old
`*.inertia_ratio_maximum` parameters are untouched, remain valid, and stay
referenced only by each module's own prior released version.

`PARAMETER_REGISTRY_SUPPORTED_VERSIONS` gains `1.14.0` (the version every
current module version pins), following the same pattern every prior
registry bump has used.

**Check status.** Each module's `checks.ts` inertia-ratio check keeps its
exact structure (`criterion`, `observed`, `allowable`, `margin`) but its
exceeded-case `status` changes from `"fail"` to `"warning"` — this engine's
existing, already-defined "advisory, not blocking" tier
(`lib/engine/trace/checks.ts`), a better semantic fit for "not recommended,
never blocks" than `fail` (whose only current consumer,
`isBlockingStatus`, is unused anywhere in the live app today, but exists
for a future gate this check should not preempt). Message text updated to
something like: *"Load-to-rotor inertia ratio exceeds the recommended
maximum — motor response may be sluggish or harder to tune; not
recommended, but this does not block the calculation."*

**Not built in this design:** any form of motor selection or catalog
lookup that would auto-populate this value from a specific motor's own
manufacturer-published limit (see "Out of Scope").

## Testing

Per affected module (four get all three changes; `index-table-motor-sizing`
gets only the inertia-ratio change):

- Manifest/UI/input-schema conformance tests updated for the removed
  `gravity` port and the new `inertia_ratio_maximum` → recommended-default
  parameter mapping.
- The module's own existing published-reference-example test re-run
  unchanged (proves the gravity hardcode is behavior-neutral).
- A new test: an instance with `inertia_ratio_maximum` unset resolves to
  `10` (the new default) and remains overridable to any other value.
- A new test: the inertia-ratio check reports `"warning"`, not `"fail"`,
  when exceeded, and the module's overall computed result still completes
  (never blocked).
- `cross-module-links.test.ts` re-run per module (port shapes changed).

Generic-engine additions:

- `lib/engine/module-sdk`: unit tests for `disabledWhen` schema validation
  (accepts a valid enum-port reference, rejects an unknown port, rejects a
  non-enum port).
- `module-input-workspace.test.tsx`: a disabled field renders its control
  and Save button with `disabled`, omits its link-suggestion panel, and a
  field with no resolved driving-port value renders enabled.

Belt-pulley additionally: `disabledWhen` wiring in its own `ui.ts` produces
the right disabled pair for each `motion_mode` value, verified through the
real `executeModule`/view-builder path, not just the raw schema.

Full `npm run verify` (lint, typecheck, test, build) after all module
versions are wired and registered.

## Documentation

- Each module's own `README.md` gets a "Stage 6 (release, done
  <date>)"-style entry, matching the existing per-module convention.
- Each module's own `validation/<module>/<new-version>.md` gets a short
  addendum: the gravity simplification (behavior-neutral, existing
  reference example re-passed) and the inertia-ratio default's own
  founder-directed, non-manufacturer-sourced disclosure — not a
  re-validation of the underlying physics, which is unchanged.
- `context/ui-context.md` "Generic Module Workspace" section gets a new
  paragraph documenting the `disabledWhen` capability and its
  server-re-render-driven update model, so the next module author knows it
  exists.
- `lib/engine/parameters/README.md` gets a short note for registry
  `1.15.0`, matching its existing per-version-bump convention.
- `context/progress-tracker.md` updated in place (Active Work + Health
  section) once released, per this project's own documentation-sync rule.
- No ADR needed — this doesn't establish a new cross-cutting architectural
  boundary beyond what's already documented above; it's an additive
  generic-UI capability plus a routine per-module parameter/version
  pattern this project already uses constantly.

## Versioning and Migration

Every existing module instance built against a prior version keeps working
exactly as it does today — nothing about `0.1.0`/`0.2.0` instances of any
of these five modules changes. An engineer who wants the new behavior on an
existing instance archives it and adds a fresh instance of the new version
(the same migration story `belt-pulley-drive-motor-sizing@0.2.0`'s own
design already established, reusing the module-instance-management
archive/rename flow).

## Open Questions (for implementation, not resolved here)

- Exact final wording of each parameter's `definition`/help text per
  mechanism (the guidance text above is a shared template; each module's
  own author should adapt the mechanism name in-line if it reads awkwardly
  generically).
- Whether `index-table-motor-sizing`'s own rotary framing needs different
  inertia-ratio guidance wording than the four linear mechanisms (the
  numeric default and check-status change are the same; only prose may
  need a small adjustment).

## Out of Scope

- **Motor catalog auto-fill** ("if a specific motor is selected, use its
  manufacturer-published inertia ratio limit automatically") — no motor
  catalog, part-matching, or component-assignment integration exists
  anywhere in the Motor Sizing Tool family (ADR-0011 explicitly scoped
  catalog matching out of all five modules for this phase). Recorded here
  as a real, disclosed future item for `context/progress-tracker.md`, not
  built.
- **A motion-profile chart** (velocity/time or position/time visualization,
  for `motion-profile@0.1.0` or any Motor Sizing module) — no evidence this
  was ever specced or built anywhere in this codebase. A separate
  brainstorming pass, not part of this design.
- Any change to `motion-profile@0.1.0`, `drive-train@0.1.0`,
  `axis-load-cases@0.1.0`, or any other already-released non-Motor-Sizing
  module.
- Deprecating the five existing `*.inertia_ratio_maximum` (non-recommended)
  parameters — they stay valid and referenced by each module's own prior
  version indefinitely.
