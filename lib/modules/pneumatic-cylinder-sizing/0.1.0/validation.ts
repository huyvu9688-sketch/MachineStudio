// Validation record for the pneumatic-cylinder-sizing module (roadmap
// module definition of done, item 10). Stage 3 draft -- a later task
// (Stage 4) replaces referenceExamples/independentBenchmark/reviewer/
// reviewDate with the real, verified content once the reference-example
// reproduction and catalog-matching integration are built.

import type { ValidationRecord } from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const validation: ValidationRecord = {
  moduleId: "pneumatic-cylinder-sizing",
  moduleVersion: "0.1.0",
  methods: [
    "Required-force resolution: general Newtonian statics (mass, standard gravity, incline, Coulomb friction), reproducing ball-screw-motor-sizing@0.2.0's own forward/return sign convention -- not a manufacturer-specific formula.",
    "SMC Corporation theoretical force method (F = eta * A * P), reproduced from pneumatic-cylinder@0.1.0.",
    "SMC Corporation cushion kinetic-energy method (E = (m/2) * V^2), reused directly from pneumatic-cylinder@0.1.0.",
    "Generic Euler column buckling, reproduced from pneumatic-cylinder@0.1.0 (itself reproduced from ball-screw@0.1.0's own end-fixity cases).",
  ],
  sourceRevisionIds: [
    asSourceRevisionId(
      "us.milwaukee_cylinder.design_engineering_guide@web-2026-08-24",
    ),
    asSourceRevisionId("jp.smc.air_cylinders_model_selection@web-2026-08-24"),
    asSourceRevisionId("us.norgren.m1000_heavy_duty_cylinders@web-2026-08-24"),
    asSourceRevisionId("jp.smc.cm2_ca2_catalog@web-2026-08-24"),
  ],
  referenceExamples: [],
  independentBenchmark:
    "Not yet completed -- a later Stage 4 task fills this in. The force/cushion/buckling formulas are reused/reproduced unchanged from pneumatic-cylinder@0.1.0, which already has a completed independent benchmark (Norgren M/1000) for the theoretical-force and air-consumption formula areas; this record cites that prior work rather than re-running it, once that later task confirms the citation is accurate.",
  reviewer: "Not yet assigned -- Stage 4.",
  reviewDate: "not yet reviewed",
  supportedUseLimits: [
    "Computes a required specification for catalog matching; does not check one already-selected cylinder (see pneumatic-cylinder@0.1.0 for that scope).",
    "No load case (normal/peak/etc.) semantics; every input is a single engineer-supplied value per run.",
    "Process force is applied on the extend stroke only.",
    "Piston-rod buckling uses a generic (non-pneumatic-manufacturer-sourced) Euler column formula; buckling is assumed to govern on the extend stroke only.",
    "Lateral (side) rod-end load is out of scope.",
  ],
  deviations: [
    "Reproduces every disclosed evidence gap pneumatic-cylinder@0.1.0 already carries for the force/cushion/buckling formula areas (see that module's own validation.ts) -- not silently resolved here.",
  ],
};
