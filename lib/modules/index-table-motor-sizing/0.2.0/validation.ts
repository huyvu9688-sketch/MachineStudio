// Validation record for the index-table-motor-sizing module. Stage 4
// (validation) is done as of 2026-08-13 -- see README.md "Stage 4" for the
// full narrative.

import { asSourceRevisionId } from "@/lib/standards";
import type { ValidationRecord } from "@/lib/engine";

export const validation: ValidationRecord = {
  moduleId: "index-table-motor-sizing",
  moduleVersion: "0.1.0",
  methods: [
    "Oriental Motor Co., Ltd.'s and AutomationDirect's own index-table sizing methods (moment of inertia of the table plus any mounted load, operating/indexing speed from a single index move, acceleration torque, required torque with a safety factor; load torque engineer-supplied, defaulting to zero per both sources)",
  ],
  sourceRevisionIds: [
    asSourceRevisionId(
      "jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004",
    ),
    asSourceRevisionId(
      "us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011",
    ),
  ],
  referenceExamples: [
    {
      id: "automationdirect-index-table-inertia-and-speed",
      description:
        "AutomationDirect's own 'Index Table - Example Calculations' worked example (pp. B-14-B-16, SureServo Selection Appendix): a 12 in diameter, 3.25 in thick steel table, 6:1 gear reducer, indexing 45 deg in 0.5 s (25% accel fraction), selected motor SVM-220 (J_motor=0.014 lb-in-sec^2). Reproduced through executeModule: table_inertia matches the printed J_table=4.80 lb-in-sec^2 within 0.3%, reflected_load_inertia matches the printed 0.133 lb-in-sec^2 within 0.5%, operating_speed (motor shaft) matches the printed 121 rpm within 1% using the source's own stated 25%-of-index-time accel fraction computed exactly, and inertia_ratio matches the printed 9.5 within 0.5%.",
      tolerance: "0.3%-1%, source's own 3-4 significant-figure rounding.",
    },
    {
      id: "automationdirect-index-table-torque-disclosed-deviation",
      description:
        "The same worked example's own final acceleration_torque/momentary_torque figures (printed T_accel=13.68 lb-in, T_motor=13.68 lb-in since T_run=0) are NOT reproduced by this module's own kernel at face value -- disclosed and precisely quantified, not silently absorbed. Every worked example in this source document computes acceleration torque with a rounded 0.1 constant standing in for the exact 2*pi/60=0.10472 (confirmed against the same document's own Example 7, which uses the unrounded form). This module's own kernel uses exact physics throughout (lib/engine/mechanics, no rounded stand-in constants). Reapplying the source's own rounded constant and its own further-rounded intermediate values (121 rpm, 0.13 s) at the TEST level exactly reproduces its own printed 13.68 lb-in figure (0.147*(121/0.13)*0.1=13.68) -- proving this module's own ~8% higher result is fully explained by that one disclosed convention choice, not a defect.",
      tolerance:
        "~8% (source's own rounded-constant convention, reapplied and confirmed exactly at the test level).",
    },
    {
      id: "oriental-motor-index-table-inertia-and-speed-partial",
      description:
        "Oriental Motor Co., Ltd.'s own 'Index Table -- Using Stepping Motors' worked example (pp. F-8-F-9, General Catalog Technical Reference): a 300 mm diameter, 10 mm thick steel table plus 12 discrete steel workpieces (40 mm diameter, 30 mm thick) mounted at a 125 mm radius, 7.2:1 gearhead, indexing 30 deg in 0.3 s. Reproduced at the kernel level (not through executeModule, since this module's own attached_load_inertia port takes one pre-resolved figure -- the fixture itself computes the 12-workpiece parallel-axis sum via lib/engine/mechanics' own pointMassInertia/offsetAxisInertia, exactly mirroring the source's own JC+m*l^2 per-workpiece method): table_inertia matches the printed J_T=3442 oz-in^2 within 1.5%, the fixture's own attached-load computation matches the printed J_W=3118 oz-in^2 within 1%, and table-shaft operating speed (via this module's own resolveOperatingSpeed at gear_ratio=1) matches the printed N=22.2 r/min within 0.2%.",
      tolerance:
        "0.2%-1.5%, source's own 3 significant-figure density rounding.",
    },
  ],
  independentBenchmark:
    "independent-benchmark.test.ts cross-checks this module's own multi-function inertia/torque kernel against a single combined expression reimplementing AutomationDirect's own general 'Belt (or Gear) Reducer Equations' formula (Jtotal = Jmotor + ((Jload)/i^2)), written independently in independent-benchmark.ts -- the same 'structurally separate reimplementation, proved identical' pattern every prior Motor Sizing Tool module's own independent benchmark already establishes. A deterministic 300-scenario property sweep (table mass/diameter, attached-load inertia, gear ratio, motor rotor inertia, and index angle/time/acceleration-time all varied) confirms algebraic identity to floating-point precision.",
  reviewer:
    "Solo validation -- independent-benchmark substitute, the same reviewer-substitute role this document already plays for every prior Motor Sizing Tool module (context/ai-workflow-rules.md Stage 4: 'When no second engineer is available, the documented independent benchmark comparison serves as the review substitute').",
  reviewDate: "2026-08-13",
  supportedUseLimits: [
    "The table is treated as a rigid, disk-shaped solid cylinder about its own rotation axis. Mounted workpieces/fixtures are one engineer-supplied combined inertia figure (attached_load_inertia); this module does not model discrete point-load geometry itself.",
    "load_torque is a required, engineer-supplied input, not computed by this module -- both primary sources independently omit a load-torque formula for this mechanism entirely. It defaults to 0 N*m, matching both sources' own worked examples.",
    "acceleration_torque, momentary_torque, and required_torque are NOT claimed to reproduce AutomationDirect's own printed torque figures at face value -- see 'deviations' below for exactly why and by how much (a disclosed, quantified, ~8% source-internal rounding-constant difference, not an unexplained residual).",
    "Oriental Motor's own worked example's final acceleration-torque and required-torque figures are not reproduced or asserted against at all: that example sizes a stepping motor using a pulse-speed-based acceleration-torque convention materially different from this module's own continuous rad/s Ta=J*alpha approach, and the source page's own printed formula for that one step is OCR-degraded past reliable hand-verification in this environment (the available mirror is a scanned/image PDF). Its inertia and operating-speed figures -- the two evidence items this module's own Stage 1 spec actually needed from a second source -- are reproduced and validated; its own final torque figures are a disclosed, out-of-scope gap.",
    "No motor catalog matching.",
  ],
  deviations: [
    "AutomationDirect's own worked example computes acceleration torque with a rounded 0.1 constant standing in for the exact 2*pi/60=0.10472 (confirmed against the same document's own Example 7, which uses the unrounded form and reproduces its own printed figure exactly only that way). This module's own kernel uses exact physics throughout, consistent with every other module in this codebase, so its own torque outputs are systematically ~4.7% higher than this source's own printed figures from the constant alone, compounding with the source's own further intermediate rounding (121 rpm, 0.13 s vs. this module's own precisely-computed values) to a total ~8% difference -- fully explained and reapplied exactly at the test level (validation.ts referenceExamples, `automationdirect-index-table-torque-disclosed-deviation`), not an unexplained residual.",
    "A genuine unit-convention difference between the two primary sources, disclosed rather than silently reconciled: Oriental Motor's own printed 'oz-in^2' inertia figures are mass-based (oz used as a mass unit, confirmed by cross-checking the source's own printed oz-in^2-to-kg*m^2 conversion on the same page), while AutomationDirect's own 'lb-in-sec^2' figures are weight-based, requiring the explicit /g division its own formula shows. Both are legitimate, internally consistent conventions within their own documents; this module's own kernel works entirely in SI mass-based units throughout, so no ambiguity reaches the kernel itself -- the distinction only matters when hand-deriving each source's own fixture inputs, and is recorded here for anyone re-deriving those fixtures in the future.",
  ],
};
