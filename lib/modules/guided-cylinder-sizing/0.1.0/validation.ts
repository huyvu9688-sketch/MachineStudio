// Validation record for the guided-cylinder-sizing module (roadmap module
// definition of done, item 10). Stage 4: reference-example reproduction
// (smc-reference-example.ts/.test.ts) and reviewer/reviewDate finalized.

import type { ValidationRecord } from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const validation: ValidationRecord = {
  moduleId: "guided-cylinder-sizing",
  moduleVersion: "0.1.0",
  methods: [
    "Required-force resolution: general Newtonian statics (mass, standard gravity, incline, Coulomb friction), reproducing pneumatic-cylinder-sizing@0.1.0's own forward/return sign convention -- not a manufacturer-specific formula.",
    "SMC Corporation theoretical force method (F = eta * A * P), reproduced from pneumatic-cylinder-sizing@0.1.0 -- confirmed directly against both fetched MGQ and MGP catalogs' own Theoretical Output tables (F = P*A, eta applied as the engineer's own sizing margin on top).",
    "SMC Corporation cushion kinetic-energy method (E = (m/2) * V^2), reused directly from pneumatic-cylinder-sizing@0.1.0 -- reported only in this module, not checked against a candidate (no discrete allowable figure exists in either fetched catalog).",
    "Generic Euler column buckling, reproduced from pneumatic-cylinder-sizing@0.1.0 (itself reproduced from ball-screw@0.1.0's own end-fixity cases).",
    "Required resultant moment (new): ordinary statics (M = F*d) combined as a Euclidean sum -- this module's own engineering assumption, not a value either fetched SMC catalog documents.",
  ],
  sourceRevisionIds: [
    asSourceRevisionId("jp.smc.mgq_series_catalog@web-2026-08-26"),
    asSourceRevisionId("jp.smc.mgp_series_catalog@web-2026-08-26"),
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
      id: "smc-mgqm40-guided-lift",
      description:
        "SMC MGQM40 (40 mm bore, slide bearing, 50 mm stroke), directly read from SMC's own fetched MGQ series catalog (context/modules/guided-cylinder-sizing/stage-1-spec.md 'Fetch record'): rod diameter 16 mm, allowable lateral load 167 N, allowable rotational torque of plate 3.43 N*m at this bore/bearing-type/stroke. Reached through this module's own compute path: a 10 kg vertical lift (incline_angle = 90 deg), zero friction, zero process force, roll/pitch/yaw offsets of 10/5/0 mm (./smc-reference-example.ts) reproduces a 98.0665 N required extend force and a 1.096 N*m required resultant moment. The MGQM40 candidate clears every checkable requirement: theoretical extend force ~= 439.8 N (via this module's own reproduced resolvePistonAreas/resolveTheoreticalForce) exceeds the required 98.0665 N; the catalog's own 167 N allowable lateral load exceeds it; the catalog's own 3.43 N*m allowable rotational torque exceeds the required 1.096 N*m moment; and the permissible compressive (buckling) load at this short 50 mm stroke vastly exceeds the required force.",
      tolerance:
        "quantitative: required extend force to within 1e-3 N of hand-calculated m*g*sin(90deg); required moment to within 0.01 N*m of hand-calculated sqrt((F*10mm)^2+(F*5mm)^2); qualitative: theoretical force, allowable lateral load, allowable torque, and buckling capacity each individually clear the requirement, matching the real MGQM40 catalog candidate.",
    },
  ],
  independentBenchmark:
    "The theoretical-force and buckling formulas are reused/reproduced unchanged from pneumatic-cylinder-sizing@0.1.0, which already has a completed independent-benchmark substitute (citing pneumatic-cylinder@0.1.0's own Norgren M/1000 benchmark, 2 of 4 formula areas closed) for the theoretical-force formula area -- confirmed byte-for-byte identical by this module's own math.test.ts against pneumatic-cylinder-sizing@0.1.0's own math.test.ts fixtures. That prior work is cited by reference, not re-run, since the formula bodies are unchanged. Cushion kinetic energy is computed with the same reused formula but is reported only in this module (no candidate check exists to benchmark -- see 'supportedUseLimits'). The new required-moment resolution has no manufacturer method to benchmark against: it is ordinary statics (M = F*d) plus a disclosed Euclidean-sum combination assumption neither fetched SMC catalog documents -- verified instead by property tests in math.test.ts (each axis moment scales linearly with its own offset and with the lateral force; the combination is zero when either the force or every offset is zero; the resultant is monotonically non-decreasing in each offset), the same 'property tests substitute for a manufacturer benchmark on genuinely new, unsourced physics' treatment pneumatic-cylinder-sizing@0.1.0's own required-force resolution received.",
  reviewer:
    "Solo validation -- cites pneumatic-cylinder-sizing@0.1.0's own Norgren M/1000 independent-benchmark substitute (via pneumatic-cylinder@0.1.0) for the reused force/buckling formula areas; the new required-moment resolution is verified by property tests (linearity, zero cases, monotonicity), not a manufacturer benchmark (no manufacturer source publishes this exact moment-combination method -- it is disclosed as this module's own engineering assumption, not sourced).",
  reviewDate: "2026-08-26",
  supportedUseLimits: [
    "Computes a required specification for catalog matching; does not check one already-selected cylinder.",
    "No load case (normal/peak/etc.) semantics; every input is a single engineer-supplied value per run.",
    "Process force is applied on the extend stroke only.",
    "Piston-rod buckling uses a generic (non-pneumatic-manufacturer-sourced) Euler column formula; buckling is assumed to govern on the extend stroke only.",
    "Cushion kinetic energy is reported only, not checked against a candidate -- neither MGQ nor MGP catalog publishes a discrete allowable-kinetic-energy figure.",
    "Allowable lateral load is checked for MGQ candidates only -- MGP's own catalog has no equivalent discrete rating.",
    "The roll/pitch/yaw required-moment combination is a Euclidean sum, this module's own engineering assumption, not a value SMC's own catalog documents.",
  ],
  deviations: [
    "Reproduces every disclosed evidence gap pneumatic-cylinder-sizing@0.1.0 already carries for the force/buckling formula areas (see that module's own validation.ts) -- not silently resolved here.",
    "The moment-combination method (Euclidean sum) is a new, undisclosed-by-SMC engineering judgment call unique to this module.",
  ],
};
