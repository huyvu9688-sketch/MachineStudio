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
];
