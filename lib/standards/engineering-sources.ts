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
    note: "Manufacturer selection-calculation method for the linear-guide module (Unit 4.4), explicitly stated as complying with ISO 14728-1 (basic dynamic load rating) and ISO 14728-2 (basic static load rating). A second, independent formulation from PMI's: a multi-term dynamic/static equivalent-load formula combining downward/lateral force conversion factors and per-direction moment/static-load-rating ratios (Equations 5-10), plus its own static-safety-factor value tables and general load-position-to-moment formulas (Mr/Mp/My from Fx/Fy/Fz and load position X/Y/Z) for one- and two-rail, one- or two-slide-unit arrangements. Includes two full worked numerical examples (\"Examples of Load and Life Calculation\", printed pages 15-18): Example 1 (Linear Way ME 25 C2 R640 H, a two-rail/four-slide-unit arrangement) is reproduced end to end as this module's independent benchmark (lib/modules/linear-guide/0.1.0/iko-benchmark.ts); Example 2 (Linear Way MH 45 C2 R1050 H) uses a one-rail/two-slide-unit mono-rail arrangement out of this module's 0.1.0 scope and is not reproduced.",
  },
  {
    id: asSourceDocumentId("us.ktr.coupling_selection_operating_factors"),
    classification: "manufacturer_method",
    title: "Coupling Selection Based on Operating Factors",
    authority: "KTR Systems GmbH",
    market: "US",
    access: "public",
    officialUrl:
      "https://www.ktr.com/fileadmin/ktr/media/Tools_Downloads/kataloge/coupling_selection_operating_factors.pdf",
    note: "Manufacturer selection-calculation method for the coupling module (Unit 4.5): required/rated-torque sizing (T_N = 9550 * P[kW] / n[1/min]; T_KN >= T_N * S_B * S_t * S_R for steady load, T_Kmax >= (T_N + T_S) * S_Z * S_t * S_R for torque shocks), with full operating-factor (S_B, by driven-machine type -- a large application table), temperature-factor (S_t), starting-factor (S_Z), and direction-factor (S_R) tables, plus one full worked numerical example (a 200 kW / 1500 rpm motor driving a radial pump). Reached via the English/international ktr.com site; no separate JP-market edition was found (same treatment as us.steinmeyer.ball_screw_technology elsewhere in this file). Does not cover misalignment, torsional stiffness, moment of inertia, or speed limit -- see us.rw_america.coupling_sizing_selection and jp.nbk.coupling_catalog for those.",
  },
  {
    id: asSourceDocumentId("us.ktr.coupling_selection_din740_part2"),
    classification: "manufacturer_method",
    title: "Coupling Selection According to DIN 740 Part II",
    authority: "KTR Systems GmbH",
    market: "US",
    access: "public",
    officialUrl:
      "https://www.ktr.com/dam/jcr:621e751c-d0b1-42b6-81ea-6d44148ab8d6/COUPLING_SELECTION_DIN740_PART2.PDF",
    note: "A second, distinct KTR selection-calculation document from us.ktr.coupling_selection_operating_factors, found via WebSearch on 2026-08-10 while looking for a published shock-torque worked example (neither KTR's other document's own example nor either of R+W's two examples exercises the shock-torque check with real numbers). Gives a more detailed general (non-hydrostatic-drive) torque-shock derivation than the operating-factors document's own (T_N+T_S)*S_Z*S_t*S_R form: T_Kmax >= T_S*S_Z*S_t + T_N*S_t, where the shock torque reaching the coupling is itself T_S = T_AS*M_A*S_A, weighted by a rotational-inertia coefficient M_A = J_L/(J_A+J_L) derived from the driving- and load-side mass moments of inertia. Neither S_B (operating factor) nor S_R (direction factor) appears in this document's own general formula -- S_B appears only in a separate, explicitly simplified hydrostatic-drive path for two specific coupling families (BoWex-ELASTIC, MONOLASTIC), and S_R does not appear anywhere in this document. Recorded as a real disagreement between two KTR documents' own general shock-torque formula shape, not resolved -- the coupling module (Unit 4.5) does not adopt either verbatim (context/modules/coupling/stage-2-contract.md 'Decisions' item 3). Includes one full worked numerical example (a 160 kW/1485 rpm motor driving a screw compressor through a ROTEX Size 90 coupling), reproduced as this module's independent benchmark in lib/modules/coupling/0.1.0/ktr-din740-benchmark.ts.",
  },
  {
    id: asSourceDocumentId("us.rw_america.coupling_sizing_selection"),
    classification: "manufacturer_method",
    title: "Sizing and Selection (Safety Couplings)",
    authority: "R+W America LLC",
    market: "US",
    access: "public",
    officialUrl: "https://www.rw-america.com/",
    note: "A second, independent manufacturer selection-calculation method for the coupling module (Unit 4.5), explicitly stated as 'According to DIN 740 part 2'. Same required-torque base formula as KTR's (T_AN = 9550 * P_Drive / n), combined with its own branded shock/load factor (S_A, by drive type), temperature factor (S_v), and start factor (S_z) tables into T_KN >= T_AN * S_A * S_v * S_z -- structurally identical shape to KTR's method, different branded factor names and numeric ranges, the same 'two sources agree on shape, differ on specifics' relationship this project's other modules already treat as normal. Also gives an inertia/acceleration-based torque formula (T_AR >= J_L/(J_A+J_L) * T_AS * S_A >= alpha * J_L) and a torsional-resonant-frequency check (f_e = 1/(2*pi) * sqrt(C_T * (J_Masch+J_Mot)/(J_Masch*J_Mot))) neither KTR's document nor PMI/IKO-style catalogs give. Includes two full worked numerical examples at different power levels and service-factor scenarios (450 kW/980 rpm elastic coupling; 800 kW/980 rpm gear coupling). Read via a Canadian distributor mirror (drivecentre.ca) branded throughout as 'RW-AMERICA.COM'; content is R+W America's own, not the distributor's.",
  },
  {
    id: asSourceDocumentId("jp.nsk.rolling_bearings_catalog"),
    classification: "manufacturer_method",
    title: "NSK Rolling Bearings (CAT. No. E1102a)",
    authority: "NSK Ltd.",
    market: "JP",
    access: "public",
    officialUrl:
      "https://www.bearing.co.il/wp-content/uploads/2024/11/E1102.pdf",
    note: "General rolling-bearing catalog with a 'Selection of Bearing Size' technical chapter, including a worked-examples section (5.7) this project's own support-bearing module reuses as its own independent evidence -- see the module's own validation record for how.",
  },
  {
    id: asSourceDocumentId("jp.ntn.rolling_bearings_handbook"),
    classification: "manufacturer_method",
    title: "NTN Rolling Bearings Handbook",
    authority: "NTN Corporation",
    market: "JP",
    access: "public",
    officialUrl: "https://www.ntnglobal.com/en/products/catalog/pdf/9012E.pdf",
    note: "General rolling-bearing selection methodology for the support-bearing module (Unit 4.6): basic rating life (L10, ISO 281 catalog method), dynamic/static equivalent load (P = X*Fr + Y*Fa), adjusted rating life (life adjustment factors a1/a2/a3), basic static load rating and allowable static equivalent load (safety factor So = C0/P0, with a lower-limit-value table by operating condition and bearing type), preload (fixed-position vs. fixed-pressure methods, standard preload amounts for duplex angular contact ball bearings), allowable speed (correction factors by load and by combined radial/axial load), and shaft/housing interface requirements (fixing methods, shoulder height and fillet radius, shaft/housing precision grades, allowable misalignment by bearing type). Cited catalog No. 9012E/E; both the ntnglobal.com and ntnamericas.com copies fetched this session are identically truncated after 'Reference material' (printed page 82) and do not include the handbook's own 'Bearing Life Calculation Examples' section its table of contents lists at printed page 84 -- a real, documented evidence gap, not yet resolved (see stage-1-spec.md 'Evidence Gaps').",
  },
  {
    id: asSourceDocumentId("jp.nbk.coupling_catalog"),
    classification: "manufacturer_method",
    title: "Flexible Couplings (ORIM VEXTA / NBK)",
    authority: "NBK (Nabeya Bi-tech Kaisha)",
    market: "JP",
    access: "public",
    officialUrl: "https://www.nbk1560.com/",
    note: "Manufacturer catalog data for the coupling module (Unit 4.5): per-model rated torque, maximum torque, allowable rotational speed, moment of inertia, torsional stiffness, and misalignment limits (parallel, angular, axial) across seven coupling series (XGT2, XGT, XHW, MST, MCS). Catalog/data-sheet values for specific couplings, not a derived formula -- the same treatment ball-screw gives Ca/C0a and linear-guide gives C/C0/T0. NBK's own selection-guide pages (nbk1560.com/en-US/resources/coupling/...) returned HTTP 403 to direct fetch in this environment; not yet confirmed whether this is a persistent host-level block (like the confirmed tech.thk.com block elsewhere in this file) or a one-session issue -- retry before assuming it is permanent. Read instead via a Japanese distributor mirror (orimvexta.co.jp) hosting the same NBK product data under a co-branded cover.",
  },
  {
    id: asSourceDocumentId("jp.omron.servo_motor_selection_guide"),
    classification: "manufacturer_method",
    title: "Technical Guide for Servo Motor Selection",
    authority: "Omron Corporation",
    market: "JP",
    access: "public",
    officialUrl:
      "https://www.ia.omron.com/data_pdf/guide/14/servo_selection_tg_e_1_1_3-13(further_info).pdf",
    note: "Manufacturer selection methodology for the drive-train module (Unit 4.7): inertia formulas (including ball-screw and gear-ratio-reflected forms), load-torque formulas, an acceleration/deceleration torque formula, a maximum-momentary/effective (RMS) torque formula, and a six-item check table (load inertia, effective torque, maximum momentary torque, maximum rotation speed, regenerative energy, encoder resolution). Explicitly declines to give a regenerative-energy formula ('please see the user manual of each product'). Includes one complete worked numerical example (OMNUC U-series motor R88M-U20030 on a direct-connected ball-screw axis), reproduced and hand-verified in context/modules/drive-train/stage-1-spec.md.",
  },
  {
    id: asSourceDocumentId("us.hmk.servo_motor_amplifier_sizing_guide"),
    classification: "engineering_handbook",
    title: "The HMK Guide to Sizing of Servo Motors and Amplifier",
    authority: "HMK (author C. Krajewski)",
    market: "US",
    access: "public",
    officialUrl:
      "https://www.hmkdirect.com/downloads/knowledge_base/drive_sizing_v2.pdf",
    note: "A UK-based motion-control training/systems-integration company's own training manual, not a single product manufacturer's branded method -- the same 'reached via the US/English site, tagged US as the pragmatic non-JP default' treatment context/modules/coupling/stage-1-spec.md already gives Steinmeyer/KTR/R+W. Gives load-torque, friction-torque, acceleration-torque, and RMS-torque formulas for the drive-train module (Unit 4.7), structurally identical to Omron's own; RMS/peak-current sizing for the amplifier via the motor's own torque constant; a qualitative gearbox comparison table (backlash, transmission error, torsional rigidity, efficiency, inertia, typical mechanical life by family -- planetary/worm/helical); and a dedicated holding-brake section with two worked numerical examples showing the brake's effect on RMS torque specifically, not a standalone brake-torque check.",
  },
  {
    id: asSourceDocumentId("us.voss.comprehensible_guide_servo_motor_sizing"),
    classification: "engineering_handbook",
    title: "A Comprehensible Guide to Servo Motor Sizing",
    authority: "Wilfried Voss / Copperhill Technologies Corporation",
    market: "US",
    access: "public",
    officialUrl:
      "https://cnctar.hobbycnc.hu/VarsanyiPeter/CNC%20vezerles%20-%20szervoval/Guide_to_Servo_Motor_Sizing.pdf",
    note: "An independently authored technical book (ISBN 978-0-9765116-1-8, Copyright 2007), not a single manufacturer's own branded method -- the author built motor-sizing software and credits engineers from Baldor, GE Fanuc, Siemens, AC Tech/Lenze, Parker Hannifin, and Oriental Motor U.S.A. in its own acknowledgments. Gives the same RMS-torque formula shape as Omron's and HMK's own, generalized with an explicit holding-torque/holding-time term, for the drive-train module (Unit 4.7); a dedicated holding-brake section (3.5.2) with two full worked numerical examples; and cites Bosch Rexroth's own inertia-mismatch guidance as a third distinct numeric convention alongside its own general '<= 6:1' rule. Its own partial RMS-torque worked example was hand-verified in context/modules/drive-train/stage-1-spec.md.",
  },
  {
    id: asSourceDocumentId("jp.oriental_motor.motor_sizing_basics_rms_torque"),
    classification: "manufacturer_method",
    title:
      "Motor Sizing Basics Part 3: How to Calculate Speed, Acceleration Torque, and RMS Torque",
    authority: "Oriental Motor Co., Ltd.",
    market: "JP",
    access: "public",
    officialUrl:
      "https://blog.orientalmotor.com/motor-sizing-basics-part-3-acceleration-torque-and-rms-torque",
    note: "A different document/URL from the already-registered jp.oriental_motor.motor_sizing_calculations source. Confirms the same RMS-torque formula shape as Omron's, HMK's, and Voss's own (a fourth independent confirmation) for the drive-train module (Unit 4.7); gives a fourth distinct inertia-ratio convention tiered by control technology (stepper 10:1, closed-loop stepper 30:1, auto-tuned servo 50:1, manual-tuned servo 100:1); and an 'effective load safety factor' concept (Trms/rated torque >= 1.5-2) distinct from Omron's own flat 0.8 margin. Explicitly states it does not cover regenerative energy or holding-brake torque. Read via WebFetch's own text summarization this session, not direct page images -- lower confidence than a directly read source; re-fetch and read directly before a released module cites it for a formula not already confirmed elsewhere.",
  },
  {
    id: asSourceDocumentId(
      "us.celera_motion.shunt_resistor_regenerative_braking",
    ),
    classification: "manufacturer_method",
    title: "Sizing a Shunt Resistor for Regenerative Braking",
    authority: "Celera Motion (a Novanta company)",
    market: "US",
    access: "public",
    officialUrl:
      "https://novanta.com/robotics-automation/technical-paper/sizing-a-shunt-resistor-for-regenerative-braking/",
    note: "Manufacturer resistor-sizing methodology for the drive-train module's own regenerative-energy check (Unit 4.7): R ~= 1.1*V_max/i_shunt, average/peak power dissipation from total mechanical energy and deceleration cycle frequency, on top of an implicit kinetic-energy term and an explicit 'assume 100% of deceleration energy goes to the shunt resistor' simplifying assumption -- no drive-electronics efficiency or DC-bus capacitor-absorption term, no worked numerical example. Read via WebFetch's own text summarization this session, not direct page images -- lower confidence than a directly read source; re-fetch and read directly before a released module cites it.",
  },
  {
    id: asSourceDocumentId(
      "us.atlanta_drive_systems.rack_pinion_calculations",
    ),
    classification: "manufacturer_method",
    title: "Rack and Pinion Drive Calculations and Selection",
    authority: "Atlanta Drive Systems",
    market: "US",
    access: "licensed",
    note: "Internal metadata-only manufacturer-method reference; redistribution status is unresolved.",
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
      "jp.thk.example_ball_screw_selection@technico-mirror-2026-08-10",
    ),
    documentId: asSourceDocumentId("jp.thk.example_ball_screw_selection"),
    edition:
      "THK Ball Screw General Catalog, 'Examples of Selecting a Ball Screw' chapter, 'Studying the Driving Motor' sections (physical PDF pages 455 of 488 horizontal, 466 of 488 vertical, in this specific mirror file — the printed 'B15-' page labels are not reliably extracted by this environment's PDF-text tooling on this file, so the physical page count of this exact mirror is cited instead of a derived label)",
    officialUrl: "https://technico.com/pdf/Blog/15%20Ball%20Screw.pdf",
    note: "tech.thk.com (this document's own officialUrl) returns HTTP 403 in this environment; content instead read 2026-08-10 from this third-party distributor's mirror (488 pages, confirmed via pdfinfo; text extracted locally with pdftotext -layout after WebFetch cached the binary) of the same THK catalog the bondy-mirror revision above already cites for these two examples' own mechanical (screw/life) sections. This revision covers the 'Studying the Driving Motor' subsection each example continues into, which axis-load-cases 0.1.0's and ball-screw 0.1.0's own scope never needed: required maximum momentary torque and effective (RMS) torque (via Trms = sqrt(sum(T_i^2*t_i)/sum(t_i)), the general shape drive-train 0.1.0's own math.ts also uses), and a minimum motor-inertia rule (motor inertia >= reflected load inertia / 10). Used by drive-train 0.1.0 (lib/modules/drive-train/0.1.0/thk-reference-examples.ts) as its second and third published reference examples. Neither example names a specific catalog motor SKU — both stop at stating the required minimum rating, unlike Omron's own example — and the vertical example's own effective-torque figure (743 N*mm) is not reproduced through drive-train's own compute path (a genuine ~21% deviation, not a rounding residual — see that fixture's own module doc comment for why).",
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
    edition: "Catalog 1560E (excerpt), 'General Explanation' chapter, pp. 1-18",
    officialUrl:
      "https://www.ikont.com/catalogs/linear-motion-rolling-guide-series/blue/1560E_ex.pdf",
    note: "Read directly 2026-08-09 from IKO's own domain (ikont.com), no mirror needed. Initially read pp. 1-10 (Stage 1); pp. 11-18 ('Calculated Load' and 'Examples of Load and Life Calculation') read later the same day to implement the linear-guide module's independent benchmark (lib/modules/linear-guide/0.1.0/iko-benchmark.ts).",
  },
  {
    id: asSourceRevisionId(
      "us.ktr.coupling_selection_operating_factors@web-2026-08-09",
    ),
    documentId: asSourceDocumentId(
      "us.ktr.coupling_selection_operating_factors",
    ),
    edition: "4-page PDF accessed 2026-08-09",
    officialUrl:
      "https://www.ktr.com/fileadmin/ktr/media/Tools_Downloads/kataloge/coupling_selection_operating_factors.pdf",
    note: "Full 4-page PDF read directly 2026-08-09 (all pages). Covers 'Coupling types', 'Terminology of coupling selection', the S_B/S_t/S_Z/S_R factor tables, the two selection-check formulas, and the worked example.",
  },
  {
    id: asSourceRevisionId(
      "us.ktr.coupling_selection_din740_part2@web-2026-08-10",
    ),
    documentId: asSourceDocumentId("us.ktr.coupling_selection_din740_part2"),
    edition: "4-page PDF (catalog printed pages 10-13) accessed 2026-08-10",
    officialUrl:
      "https://www.ktr.com/dam/jcr:621e751c-d0b1-42b6-81ea-6d44148ab8d6/COUPLING_SELECTION_DIN740_PART2.PDF",
    note: "Full 4-page excerpt read directly 2026-08-10 from KTR's own domain (ktr.com), no mirror needed, found via WebSearch (the coupling_selection_operating_factors document was found by direct navigation on ktr.com and does not itself carry a full shock-torque worked example). Covers 'Coupling types', a second terminology table (M_A/M_L, S_A/S_L, S_Z, S_t, S_B), the general and hydrostatic-drive selection formulas, and one full worked numerical example (printed page 13): P = 160 kW, n = 1485 rpm, J_Motor = 2.9 kgm^2, screw-compressor load T_LN = 930 Nm / J_compressor = 6.8 kgm^2, ROTEX Size 90 coupling (T_KN = 2400 Nm, T_Kmax = 4800 Nm, J_KA = J_KL = 0.0673 kgm^2) -> T_AN = 1029 Nm, T_KN required = 1348.5 Nm, M_A = 0.7, T_S = 2593.1 Nm, T_Kmax required = 3760 Nm, both checks pass.",
  },
  {
    id: asSourceRevisionId(
      "us.rw_america.coupling_sizing_selection@web-2026-08-09",
    ),
    documentId: asSourceDocumentId("us.rw_america.coupling_sizing_selection"),
    edition:
      "'Sizing and Selection' / 'Safety Couplings' (ST series) chapter, printed pages 9-17 of a larger precision-couplings catalog",
    officialUrl: "https://www.rw-america.com/",
    note: "Read directly 2026-08-09 via a third-party distributor mirror (drivecentre.ca) after rw-america.com's own catalog-download page was not independently attempted this session -- no direct-domain block is claimed (unlike the confirmed tech.thk.com block elsewhere in this file), this is simply where a readable copy was found first, the same treatment given us.pmi.linear_guideway_catalog. The chapter title ('Safety Couplings') covers R+W's ST-series torque-limiting couplings specifically, but its 'Sizing and Selection' section states the general DIN 740-2 method (rated-torque and shock-torque checks, factor tables, inertia/acceleration and resonant-frequency formulas) rather than anything ST-series-specific -- applicable to this module's own scope, not just torque limiters.",
  },
  {
    id: asSourceRevisionId("jp.nbk.coupling_catalog@orim-vexta-1908ov78"),
    documentId: asSourceDocumentId("jp.nbk.coupling_catalog"),
    edition:
      "'ORIM VEXTA' co-branded catalog, document code 1908ov78, pp. 1-15",
    officialUrl:
      "https://www.orimvexta.co.jp/files/NBK/Document/1908ov78coupling.pdf",
    note: "Read directly 2026-08-09 via a Japanese distributor mirror (orimvexta.co.jp) after NBK's own domain (nbk1560.com) returned HTTP 403 on every page attempted this session, including non-catalog pages (a selection-procedure article and a terminology glossary) -- see this source's own document-level note.",
  },
  {
    id: asSourceRevisionId(
      "jp.thk.ball_screw_general_catalog@technico-mirror-2026-08-09",
    ),
    documentId: asSourceDocumentId("jp.thk.ball_screw_general_catalog"),
    edition:
      "Ball Screw General Catalog, 'Ball Screw Peripherals -- Support Unit' chapter (printed pages A15-313 through A15-322)",
    officialUrl: "https://technico.com/pdf/Blog/15%20Ball%20Screw.pdf",
    note: "tech.thk.com (this document's own officialUrl) returns HTTP 403 in this environment (context/progress-tracker.md 'Environment notes'); the Support Unit chapter (models EK, BK, FK, EF, BF, FF) read instead 2026-08-09 from this third-party distributor's mirror of the same THK catalog -- PDF page number equals the printed 'A15-' page number exactly for this mirror (confirmed by reading the divider page), a different offset than the jp.thk.example_ball_screw_selection@bondy-mirror-2026-08-09 revision's own bondy.dk mirror. Gives per-support-unit-model catalog/data-sheet values (fixed-side angular contact bearing: model no., basic dynamic load rating Ca, static permissible load, rigidity; supported-side deep-groove bearing: model no., basic dynamic/static load rating C/C0) and structure (fixed side = JIS Class 5 angular contact bearing, contact angle 30 degrees, DF/face-to-face configuration, adjusted preload; supported side = deep-groove ball bearing, floating). No bearing-life or safety-factor formula of its own -- see jp.ntn.rolling_bearings_handbook for that layer.",
  },
  {
    id: asSourceRevisionId("jp.ntn.rolling_bearings_handbook@cat-9012e"),
    documentId: asSourceDocumentId("jp.ntn.rolling_bearings_handbook"),
    edition: "CAT. No. 9012-@/E",
    officialUrl: "https://www.ntnglobal.com/en/products/catalog/pdf/9012E.pdf",
    note: "Read directly 2026-08-09 from NTN's own domain (ntnglobal.com); cross-checked against an identical copy on ntnamericas.com the same session. Chapters 6 (Load Rating and Life), 7 (Bearing Load), 9 (Bearing Internal Clearance and Preload), 10 (Allowable Speed), and 15 (Shaft and Housing Design) read in full (printed pages 27-38, 45-53, 67-69). Both copies fetched are identically truncated after printed page 82/83 ('Reference material') and do not include the 'Bearing Life Calculation Examples' section the handbook's own table of contents lists at printed page 84 -- not yet resolved whether this is a persistent block or a one-off; retry with a different mirror before assuming it is permanent. **Update 2026-08-10: retried against a third edition (ntn-snr.com's own mirror, the NTN Group's European entity) -- identically truncated at the same point (printed page 83 is a blank name/address/phone card, page 84 does not exist in this copy either). Three independent NTN Group editions now agree: this is very likely a persistent omission from every edition of this handbook printing, not a one-off fetch failure. See jp.nsk.rolling_bearings_catalog for the worked-example evidence this gap pushed the search toward instead.",
  },
  {
    id: asSourceRevisionId("jp.nsk.rolling_bearings_catalog@e1102a-2005"),
    documentId: asSourceDocumentId("jp.nsk.rolling_bearings_catalog"),
    edition: "CAT. No. E1102a, 2005 E-6 printing",
    officialUrl:
      "https://www.bearing.co.il/wp-content/uploads/2024/11/E1102.pdf",
    note: "Downloaded directly 2026-08-10 (bearing.co.il, a third-party distributor mirror; NSK's own site was not the source found this session) after this file exceeded the WebFetch tool's 10 MB fetch limit at NSK's own domain and this mirror both -- worked around by downloading with curl into the session scratchpad and reading page ranges locally, since the file itself (6.3 MB) is under the PDF-reading tool's own per-request page-count constraints once downloaded (context/progress-tracker.md 'Environment notes'). Section 5.7 'Examples of Bearing Calculations' (printed pages A34-A36) read in full: six worked examples. Examples 1 and 3 (single-row deep-groove ball bearing 6208, pure radial then combined radial+axial load) reproduce this project's own support-bearing module formulas exactly -- see the module's own validation record and nsk-reference-examples.ts/nsk-fh-benchmark.ts for how. Sections 5.1-5.4 (printed pages A24-A31, bearing life, load rating, equivalent load) and 5.5-5.6 (printed pages A32-A33, static load ratings, permissible axial load for cylindrical roller bearings) also read, establishing NSK's own closed-form speed-factor/fatigue-life-factor formulas (Table 5.2) independently of the two worked examples.",
  },
  {
    id: asSourceRevisionId("jp.omron.servo_motor_selection_guide@csm-tg-e-3-1"),
    documentId: asSourceDocumentId("jp.omron.servo_motor_selection_guide"),
    edition: "CSM_Servo Selection_TG_E_3_1",
    officialUrl:
      "https://www.ia.omron.com/data_pdf/guide/14/servo_selection_tg_e_1_1_3-13(further_info).pdf",
    note: "Read directly 2026-08-10 from reference/source-material/Servo Selection.pdf (already present in this repository before this session), all 13 pages, page-image by page-image. A live-hosted mirror at this revision's own officialUrl appears to be the same guide family (identical worked example, model R88M-U20030) under a different internal revision label ('1_1' versus this cached copy's own '3_1') -- direct fetch of that URL returned HTTP 403 this session; not yet reconciled which revision is current. The R88M-U20030 worked example was hand-verified against its own printed inputs (J_B, J_L, and the final Trms = 0.0828 N*m figure independently recomputed and matched to printed precision).",
  },
  {
    id: asSourceRevisionId(
      "us.hmk.servo_motor_amplifier_sizing_guide@edition-2-0802",
    ),
    documentId: asSourceDocumentId("us.hmk.servo_motor_amplifier_sizing_guide"),
    edition: "Edition 2 - 08/02",
    officialUrl:
      "https://www.hmkdirect.com/downloads/knowledge_base/drive_sizing_v2.pdf",
    note: "Read directly 2026-08-10, all 23 pages, page-image by page-image. The amplifier RMS/peak-current worked illustration (torque constant 1.28 Nm/Amp, '3 Nm needs 3.84 Amps') does not arithmetically reconcile with its own stated Nm/Amp unit (3/1.28 = 2.34 A, not 3.84 A; the printed arithmetic instead multiplies) -- recorded as an apparent unit-label inconsistency in this document itself, not corrected here.",
  },
  {
    id: asSourceRevisionId(
      "us.voss.comprehensible_guide_servo_motor_sizing@2007",
    ),
    documentId: asSourceDocumentId(
      "us.voss.comprehensible_guide_servo_motor_sizing",
    ),
    edition: "Copyright 2007, ISBN 978-0-9765116-1-8",
    officialUrl:
      "https://cnctar.hobbycnc.hu/VarsanyiPeter/CNC%20vezerles%20-%20szervoval/Guide_to_Servo_Motor_Sizing.pdf",
    note: "Read directly 2026-08-10 (title page, table of contents, RMS-torque section 3.3.3 printed pp. 47-53, inertia-matching section 3.4.2.1 printed pp. 58-60, and holding-brake section 3.5.2 through thrust-forces 3.5.4 printed pp. 74-84 -- roughly 30 pages total across four ranges), page-image by page-image. The book's own partial RMS-torque worked example (T_RMS = sqrt((2*0.259^2)/5) = 0.164 in-lb) was hand-verified this session and matched.",
  },
  {
    id: asSourceRevisionId(
      "jp.oriental_motor.motor_sizing_basics_rms_torque@web-2026-08-10",
    ),
    documentId: asSourceDocumentId(
      "jp.oriental_motor.motor_sizing_basics_rms_torque",
    ),
    edition:
      "web page, originally posted 2020-02-27, updated 2022-04-27, accessed 2026-08-10",
    officialUrl:
      "https://blog.orientalmotor.com/motor-sizing-basics-part-3-acceleration-torque-and-rms-torque",
    note: "Read via WebFetch's own text summarization 2026-08-10, not direct page images -- lower confidence than a directly read source. Access-dated intake; capture a fixed edition/archive and re-read directly before a released module cites it for a formula not already confirmed elsewhere.",
  },
  {
    id: asSourceRevisionId(
      "us.celera_motion.shunt_resistor_regenerative_braking@web-2026-08-10",
    ),
    documentId: asSourceDocumentId(
      "us.celera_motion.shunt_resistor_regenerative_braking",
    ),
    edition: "published 2020-05-05, accessed 2026-08-10",
    officialUrl:
      "https://novanta.com/robotics-automation/technical-paper/sizing-a-shunt-resistor-for-regenerative-braking/",
    note: "Read via WebFetch's own text summarization 2026-08-10, not direct page images -- lower confidence than a directly read source. Access-dated intake; capture a fixed edition/archive and re-read directly before a released module cites it.",
  },
  {
    id: asSourceRevisionId("us.nist.sp811@2008-2nd-printing"),
    documentId: asSourceDocumentId("us.nist.sp811"),
    edition: "2008 Edition, second printing (November 2008)",
    officialUrl:
      "https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication811e2008.pdf",
    note: "Official fixed NIST publication. Appendix B.8 states the standard acceleration of free fall, g_n = 9.80665 m/s^2.",
  },
  {
    id: asSourceRevisionId(
      "us.atlanta_drive_systems.rack_pinion_calculations@sha256-2bc6e48c2dce79dd",
    ),
    documentId: asSourceDocumentId(
      "us.atlanta_drive_systems.rack_pinion_calculations",
    ),
    edition: "Local reference PDF, content-addressed revision",
    note: "Internal metadata-only reference. SHA-256: 2bc6e48c2dce79dd0c252eae97cfcaa8f35fbc73c65ef5e73ace9638c42321b6. Redistribution and customer-facing citation are not authorized.",
  },
];
