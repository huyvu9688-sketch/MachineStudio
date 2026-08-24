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
  referenceExamples: [
    {
      id: "smc-bore-selection-vertical-lift",
      description:
        "SMC Air Cylinders Model Selection, bore-size-selection Example 1 (1000 N extend-side force required, load factor eta = 0.7 static/clamping, pressure P = 0.5 MPa, SMC's own selection is a 63 mm bore) -- the same scenario pneumatic-cylinder@0.1.0's own validation record cites, reached here through this module's own compute path: a vertical lift (incline_angle = 90 deg), zero friction, zero process force, load_mass = 1000/9.80665 kg reproduces the identical 1000 N requirement (./smc-reference-example.ts). The candidate 63 mm bore (20 mm rod, a standard CM2-63 dimension) clears it at F1 ~= 1091.0 N through this module's own reproduced resolvePistonAreas/resolveTheoreticalForce -- the same figure pneumatic-cylinder@0.1.0's own validation record already confirms for this exact scenario.",
      tolerance: "qualitative: theoretical force clears the required force, matching SMC's own bore selection (same as pneumatic-cylinder@0.1.0's own reference example for this scenario)",
    },
  ],
  independentBenchmark:
    "The theoretical-force, cushion-kinetic-energy, and buckling formulas are reused/reproduced unchanged from pneumatic-cylinder@0.1.0, which already has a completed independent benchmark (Norgren M/1000, 7 bore sizes, agreement within 2% on 21 figures) for the theoretical-force formula area, and a disclosed, carried-forward evidence gap for cushion-kinetic-energy-allowable and buckling (no second independent source of any kind) -- see validation/pneumatic-cylinder/0.1.0.md. This record cites that prior work by reference rather than re-running it, since the formulas themselves are byte-for-byte identical (confirmed by this module's own math.test.ts against pneumatic-cylinder@0.1.0's own math.test.ts). The required-force resolution itself (new physics, general Newtonian statics) has no manufacturer method to benchmark against -- the same 'textbook physics, not sourced from a manufacturer' treatment ball-screw-motor-sizing@0.2.0's own resolveDriveForce received, verified instead by the sign-convention property tests in ./math.test.ts (adds gravity forward, subtracts it on return, friction direction-symmetric, can go negative).",
  reviewer:
    "Solo validation -- cites pneumatic-cylinder@0.1.0's own Norgren M/1000 independent-benchmark substitute for the reused force/cushion/buckling formula areas; the new required-force resolution is verified by property tests against ball-screw-motor-sizing@0.2.0's own established sign convention, not a manufacturer benchmark (no manufacturer source publishes this exact resolved-load derivation).",
  reviewDate: "2026-08-24",
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
