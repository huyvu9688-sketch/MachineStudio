// Validation record for the dual-rod-cylinder-sizing module (roadmap
// module definition of done, item 10). Stage 3 draft: reviewer/reviewDate
// intentionally state Stage 4 has not yet been performed. Finalized at
// Stage 4 once smc-reference-example.ts/.test.ts exists.

import type { ValidationRecord } from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const validation: ValidationRecord = {
  moduleId: "dual-rod-cylinder-sizing",
  moduleVersion: "0.1.0",
  methods: [
    "Required-force resolution: general Newtonian statics (mass, standard gravity, incline, Coulomb friction), reproducing pneumatic-cylinder-sizing@0.1.0's own forward/return sign convention -- not a manufacturer-specific formula.",
    "SMC Corporation theoretical force method (F = eta * A * P), with a doubled piston area unique to this module: CXS2 is a genuine dual-piston mechanism (SMC's own marketing text: 'Double piston construction provides twice the output force'), confirmed directly against CXS2's own Theoretical Output table -- every printed OUT/IN area figure is ~2.00x the naive single-piston pi*D^2/4 value at every bore checked (stage-1-spec.md 'CORRECTION (2026-08-27)'). This corrects an earlier Stage 1 conclusion that wrongly inferred 'not doubled' from CXS2's table matching the older CXSJ catalog's own table (CXSJ was itself already double-piston, so the match proved nothing about either matching a plain single-piston baseline).",
    "SMC Corporation cushion kinetic-energy method (E = (m/2) * V^2), reused directly from pneumatic-cylinder-sizing@0.1.0 -- reported only in this module, not checked against a candidate (CXS2's own catalog gives no per-model allowable-kinetic-energy table this module has digitized).",
    "Load mass vs. overhang length (new): log-log interpolation between SMC's own digitized 'Model Selection' graph points, keyed by mounting orientation, speed band, and (horizontal only) stroke band. Not a closed-form manufacturer formula -- SMC publishes this relationship only as graphs.",
  ],
  sourceRevisionIds: [
    asSourceRevisionId("jp.smc.cxs2_series_catalog@web-2026-08-26"),
    asSourceRevisionId(
      "jp.smc.air_cylinders_model_selection@web-2026-08-24",
    ),
    asSourceRevisionId(
      "us.milwaukee_cylinder.design_engineering_guide@web-2026-08-24",
    ),
    asSourceRevisionId("us.norgren.m1000_heavy_duty_cylinders@web-2026-08-24"),
  ],
  referenceExamples: [],
  independentBenchmark:
    "Not yet performed -- Stage 3 draft. The theoretical-force formula is reused/reproduced unchanged from pneumatic-cylinder-sizing@0.1.0, which already has a completed independent-benchmark substitute (Norgren M/1000, via pneumatic-cylinder@0.1.0); this is expected to be cited by reference at Stage 4, not re-run, since the formula bodies are unchanged. The new load-mass-vs-overhang interpolation has no independent source of any kind -- Stage 4 will need to state this as a disclosed 0.1.0 limitation, not resolve it.",
  reviewer: "Not yet performed -- Stage 4 has not been completed.",
  reviewDate: "not yet reviewed",
  supportedUseLimits: [
    "Computes a required specification for catalog matching; does not check one already-selected cylinder.",
    "No load case (normal/peak/etc.) semantics; every input is a single engineer-supplied value per run.",
    "Process force is applied on the extend stroke only.",
    "No buckling check -- SMC's own CXS2 catalog gives no buckling formula; the load-mass-vs-overhang-length rating is this mechanism's own governing structural check instead.",
    "Cushion kinetic energy is reported only, not checked against a candidate -- CXS2's own catalog gives no per-model allowable-kinetic-energy table.",
    "The load-mass-vs-overhang-length check reports out-of-envelope, never extrapolating, when the query falls outside every seeded band.",
  ],
  deviations: [
    "Reproduces every disclosed evidence gap pneumatic-cylinder-sizing@0.1.0 already carries for the force formula area (see that module's own validation.ts) -- not silently resolved here.",
    "The band-selection logic (rounding a real stroke/speed up to the nearest seeded band) is a new, undisclosed-by-SMC engineering judgment call unique to this module (stage-2-contract.md Decision 6).",
  ],
};
