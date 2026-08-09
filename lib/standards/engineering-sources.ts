// Engineering-method source intake metadata added for the first production
// module's Stage 2 contract. These records store source identity and
// applicability only; they do not reproduce manufacturer or reference-
// publication content. An access-dated web page is intake evidence, not a
// reproducible release citation until a fixed edition, archive, or content hash
// is recorded in the module validation record.

import {
  asSourceDocumentId,
  asSourceRevisionId,
  type SourceDocument,
  type SourceRevision,
} from "./types";

export const engineeringMethodDocuments: readonly SourceDocument[] = [
  {
    id: asSourceDocumentId("us.nist.sp811"),
    classification: "engineering_handbook",
    title:
      "NIST Special Publication 811 — Guide for the Use of the International System of Units (SI)",
    authority: "National Institute of Standards and Technology",
    market: "US",
    access: "public",
    officialUrl:
      "https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8",
    note: "Appendix B.8 is the source for the standard acceleration of free fall used by the axis-load calculation.",
  },
  {
    id: asSourceDocumentId("jp.thk.ball_screw_general_catalog"),
    classification: "manufacturer_method",
    title: "THK Ball Screw General Catalog",
    authority: "THK Co., Ltd.",
    market: "JP",
    access: "public",
    officialUrl:
      "https://tech.thk.com/en/products/pdf_download.php?file=E_15_BallScrew.pdf",
    note: "Manufacturer axial-load method for horizontal, inclined, and vertical ball-screw applications.",
  },
  {
    id: asSourceDocumentId("jp.thk.example_ball_screw_selection"),
    classification: "manufacturer_method",
    title: "THK Example Ball Screw Selection",
    authority: "THK Co., Ltd.",
    market: "JP",
    access: "public",
    officialUrl: "https://tech.thk.com/en/products/pdf/en_b15_069.pdf",
    note: "Published horizontal and vertical worked examples used for axis-load reference reproduction.",
  },
  {
    id: asSourceDocumentId("jp.oriental_motor.linear_actuator_moment"),
    classification: "manufacturer_method",
    title: "Method for Calculating Moment Loads on Linear Actuators",
    authority: "Oriental Motor Co., Ltd.",
    market: "JP",
    access: "public",
    officialUrl:
      "https://www.orientalmotor.com/linear-actuators/technology/calculating-moment-load-linear-actuators.html",
    note: "Manufacturer guidance for center-of-gravity, gravity, acceleration, and installation-direction moment treatment.",
  },
  {
    id: asSourceDocumentId("jp.oriental_motor.motor_sizing_calculations"),
    classification: "manufacturer_method",
    title: "Motor Sizing Calculations",
    authority: "Oriental Motor Co., Ltd.",
    market: "JP",
    access: "public",
    officialUrl:
      "https://www.orientalmotor.com/technology/motor-sizing-calculations.html",
    note: "Manufacturer load-torque method for a ball-screw drive, used by the ball-screw module (Unit 4.3).",
  },
  {
    id: asSourceDocumentId("us.steinmeyer.ball_screw_technology"),
    classification: "manufacturer_method",
    title: "Ball Screw Technology — Service Life and Load Calculations",
    authority: "August Steinmeyer GmbH & Co. KG",
    market: "US",
    access: "public",
    officialUrl:
      "https://www.steinmeyer.com/en/technology/service-life-calculations/equivalent-load/",
    note: "Manufacturer equivalent-dynamic-load and fatigue-life formulas for a ball screw, used by the ball-screw module (Unit 4.3). Reached via the US/English steinmeyer.com site; no separate JP-market edition was found.",
  },
  {
    id: asSourceDocumentId("us.rockford_ball_screw.how_to_size"),
    classification: "manufacturer_method",
    title: "How To Size A Ball Screw",
    authority: "Rockford Ball Screw",
    market: "US",
    access: "public",
    officialUrl:
      "https://rockfordballscrew.com/download/RBS_HowToSizeaBallScrew_Update2018.pdf",
    note: "Manufacturer worked sizing method with a full numerical example; the ball-screw module (Unit 4.3) uses its buckling and critical-speed formulas and coefficients directly (both use the screw's minor/root diameter, confirmed by this source's own explicit labeling).",
  },
  {
    id: asSourceDocumentId("us.wy_ball_screw.understanding_load"),
    classification: "manufacturer_method",
    title: "Understanding Load in Ball Screw Applications",
    authority: "WY Ball Screw",
    market: "US",
    access: "public",
    officialUrl:
      "https://www.wyballscrew.com/post/understanding-load-in-ball-screw-applications",
    note: "Manufacturer static safety factor formula (fs = C0 / Fas_max), used by the ball-screw module (Unit 4.3). No recommended minimum fs value is stated by this source.",
  },
  {
    id: asSourceDocumentId("us.abb.trapezoidal_move_calculations"),
    classification: "manufacturer_method",
    title: "Trapezoidal Move Calculations",
    authority: "ABB",
    market: "US",
    access: "public",
    officialUrl:
      "https://library.e.abb.com/public/502bd29feb0349cfaa9558537a9d62fd/AN00115-Trapezoidal_Move_Calculations_Rev_C_EN.pdf",
    note: "Manufacturer application note deriving the symmetric trapezoidal/triangular move kinematics used by the motion-profile module (Unit 4.2) via the area-under-the-velocity-time-graph method. Two worked numerical examples used for reference reproduction: a walkthrough demo (p. 2-3, SPEED=8/ACCEL=DECEL=16/MOVER=12) and an 'Exercise' (p. 6-7, 200 mm ball-screw move in 1 s).",
  },
  {
    id: asSourceDocumentId(
      "jp.oriental_motor.linear_rotary_actuator_selection_calculations",
    ),
    classification: "manufacturer_method",
    title: "Selection Calculations For Linear & Rotary Actuators",
    authority: "Oriental Motor Co., Ltd.",
    market: "JP",
    access: "public",
    officialUrl:
      "https://www.orientalmotor.com/products/pdfs/2015-2016/H/Linear_&_Rotary_Actuators_Selection_Calculations.pdf",
    note: "General Catalog 2015/2016 technical-reference chapter (pp. H-18 through H-28), used by the motion-profile module (Unit 4.2). p. H-23's general asymmetric/non-zero-starting-speed trapezoidal method is reproduced as an independent benchmark (oriental-motor-benchmark.ts); p. H-19's EAS6 catalog worked example (vertical, 500 mm, 1.77 s) is used for reference-example reproduction.",
  },
  {
    id: asSourceDocumentId("us.pmi.linear_guideway_catalog"),
    classification: "manufacturer_method",
    title: "Linear Guideway",
    authority: "PMI (Precision Motion Industries, Inc.)",
    market: "US",
    access: "public",
    officialUrl: "https://www.pmi-amt.com/en/supports/catalog",
    note: "Manufacturer selection-calculation method for the linear-guide module (Unit 4.4): working-load-per-carriage formulas for horizontal/overhung/vertical/wall-mount/tilted installations and inertial loading, equivalent load, static safety factor (with a standard-values table by machine type and load condition), basic dynamic load rating, nominal life (distance-basis, not revolution-basis), mean load under varying loads, and preload-grade selection. Includes a full worked numerical example (Chapter 9) with a real model (MSA35LA2SSFC).",
  },
  {
    id: asSourceDocumentId("jp.iko.linear_way_catalog"),
    classification: "manufacturer_method",
    title: "Linear Way / Linear Roller Way — General Explanation",
    authority: "IKO (Nippon Thompson Co., Ltd.)",
    market: "JP",
    access: "public",
    officialUrl:
      "https://www.ikont.com/catalogs/linear-motion-rolling-guide-series/blue/1560E_ex.pdf",
    note: "Manufacturer selection-calculation method for the linear-guide module (Unit 4.4), explicitly stated as complying with ISO 14728-1 (basic dynamic load rating) and ISO 14728-2 (basic static load rating). A second, independent formulation from PMI's: a multi-term dynamic/static equivalent-load formula combining downward/lateral force conversion factors and per-direction moment/static-load-rating ratios (Equations 5-10), plus its own static-safety-factor value tables and general load-position-to-moment formulas (Mr/Mp/My from Fx/Fy/Fz and load position X/Y/Z) for one- and two-rail, one- or two-slide-unit arrangements.",
  },
];

export const engineeringMethodRevisions: readonly SourceRevision[] = [
  {
    id: asSourceRevisionId("us.nist.sp811@web-2026-07-31"),
    documentId: asSourceDocumentId("us.nist.sp811"),
    edition: "Appendix B.8 web page accessed 2026-07-31",
    officialUrl:
      "https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8",
    note: "Access-dated intake page recording g_n = 9.80665 m/s^2; capture a fixed edition/archive before a released module cites it.",
  },
  {
    id: asSourceRevisionId("jp.thk.ball_screw_general_catalog@515-1e"),
    documentId: asSourceDocumentId("jp.thk.ball_screw_general_catalog"),
    edition: "515-1E",
    officialUrl:
      "https://tech.thk.com/en/products/pdf_download.php?file=E_15_BallScrew.pdf",
    note: "Use the printed pages cited by a calculation trace; do not infer an unreferenced catalog table.",
  },
  {
    id: asSourceRevisionId("jp.thk.example_ball_screw_selection@515-1e"),
    documentId: asSourceDocumentId("jp.thk.example_ball_screw_selection"),
    edition: "515-1E",
    officialUrl: "https://tech.thk.com/en/products/pdf/en_b15_069.pdf",
    note: "Published worked-example extract; the validation record identifies the reproduced printed pages.",
  },
  {
    id: asSourceRevisionId(
      "jp.thk.example_ball_screw_selection@bondy-mirror-2026-08-09",
    ),
    documentId: asSourceDocumentId("jp.thk.example_ball_screw_selection"),
    edition:
      "THK Ball Screw General Catalog, 'Examples of Selecting a Ball Screw' chapter (printed pages A-740 through A-754)",
    officialUrl: "https://bondy.dk/wp-content/uploads/THK-spindler.pdf",
    note: "tech.thk.com (this document's own officialUrl) returns HTTP 403 in this environment (context/progress-tracker.md 'Environment notes'); content instead read directly, page-image by page-image, from this third-party distributor's mirror of the same THK catalog on 2026-08-09. Confirms the 'High-speed Transfer Equipment (Horizontal Use)' worked example (model WTF2040-2, Ca=5400N, C0a=13600N, fs=2.5) that a prior session's WebSearch synthesis surfaced but could not verify directly — see context/modules/ball-screw/stage-1-spec.md 'Evidence Gaps and Verification Confidence'. Page-number offset from this mirror's own front matter: physical PDF page = printed 'A-' page number minus 677.",
  },
  {
    id: asSourceRevisionId(
      "jp.oriental_motor.linear_actuator_moment@web-2026-07-31",
    ),
    documentId: asSourceDocumentId("jp.oriental_motor.linear_actuator_moment"),
    edition: "web page accessed 2026-07-31",
    officialUrl:
      "https://www.orientalmotor.com/linear-actuators/technology/calculating-moment-load-linear-actuators.html",
    note: "Access-dated manufacturer-method intake; capture a fixed edition/archive before a released module cites it.",
  },
  {
    id: asSourceRevisionId(
      "jp.oriental_motor.motor_sizing_calculations@web-2026-08-08",
    ),
    documentId: asSourceDocumentId(
      "jp.oriental_motor.motor_sizing_calculations",
    ),
    edition: "web page/PDF accessed 2026-08-08",
    officialUrl:
      "https://www.orientalmotor.com/technology/motor-sizing-calculations.html",
    note: "Access-dated intake; page-verified against the cached PDF (reference/source-material/Oriental_Motor Sizing Calculators.pdf, p. 4, 'Load Torque Calculation - Ball Screw Drive'). Capture a fixed edition/archive before a released module cites it.",
  },
  {
    id: asSourceRevisionId(
      "us.steinmeyer.ball_screw_technology@web-2026-08-08",
    ),
    documentId: asSourceDocumentId("us.steinmeyer.ball_screw_technology"),
    edition: "web pages accessed 2026-08-08 (formula images read directly)",
    officialUrl:
      "https://www.steinmeyer.com/en/technology/service-life-calculations/equivalent-load/",
    note: "Access-dated intake covering the equivalent-load and fatigue-life pages under steinmeyer.com/en/technology/service-life-calculations/. Capture a fixed edition/archive before a released module cites it.",
  },
  {
    id: asSourceRevisionId("us.rockford_ball_screw.how_to_size@update-2018"),
    documentId: asSourceDocumentId("us.rockford_ball_screw.how_to_size"),
    edition: "Update 2018",
    officialUrl:
      "https://rockfordballscrew.com/download/RBS_HowToSizeaBallScrew_Update2018.pdf",
    note: "PDF filename-dated edition ('RBS_HowToSizeaBallScrew_Update2018.pdf'), fetched and read directly 2026-08-08. Steps 6 and 9 supply the critical-speed and buckling formulas the ball-screw module's kernel uses directly.",
  },
  {
    id: asSourceRevisionId(
      "us.wy_ball_screw.understanding_load@web-2026-08-08",
    ),
    documentId: asSourceDocumentId("us.wy_ball_screw.understanding_load"),
    edition: "web page accessed 2026-08-08",
    officialUrl:
      "https://www.wyballscrew.com/post/understanding-load-in-ball-screw-applications",
    note: "Access-dated intake. Capture a fixed edition/archive before a released module cites it.",
  },
  {
    id: asSourceRevisionId("us.abb.trapezoidal_move_calculations@rev-c-en"),
    documentId: asSourceDocumentId("us.abb.trapezoidal_move_calculations"),
    edition: "Rev C (EN)",
    officialUrl:
      "https://library.e.abb.com/public/502bd29feb0349cfaa9558537a9d62fd/AN00115-Trapezoidal_Move_Calculations_Rev_C_EN.pdf",
    note: "Full 7-page PDF read directly 2026-08-09. Confirms two worked numerical examples: p. 2-3 (SPEED=8, ACCEL=DECEL=16, MOVER=12 -> T=2s) matches resolveTrapezoidalMove's own input/output direction exactly; p. 6-7's 'Exercise' (200mm ball-screw move in 1s) solves the inverse problem (assumes an equal Ta/Ts/Td time split, then derives speed/accel) this module does not implement, but its own derived SPEED/ACCEL/DECEL values, fed forward, reproduce its own printed T=1s exactly.",
  },
  {
    id: asSourceRevisionId(
      "jp.oriental_motor.linear_rotary_actuator_selection_calculations@2015-2016",
    ),
    documentId: asSourceDocumentId(
      "jp.oriental_motor.linear_rotary_actuator_selection_calculations",
    ),
    edition: "General Catalog 2015/2016, pp. H-18 through H-28",
    officialUrl:
      "https://www.orientalmotor.com/products/pdfs/2015-2016/H/Linear_&_Rotary_Actuators_Selection_Calculations.pdf",
    note: "Full 11-page chapter read directly 2026-08-09 (pages 1-11). p. H-19's EAS6 catalog example (vertical, 15 kg, 500 mm, 320 mm/s, 1.5 m/s^2 -> 1.77 s) is a graph-read value, not a full-precision formula result — the module's own reproduction (1.7758 s) is within catalog display-rounding of the 3-significant-figure printed inputs.",
  },
  {
    id: asSourceRevisionId(
      "us.pmi.linear_guideway_catalog@bearing-net-au-mirror-2026-08-09",
    ),
    documentId: asSourceDocumentId("us.pmi.linear_guideway_catalog"),
    edition: "Linear Guideway catalog, chapters 1-12 (printed pages B4-B40+)",
    officialUrl:
      "http://www.bearing.net.au/wp-content/uploads/2015/05/PMI-Profile-Rail-Catalogue.compressed.pdf",
    note: "Found and read directly via a third-party Australian distributor mirror (bearing.net.au) on 2026-08-09; not independently attempted against pmi-amt.com's own catalog-download page this session, so no direct-domain block is claimed (unlike the confirmed tech.thk.com block elsewhere in this file) — this is simply where a readable copy was found first.",
  },
  {
    id: asSourceRevisionId("jp.iko.linear_way_catalog@1560e"),
    documentId: asSourceDocumentId("jp.iko.linear_way_catalog"),
    edition: "Catalog 1560E (excerpt), 'General Explanation' chapter, pp. 1-10",
    officialUrl:
      "https://www.ikont.com/catalogs/linear-motion-rolling-guide-series/blue/1560E_ex.pdf",
    note: "Read directly 2026-08-09 from IKO's own domain (ikont.com), no mirror needed.",
  },
];
