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
];
