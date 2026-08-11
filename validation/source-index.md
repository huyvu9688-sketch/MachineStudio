# Source Index (Unit 0.5)

This is a running index of source revisions that are **actually used by a
validated module**, i.e. cited in a completed
`validation/<module-id>/<version>.md` record's "Sources and Methods Used"
table. It exists so a reviewer can see, at a glance and without opening
every module's validation record, exactly which source editions the
released calculation behavior currently depends on.

This index does not replace the source-of-truth registry in
`lib/standards/` (`SOURCE_REGISTRY`, seeded from
`lib/standards/profiles/us.ts` and `lib/standards/profiles/jp.ts`,
documented in `lib/standards/README.md`). Every row here must reference
an ID that resolves in that registry, or — for a source not yet
registered there (e.g. a manufacturer catalog or an engineering handbook
added for one module) — state that it is pending registration. This file
is the validated-usage view; `lib/standards` is the canonical metadata
store.

## Format

One row per (source revision, module) pair that has been used in a
completed validation record. A source used by more than one module gets
one row per module.

| Source Revision ID | Title | Classification | Edition | Used by module(s) | Validation record | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `<lib/standards SourceRevision id, e.g. us.ansi.b11_0@2023>` | `<document title>` | `<classification>` | `<edition>` | `<module-id@version>` | `validation/<module-id>/<version>.md` | `<supersession status, licensing note, or blank>` |

Column notes:

- **Source Revision ID** — the exact `SourceRevision.id` from
  `lib/standards` (`asSourceRevisionId(...)` values, format
  `<document-id>@<edition>`). If the source is not yet registered in
  `lib/standards`, write `PENDING REGISTRATION` here and open a tracker
  item to add it before the module's next release.
- **Used by module(s)** — module ID and semantic version, e.g.
  `motion.ball-screw@1.0.0`. A source superseded for one module version
  but still cited by an older, still-released module version gets
  separate rows (`context/us-market-profile.md` / `context/jp-market-
  profile.md` "Source Update Policy": "Released modules continue to
  reference their original source revision").
- **Validation record** — path to the exact validation record file the
  citation was pulled from.
- **Notes** — flag a known supersession (`SourceRevision.supersedes`), a
  licensing restriction (e.g. JIS/ANSI licensed content — metadata and
  clause references only, no reproduced text, per `context/code-
  standards.md` "Standards and Sources"), or anything a reviewer should
  know before relying on the citation.

## Update rule

Add rows to this index only when a module's validation record is
completed (Stage 4 of the New Module Workflow,
`context/ai-workflow-rules.md`) and the module is released. Do not
pre-populate this index with sources a module is merely expected to use —
that would misrepresent unvalidated engineering behavior as validated.
When a module's validation record changes (a deviation is corrected, a
new source edition is adopted), update its rows here in the same change.

## Entries

`ball-screw` 0.1.0 is the first module with a completed Stage 4 validation
record (`validation/ball-screw/0.1.0.md`, 2026-08-09); `motion-profile` 0.1.0
is the second (`validation/motion-profile/0.1.0.md`, 2026-08-09); `linear-
guide` 0.1.0 is the third (`validation/linear-guide/0.1.0.md`, 2026-08-09);
`coupling` 0.1.0 is the fourth (`validation/coupling/0.1.0.md`, 2026-08-10).
`axis-load-cases` 0.1.0 (`validation/axis-load-cases/0.1.0.md`, 2026-08-11)
is the fifth Stage 4 completion and the project's first module to also clear
Stage 6 (Release): it is sealed, registered in
`lib/modules/registry.generated.ts`, and resolves through
`getModulePackage("axis-load-cases", "0.1.0")`. `ball-screw`, `motion-
profile`, `linear-guide`, and `coupling` remain Stage-4-complete but not yet
registered — their own release steps have not run (`context/progress-
tracker.md` "Active work").

| Source Revision ID | Title | Classification | Edition | Used by module(s) | Validation record | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `jp.oriental_motor.motor_sizing_calculations@web-2026-08-08` | Motor Sizing Calculations | `manufacturer_method` | web page accessed 2026-08-08 | `ball-screw@0.1.0` | `validation/ball-screw/0.1.0.md` | Drive-torque primary source |
| `us.steinmeyer.ball_screw_technology@web-2026-08-08` | Ball Screw Technology — Service Life and Load Calculations | `manufacturer_method` | web page accessed 2026-08-08 | `ball-screw@0.1.0` | `validation/ball-screw/0.1.0.md` | Equivalent-load and life-law primary source |
| `us.rockford_ball_screw.how_to_size@update-2018` | How To Size A Ball Screw | `manufacturer_method` | Update 2018 | `ball-screw@0.1.0` | `validation/ball-screw/0.1.0.md` | Buckling/critical-speed primary source; drive-torque cross-check |
| `us.wy_ball_screw.understanding_load@web-2026-08-08` | Understanding Load in Ball Screw Applications | `manufacturer_method` | web page accessed 2026-08-08 | `ball-screw@0.1.0` | `validation/ball-screw/0.1.0.md` | Static safety factor formula source |
| `jp.thk.example_ball_screw_selection@bondy-mirror-2026-08-09` | THK Example Ball Screw Selection | `manufacturer_method` | THK Ball Screw General Catalog, "Examples of Selecting a Ball Screw" chapter | `ball-screw@0.1.0` | `validation/ball-screw/0.1.0.md` | Read via a third-party distributor mirror — `tech.thk.com` (this document's registered `officialUrl`) returns HTTP 403 in this environment; see `lib/standards/engineering-sources.ts` for the full provenance note |
| `us.abb.trapezoidal_move_calculations@rev-c-en` | Trapezoidal Move Calculations | `manufacturer_method` | Rev C (EN) | `motion-profile@0.1.0` | `validation/motion-profile/0.1.0.md` | Reference examples only (pp. 2-3, 6-7); base kinematics is public-domain mechanics, not this source's own contribution |
| `jp.oriental_motor.linear_rotary_actuator_selection_calculations@2015-2016` | Selection Calculations For Linear & Rotary Actuators | `manufacturer_method` | General Catalog 2015/2016, pp. H-18 through H-28 | `motion-profile@0.1.0` | `validation/motion-profile/0.1.0.md` | Reference example (p. H-19, EAS6); independent benchmark (p. H-23, general asymmetric method) |
| `us.pmi.linear_guideway_catalog@bearing-net-au-mirror-2026-08-09` | Linear Guideway | `manufacturer_method` | Chapters 1-12 (printed pages B4-B40+) | `linear-guide@0.1.0` | `validation/linear-guide/0.1.0.md` | Sole primary source: working-load distribution, equivalent load, static safety factor, nominal life, mean load, and the Chapter 9 worked example reproduced end to end. Read via a third-party distributor mirror (`bearing.net.au`); `pmi-amt.com` was not attempted, so no direct-domain block is claimed. Section 9.1.3 contains a printing error (two lateral values transposed against their own formulas) — documented in the validation record, no effect on any of PMI's own downstream results. |
| `jp.iko.linear_way_catalog@1560e` | Linear Way / Linear Roller Way — General Explanation | `manufacturer_method` | Catalog 1560E (excerpt), pp. 1-18 | `linear-guide@0.1.0` | `validation/linear-guide/0.1.0.md` | Corroborating (formula shape and life basis, states ISO 14728-1/14728-2 compliance) **and** the module's independent benchmark: `lib/modules/linear-guide/0.1.0/iko-benchmark.ts` implements IKO's own dynamic/static equivalent-load formula (conversion factors `kr`/`ka`/`kOr`/`kOa`, Tables 3 and 5) as a genuine second computation, reproducing IKO's own worked "Example 1" (pp. 15-16, `ME 25 C2 R640 H`, a two-rail/four-slide-unit arrangement) end to end. Its "Example 2" (`MH 45 C2 R1050 H`) uses a one-rail/two-slide-unit mono-rail arrangement out of this module's `0.1.0` scope and is not reproduced. |
| `us.ktr.coupling_selection_operating_factors@web-2026-08-09` | Coupling Selection Based on Operating Factors | `manufacturer_method` | 4-page PDF accessed 2026-08-09 | `coupling@0.1.0` | `validation/coupling/0.1.0.md` | Required-torque-from-power and steady-torque check shape; worked example reproduced at kernel level only (`math.test.ts`). |
| `us.rw_america.coupling_sizing_selection@web-2026-08-09` | Sizing and Selection (Safety Couplings) | `manufacturer_method` | "Sizing and Selection"/"Safety Couplings" chapter, pp. 9-17 | `coupling@0.1.0` | `validation/coupling/0.1.0.md` | Corroborating required-torque and steady-torque check shape; both of its own worked examples (`ST2/10`, `ST4/10`) reproduced through this module's real compute path (`rw-reference-examples.ts`). |
| `us.ktr.coupling_selection_din740_part2@web-2026-08-10` | Coupling Selection According to DIN 740 Part II | `manufacturer_method` | 4-page PDF (catalog printed pages 10-13) accessed 2026-08-10 | `coupling@0.1.0` | `validation/coupling/0.1.0.md` | The module's independent benchmark: `lib/modules/coupling/0.1.0/ktr-din740-benchmark.ts` implements this document's own more detailed shock-torque method (`T_Kmax >= T_S*S_Z*S_t + T_N*S_t`, `T_S = T_AS*M_A*S_A`) as a genuine second computation, reproducing its own worked example (p. 13, 160 kW/1485 rpm motor, screw compressor, ROTEX Size 90 coupling) end to end. Disagrees with `us.ktr.coupling_selection_operating_factors`'s own general shock-torque formula shape — a real, recorded disagreement between two documents from the same manufacturer, not resolved. |
| `jp.nbk.coupling_catalog@orim-vexta-1908ov78` | Flexible Couplings (ORIM VEXTA / NBK) | `manufacturer_method` | "ORIM VEXTA" co-branded catalog, doc. 1908ov78, pp. 1-15 | `coupling@0.1.0` | `validation/coupling/0.1.0.md` | Catalog data only (rated/max torque, allowable speed, moment of inertia, torsional stiffness, misalignment limits); no selection methodology, not exercised by a check. |
| `us.nist.sp811@2008-2nd-printing` | NIST Special Publication 811 -- Guide for the Use of the International System of Units (SI) | `engineering_handbook` | 2008 Edition, second printing (November 2008) | `axis-load-cases@0.1.0` | `validation/axis-load-cases/0.1.0.md` | Fixed publication (supersedes the access-dated `us.nist.sp811@web-2026-07-31` intake record for this module); Appendix B.8, `g_n = 9.80665 m/s^2`. |
| `jp.thk.ball_screw_general_catalog@515-1e` | THK Ball Screw General Catalog | `manufacturer_method` | 515-1E | `axis-load-cases@0.1.0` | `validation/axis-load-cases/0.1.0.md` | Coulomb friction and guide-resistance axial-load method, pp. A15-46 onward. |
| `jp.thk.example_ball_screw_selection@515-1e` | THK Example Ball Screw Selection | `manufacturer_method` | 515-1E | `axis-load-cases@0.1.0` | `validation/axis-load-cases/0.1.0.md` | Three reference examples: pp. B15-72 and B15-86 from "Example Ball Screw Selection"; p. B2-22 from the distinct "Example of Calculating the Nominal Life" chapter of the same 515-1E catalog edition, cited under this revision ID because no separate `SourceDocument` is registered for that chapter (see the validation record's "Sources and Methods Used" note). |
| `us.atlanta_drive_systems.rack_pinion_calculations@sha256-2bc6e48c2dce79dd` | Rack and Pinion Drive Calculations and Selection | `manufacturer_method` | Local reference PDF, content-addressed revision (SHA-256 `2bc6e48c2dce79dd0c252eae97cfcaa8f35fbc73c65ef5e73ace9638c42321b6`) | `axis-load-cases@0.1.0` | `validation/axis-load-cases/0.1.0.md` | Licensed, metadata-only, local content-addressed evidence: the independent rack-and-pinion benchmark (pp. C-54/C-55). Redistribution status unresolved; not redistributed, quoted, or linked from any customer-facing trace or report — only the `SourceRevisionId` is cited. |
