import type { AxisHistoricalFixture, FixtureQuantity } from "../fixture-types";

const newtons = (value: number): FixtureQuantity => ({ value, unit: "N" });

/**
 * Sanitized from the historical design-calculation screenshots identified as
 * ID39. It preserves reported force magnitudes; it does not introduce a
 * signed load-case mapping that the source never stated.
 */
export const axisHorizontalBasicFixture = {
  id: "axis-horizontal-basic",
  revision: "0.1.0-draft",
  classification: "sanitized_historical_project",
  evidenceStatus: "draft",
  sanitization: {
    sourceCaseId: "ID39",
    removedIdentifiers: [
      "Phone status and cloud-drive UI",
      "Account avatar",
      "Organization branding and logo",
    ],
    reviewedOn: "2026-07-31",
  },
  coverage: [
    "horizontal axis",
    "friction-resisted travel",
    "acceleration, constant-speed, and deceleration axial-force magnitudes",
    "ball-screw selection downstream reference",
  ],
  sourceEvidence: [
    {
      rawMaterialPath: "reference/source-material/Image (4).jpg",
      printedPage: "24",
      rawMaterialSha256:
        "1ED01431FB40C47E341C529B3CA9E8548638C9E75363B67310A3BFF1A7C5524D",
      documentTitle:
        "ID39 ball-screw sizing calculation (title truncated in source)",
      documentRevision: null,
      extractionNote:
        "Source page provides horizontal-axis inputs and the three axial-load equations/results.",
    },
    {
      rawMaterialPath: "reference/source-material/Image (3).jpg",
      printedPage: "25",
      rawMaterialSha256:
        "1F90E1DC74ECFC06764B6653506023372A07ABD7F9C9FD891FCBB366957B30C6",
      documentTitle:
        "ID39 ball-screw sizing calculation (title truncated in source)",
      documentRevision: null,
      extractionNote:
        "Source page summarizes the reported axial loads and duty-cycle values.",
    },
    {
      rawMaterialPath: "reference/source-material/Image (2).jpg",
      printedPage: "26",
      rawMaterialSha256:
        "6618289C593ECDD34317B8F7C611E618AF483EA3F47F0F895368CBEEF243E4CD",
      documentTitle:
        "ID39 ball-screw sizing calculation (title truncated in source)",
      documentRevision: null,
      extractionNote:
        "Source page records downstream critical-speed and allowable-axial-load checks.",
    },
    {
      rawMaterialPath: "reference/source-material/Image.jpg",
      printedPage: "29",
      rawMaterialSha256:
        "623B4533FF24143957B742E495B8E8DF202F778E058350D4C76B2B3CAB8A1B38",
      documentTitle:
        "ID39 ball-screw sizing calculation (title truncated in source)",
      documentRevision: null,
      extractionNote:
        "Source page records the selected BSS1520-914 ball screw.",
    },
  ],
  originalInputs: {
    orientation: "horizontal",
    inclineAngle: { value: 0, unit: "deg" },
    positiveTravel: "not stated by the source",
    masses: {
      totalMovingMass: { value: 40, unit: "kg" },
      payload: null,
      carriage: null,
      additional: null,
      sourceBreakdown:
        "The source gives one combined table-and-workpiece mass.",
    },
    centerOfMass: null,
    frictionCoefficient: { value: 0.02, unit: "1" },
    guideResistance: null,
    externalForces: [],
    externalMoments: [],
    motionPhases: [
      {
        id: "acceleration",
        sourceLabel: "acceleration",
        direction: "not stated by the source",
        velocity: { value: 1000, unit: "mm/s" },
        acceleration: { value: 6.67, unit: "m/s^2" },
        duration: { value: 0.15, unit: "s" },
      },
      {
        id: "constant-speed",
        sourceLabel: "constant speed",
        direction: "not stated by the source",
        velocity: { value: 1000, unit: "mm/s" },
        acceleration: { value: 0, unit: "m/s^2" },
        duration: null,
      },
      {
        id: "deceleration",
        sourceLabel: "deceleration",
        direction: "not stated by the source",
        velocity: { value: 1000, unit: "mm/s" },
        acceleration: { value: -6.67, unit: "m/s^2" },
        duration: { value: 0.15, unit: "s" },
      },
    ],
    dutyCycle: {
      cycleTime: { value: 4.1, unit: "s" },
      movingTime: { value: 2.04, unit: "s" },
      note: "Reported source cycle; phase grouping is not fully specified.",
    },
    gravity: { value: 9.8, unit: "m/s^2" },
  },
  normalizedInputs: {
    orientation: "horizontal",
    inclineAngle: { value: 0, unit: "rad" },
    positiveTravel: "not stated by the source",
    masses: {
      totalMovingMass: { value: 40, unit: "kg" },
      payload: null,
      carriage: null,
      additional: null,
      sourceBreakdown:
        "The source gives one combined table-and-workpiece mass.",
    },
    centerOfMass: null,
    frictionCoefficient: { value: 0.02, unit: "1" },
    guideResistance: null,
    externalForces: [],
    externalMoments: [],
    motionPhases: [
      {
        id: "acceleration",
        sourceLabel: "acceleration",
        direction: "not stated by the source",
        velocity: { value: 1, unit: "m/s" },
        acceleration: { value: 6.666666666666667, unit: "m/s^2" },
        duration: { value: 0.15, unit: "s" },
      },
      {
        id: "constant-speed",
        sourceLabel: "constant speed",
        direction: "not stated by the source",
        velocity: { value: 1, unit: "m/s" },
        acceleration: { value: 0, unit: "m/s^2" },
        duration: null,
      },
      {
        id: "deceleration",
        sourceLabel: "deceleration",
        direction: "not stated by the source",
        velocity: { value: 1, unit: "m/s" },
        acceleration: { value: -6.666666666666667, unit: "m/s^2" },
        duration: { value: 0.15, unit: "s" },
      },
    ],
    dutyCycle: {
      cycleTime: { value: 4.1, unit: "s" },
      movingTime: { value: 2.04, unit: "s" },
      note: "Reported source cycle; phase grouping is not fully specified.",
    },
    gravity: { value: 9.8, unit: "m/s^2" },
  },
  expectedResults: {
    axisLoadCases: [
      {
        id: "acceleration",
        sourceLabel: "acceleration",
        metric: "axial_drive_force",
        convention: "Reported unsigned axial-force magnitude.",
        original: newtons(274),
        normalized: newtons(274),
        tolerance: {
          absolute: newtons(3),
          rationale:
            "The source rounds the calculated 6.67 m/s^2 acceleration and force result.",
        },
        sourcePageOrImage: "Image (4).jpg, printed p. 24",
        intendedModuleMapping: {
          loadCase: "unclassified",
          direction: "not stated by the source",
          status: "unclassified",
        },
      },
      {
        id: "constant-speed",
        sourceLabel: "constant speed",
        metric: "axial_drive_force",
        convention: "Reported unsigned axial-force magnitude.",
        original: newtons(8),
        normalized: newtons(8),
        tolerance: {
          absolute: newtons(1),
          rationale:
            "The source reports the friction-only force rounded to a whole newton.",
        },
        sourcePageOrImage: "Image (4).jpg, printed p. 24",
        intendedModuleMapping: {
          loadCase: "unclassified",
          direction: "not stated by the source",
          status: "unclassified",
        },
      },
      {
        id: "deceleration",
        sourceLabel: "deceleration",
        metric: "axial_drive_force",
        convention: "Reported unsigned axial-force magnitude.",
        original: newtons(260),
        normalized: newtons(260),
        tolerance: {
          absolute: newtons(3),
          rationale:
            "The source rounds the calculated 6.67 m/s^2 deceleration and force result.",
        },
        sourcePageOrImage: "Image (4).jpg, printed p. 24",
        intendedModuleMapping: {
          loadCase: "unclassified",
          direction: "not stated by the source",
          status: "unclassified",
        },
      },
    ],
    downstreamReferenceValues: [
      {
        id: "mean-axial-load",
        sourceLabel: "mean axial load",
        metric: "mean_axial_load",
        convention:
          "Reported source calculation result, not a Unit 4.1 output.",
        original: newtons(200),
        normalized: newtons(200),
        tolerance: {
          absolute: newtons(1),
          rationale: "The source reports a whole-newton rounded result.",
        },
        sourcePageOrImage: "Image (3).jpg, printed p. 25",
        intendedModuleMapping: {
          loadCase: "unclassified",
          direction: "not stated by the source",
          status: "unclassified",
        },
      },
    ],
  },
  selectedParts: [
    {
      component: "ball screw",
      partNumber: "BSS1520-914",
      sourceClaimedManufacturer: null,
      verificationStatus: "source_only",
    },
  ],
  corrections: [
    "The downstream buckling arithmetic reports 7,225 N while the later comparison says 3,660 N. Neither value is used as an axial-force expectation.",
  ],
  unknowns: [
    "The original PDF filename is truncated in the screenshots and no source revision is available.",
    "No signed travel direction, center-of-mass offset, external load, guide resistance, or holding/brake case is stated.",
    "The source does not confirm final installed parts or later design corrections.",
  ],
} as const satisfies AxisHistoricalFixture;
