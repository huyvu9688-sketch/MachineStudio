// Validation record for the dual-rod-cylinder-sizing module (roadmap
// module definition of done, item 10). Stage 4: reference-example
// reproduction (smc-reference-example.ts/.test.ts) and reviewer/reviewDate
// finalized. The theoretical-force formula area is unusually well
// validated for a 0.1.0 release -- not merely reused from a sibling
// module's own benchmark, but directly confirmed against SMC's own
// primary-source catalog text (reference/source-material/dual-rod-
// cylinder/CXS2.md), at two independent bore sizes, in both directions.

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
  referenceExamples: [
    {
      id: "smc-cxs2m20-horizontal",
      description:
        "SMC CXS2M20 (20 mm bore, 10 mm rod -- confirmed directly from CXS2's own Theoretical Output table, not inferred -- slide bearing), horizontal mounting, 8 mm required stroke, 4 mm overhang -- directly read from SMC's own fetched CXS2 series catalog text (reference/source-material/dual-rod-cylinder/CXS2.md) and the founder-supplied Model Selection graph images (context/modules/dual-rod-cylinder-sizing/stage-1-spec.md). Reached through this module's own compute path: a 0.5 kg horizontal load with friction coefficient 0.1, zero incline, zero process force (./smc-reference-example.ts) reproduces a 0.4903 N required extend force. The CXS2M20 candidate clears every checkable requirement: theoretical extend force (via this module's own doubled-area resolvePistonAreas/resolveTheoreticalForce) vastly exceeds the required 0.4903 N; and the seeded horizontal/<=10mm-stroke/<=400mm-per-s/bore-20 load-mass-vs-overhang band (graph 14: 1.0 kg plateau at overhang <= 4mm) exceeds the scenario's own 0.5 kg load with a real, visible margin, not a coincidence.",
      tolerance:
        "quantitative: required extend force to within 1e-3 N of hand-calculated m*g*mu*cos(0deg); theoretical piston areas to within 1% of SMC's own printed CXS2m10/CXS2m32 Theoretical Output figures (math.test.ts's own independent reproduction, catalog values are themselves rounded to 3 significant figures); qualitative: theoretical force and the load-mass-vs-overhang-length check each individually clear the requirement, matching the real CXS2M20 catalog candidate.",
    },
  ],
  independentBenchmark:
    "The theoretical-force formula area is directly confirmed against SMC's own primary-source catalog text (reference/source-material/dual-rod-cylinder/CXS2.md's own 'Theoretical Output' table), not merely cited by reference from a sibling module's own benchmark: the printed OUT/IN piston-area figures at two independent bore sizes (CXS2m10, rod 6mm: OUT 157mm^2, IN 100mm^2; CXS2m32, rod 16mm: OUT 1608mm^2, IN 1206mm^2) each match this module's own resolvePistonAreas to within 1% (math.test.ts's own reproduction), confirming both the doubled-piston-area correction and the underlying F=eta*A*P formula shape at once. This is a stronger evidence basis than pneumatic-cylinder-sizing@0.1.0's own Norgren M/1000 independent-benchmark substitute (a third-party's own printed ratings, not the same manufacturer's own dimension table) -- but it is a same-manufacturer confirmation, not an independent second manufacturer's method, so it does not by itself satisfy this project's own 'independent method or tool' standard the way IKO-vs-PMI or KTR-DIN-740-vs-KTR's-other-document did for other modules; recorded honestly as what it is. Cushion kinetic energy is computed with the same reused formula but is reported only in this module (no candidate check exists to benchmark -- see 'supportedUseLimits'). The load-mass-vs-overhang-length interpolation has NO independent source of any kind -- neither a second manufacturer's own equivalent graph nor an established general engineering method exists for this exact twin-guide-rod-plate structural relationship. This is a real, disclosed 0.1.0 evidence gap, not resolved by this validation pass -- verified instead by data-integrity property tests (load-mass-curves.test.ts: monotonic non-increasing load mass vs. overhang, no duplicate band keys, strictly positive load-mass/overhang fields) and by math.test.ts's own interpolation-correctness tests against hand-computed geometric-mean values.",
  reviewer:
    "Solo validation -- the theoretical-force formula area (piston area, and by extension F=eta*A*P) is confirmed directly against SMC's own CXS2 catalog primary-source text at two independent bore sizes, both directions (4 independent data points, math.test.ts); the load-mass-vs-overhang-length interpolation has no independent benchmark of any kind (a disclosed 0.1.0 limitation, not a sourced or property-verified-only substitute claim) -- verified only by data-integrity and interpolation-correctness property tests, not a manufacturer benchmark.",
  reviewDate: "2026-08-27",
  supportedUseLimits: [
    "Computes a required specification for catalog matching; does not check one already-selected cylinder.",
    "No load case (normal/peak/etc.) semantics; every input is a single engineer-supplied value per run.",
    "Process force is applied on the extend stroke only.",
    "No buckling check -- SMC's own CXS2 catalog gives no buckling formula; the load-mass-vs-overhang-length rating is this mechanism's own governing structural check instead.",
    "Cushion kinetic energy is reported only, not checked against a candidate -- CXS2's own catalog gives no per-model allowable-kinetic-energy table.",
    "The load-mass-vs-overhang-length check has no independent benchmark of any kind -- a real, disclosed 0.1.0 evidence gap, unlike the theoretical-force formula area.",
    "The digitized load-mass-vs-overhang dataset is read by eye off founder-supplied graph images to 2 significant figures -- founder review against the source graphs is expected before catalog seeding, and is a real, disclosed accuracy ceiling distinct from a printed-table transcription.",
    "The check reports out-of-envelope, never extrapolating, when the query falls outside every seeded band.",
  ],
  deviations: [
    "The band-selection logic (rounding a real stroke/speed up to the nearest seeded band) is a new, undisclosed-by-SMC engineering judgment call unique to this module (stage-2-contract.md Decision 6).",
    "The load-mass-vs-overhang-length formula area has no independent benchmark of any kind (unlike every other Stage-4-closed formula area in this project's pneumatic modules) -- a real, disclosed gap carried into release, not glossed over.",
    "The theoretical-force formula's own piston-area calculation was corrected mid-Stage-3/4 (2026-08-27): an earlier Stage 1 conclusion wrongly assumed a single-piston area (matching every sibling pneumatic sizing module in this project) based on comparing CXS2's own table only against the older CXSJ catalog's own table, which was itself already a double-piston mechanism -- the comparison never checked either table against a plain single-piston baseline. Corrected once SMC's own primary-source catalog text became directly available, confirming CXS2's own marketing claim ('double piston construction provides twice the output force') was true all along. This module's own theoretical-force formula therefore differs from pneumatic-cylinder-sizing@0.1.0's and guided-cylinder-sizing@0.1.0's own single-piston formula by design, not by omission -- a genuine mechanical difference between this dual-rod family and the round-body/guided families, not a bug carried into release.",
  ],
};
